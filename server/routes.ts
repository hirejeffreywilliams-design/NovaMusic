import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import fs from "fs";
import os from "os";
import { randomUUID } from "crypto";
import { registerAIDJRoutes } from "./ai-dj";
import { storage } from "./storage";
import { PLATFORM_CUT, DJ_CUT, SUBSCRIPTION_PRICES, DAY_PASS_PRICE } from "@shared/schema";
import OpenAI from "openai";

const upload = multer({ dest: os.tmpdir() });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// WebSocket rooms: eventId -> Set of WSClients
type WSClientType = "dj" | "crowd" | "battle-dj";
interface WSClient {
  ws: WebSocket;
  type: WSClientType;
  eventId: string;
  name?: string;
}

const rooms = new Map<string, Set<WSClient>>();

function getRoomClients(eventId: string): Set<WSClient> {
  if (!rooms.has(eventId)) rooms.set(eventId, new Set());
  return rooms.get(eventId)!;
}

function broadcast(eventId: string, data: object, filter?: (c: WSClient) => boolean) {
  const clients = getRoomClients(eventId);
  const msg = JSON.stringify(data);
  Array.from(clients).forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filter || filter(client)) {
        client.ws.send(msg);
      }
    }
  });
}

function broadcastToAll(eventId: string, data: object) {
  broadcast(eventId, data);
}

function broadcastToDJ(eventId: string, data: object) {
  broadcast(eventId, data, c => c.type === "dj" || c.type === "battle-dj");
}

function broadcastToCrowd(eventId: string, data: object) {
  broadcast(eventId, data, c => c.type === "crowd");
}

// AI Crowd Coach - check energy and send suggestion to DJ
async function checkCrowdEnergy(eventId: string) {
  try {
    const since = Date.now() - 60000;
    const reactions = await storage.getEventReactions(eventId, since);
    const rpm = reactions.length;
    if (rpm < 3) {
      const requests = await storage.getEventSongRequests(eventId);
      const pending = requests.filter(r => r.status === "pending");
      const event = await storage.getEvent(eventId);

      // Compute most-requested tracks from pending queue
      const requestFreq: Record<string, number> = {};
      pending.forEach(r => { requestFreq[r.trackTitle] = (requestFreq[r.trackTitle] || 0) + 1; });
      const topRequests = Object.entries(requestFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([title, count]) => `"${title}" (${count}x)`);

      const requestContext = topRequests.length > 0
        ? `Top crowd requests: ${topRequests.join(", ")}.`
        : "No specific track requests yet.";

      const prompt = `You are an AI Crowd Coach for a DJ. Crowd energy is LOW — only ${rpm} reactions in the last minute. There are ${pending.length} pending song requests. ${requestContext} Event: ${event?.name || "Party"}.
Give the DJ ONE short, urgent, actionable suggestion (under 30 words) to re-energize the crowd. Mention a specific song title if top requests are available. Be direct and hype. Use emojis.`;

      const resp = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
      });

      const suggestion = resp.choices[0]?.message?.content?.trim() || "Drop a bass-heavy banger NOW! The crowd needs energy! 🔥";

      broadcastToDJ(eventId, {
        type: "ai_coach_alert",
        suggestion,
        rpm,
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    console.error("AI Crowd Coach error:", e);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // --- WebSocket Server ---
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const eventId = url.searchParams.get("eventId") || "";
    const clientType = (url.searchParams.get("type") || "crowd") as WSClientType;
    const clientName = url.searchParams.get("name") || "";

    const client: WSClient = { ws, type: clientType, eventId, name: clientName };
    const clients = getRoomClients(eventId);
    clients.add(client);

    ws.on("message", (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch (_) {}
    });

    ws.on("close", () => {
      clients.delete(client);
      if (clients.size === 0) rooms.delete(eventId);
    });
  });

  // Feature-gating helper: check if a DJ has required subscription tier
  async function checkDJTier(djId: string, requiredTiers: string[]): Promise<boolean> {
    const sub = await storage.getDJSubscription(djId);
    const tier = sub?.tier || "starter";
    return requiredTiers.includes(tier);
  }

  // Energy check interval
  setInterval(async () => {
    const events = await storage.listActiveEvents();
    for (const event of events) {
      const clients = rooms.get(event.id);
      if (clients && clients.size > 0) {
        await checkCrowdEnergy(event.id);
      }
    }
  }, 60000);

  // --- Existing routes ---
  app.post("/api/analyze", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const filePath = req.file.path;
      const result = {
        bpm: 0, key: "", sections: [], beatgrid: [], suggestedCuePoints: [], confidence: 0,
        message: "Server-side analysis is a placeholder. Use the Analyze button on each deck for instant client-side BPM/key detection with full accuracy.",
      };
      try { fs.unlinkSync(filePath); } catch (_) {}
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  app.post("/api/mix-suggestion", (req, res) => {
    const { bpmA, bpmB, keyA, keyB } = req.body || {};
    const compatibleKeys = getHarmonicCompatibility(keyA, keyB);
    const bpmDiff = bpmA && bpmB ? Math.abs(bpmA - bpmB) : 0;
    const tempoCompatible = bpmDiff < 10;
    let transitionType: "smooth" | "cut" | "echo" = "smooth";
    if (bpmDiff > 8) transitionType = "echo";
    if (bpmDiff > 15) transitionType = "cut";
    const rateMultiplier = bpmA && bpmB && tempoCompatible ? bpmA / bpmB : 1;
    const transitionBeats = tempoCompatible ? 16 : 8;
    const beatDuration = bpmA ? 60 / bpmA : 0.5;
    const transitionDuration = transitionBeats * beatDuration;
    return res.json({
      transition: { type: transitionType, durationBeats: transitionBeats, durationSeconds: transitionDuration, crossfadeCurve: tempoCompatible ? "smooth-s" : "linear", rateMultiplierB: Math.round(rateMultiplier * 1000) / 1000 },
      harmonic: { compatible: compatibleKeys, bpmDifference: bpmDiff, tempoSync: tempoCompatible },
      suggestedFX: transitionType === "echo" ? [{ name: "delay", time: beatDuration, feedback: 0.4 }] : transitionType === "cut" ? [{ name: "filter", type: "highpass", freq: 500 }] : [],
      confidence: tempoCompatible && compatibleKeys ? 0.9 : tempoCompatible ? 0.7 : 0.4,
    });
  });

  // --- Events ---
  app.post("/api/events", async (req, res) => {
    try {
      const { name, djId, djName, battleMode, deckADjName, deckBDjName } = req.body;
      if (!name || !djId || !djName) return res.status(400).json({ error: "name, djId, djName required" });
      // Battle mode requires pro or club tier
      if (battleMode) {
        const allowed = await checkDJTier(djId, ["pro", "club"]);
        if (!allowed) return res.status(403).json({ error: "Battle Mode requires DJ Pro or DJ Club subscription" });
      }
      const code = generateEventCode();
      const event = await storage.createEvent({ code, name, djId, djName, battleMode, deckADjName, deckBDjName });
      return res.json(event);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/events/:eventCode", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      return res.json(event);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/events/:eventId", async (req, res) => {
    try {
      const existingEvent = await storage.getEvent(req.params.eventId);
      if (!existingEvent) return res.status(404).json({ error: "Event not found" });
      // Mood board requires pro or club tier
      if (req.body.moodColor || req.body.moodKeyword) {
        const allowed = await checkDJTier(existingEvent.djId, ["pro", "club"]);
        if (!allowed) return res.status(403).json({ error: "Mood Board requires DJ Pro or DJ Club subscription" });
      }
      const event = await storage.updateEvent(req.params.eventId, req.body);
      if (!event) return res.status(404).json({ error: "Event not found" });
      broadcastToAll(event.id, { type: "event_updated", event });
      return res.json(event);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/events/:eventId/end", async (req, res) => {
    try {
      const event = await storage.endEvent(req.params.eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
      // Create payout
      const tips = await storage.getEventTips(event.id);
      const shoutouts = await storage.getEventShoutouts(event.id);
      const requests = await storage.getEventSongRequests(event.id);
      let djEarnings = 0;
      djEarnings += tips.reduce((s, t) => s + t.djShare, 0);
      djEarnings += shoutouts.filter(s => s.paid).reduce((s, sh) => s + sh.amount * DJ_CUT, 0);
      djEarnings += requests.filter(r => r.priorityPaid).reduce((s, r) => s + r.priorityAmount * DJ_CUT, 0);
      if (djEarnings > 0) {
        await storage.createPayout(event.id, event.djId, event.djName, +djEarnings.toFixed(2));
      }
      broadcastToAll(event.id, { type: "event_ended", event });
      return res.json(event);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/events/:eventId/state", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const [requests, reactions, polls, shoutouts, tips, setlist, votes] = await Promise.all([
        storage.getEventSongRequests(event.id),
        storage.getEventReactions(event.id),
        storage.getEventPolls(event.id),
        storage.getEventShoutouts(event.id),
        storage.getEventTips(event.id),
        storage.getEventSetlist(event.id),
        storage.getEventBattleVotes(event.id),
      ]);
      return res.json({ event, requests, reactions, polls, shoutouts, tips, setlist, votes });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Setlist ---
  app.post("/api/events/:eventId/setlist", async (req, res) => {
    try {
      const { trackTitle, addedBy } = req.body;
      if (!trackTitle) return res.status(400).json({ error: "trackTitle required" });
      const event = await storage.getEvent(req.params.eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const entry = await storage.createSetlistEntry({ eventId: event.id, trackTitle, addedBy: addedBy || event.djName });
      await storage.updateEvent(event.id, { nowPlaying: trackTitle });
      broadcastToAll(event.id, { type: "now_playing", trackTitle, entry });
      return res.json(entry);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/events/:eventCode/setlist", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const setlist = await storage.getEventSetlist(event.id);
      const reactions = await storage.getEventReactions(event.id);
      const tips = await storage.getEventTips(event.id);
      return res.json({ event, setlist, totalReactions: reactions.length, totalTips: tips.reduce((s, t) => s + t.amount, 0) });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Crowd Interactions ---
  app.post("/api/events/:eventCode/requests", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event || event.status !== "active") return res.status(404).json({ error: "Event not found or ended" });
      const { crowdName, trackTitle, priorityPaid, priorityAmount } = req.body;
      if (!crowdName || !trackTitle) return res.status(400).json({ error: "crowdName and trackTitle required" });
      // Priority requests require the DJ to be on pro or club tier
      if (priorityPaid && priorityAmount > 0) {
        const allowed = await checkDJTier(event.djId, ["pro", "club"]);
        if (!allowed) return res.status(403).json({ error: "Priority requests require DJ Pro or DJ Club subscription" });
      }
      const request = await storage.createSongRequest({ eventId: event.id, crowdName, trackTitle, priorityPaid, priorityAmount: priorityAmount || 0 });
      if (priorityPaid && priorityAmount > 0) {
        const platformCut = +(priorityAmount * PLATFORM_CUT).toFixed(2);
        const djShare = +(priorityAmount * DJ_CUT).toFixed(2);
        broadcastToDJ(event.id, { type: "priority_request", request, platformCut, djShare });
      } else {
        broadcastToDJ(event.id, { type: "new_request", request });
      }
      return res.json(request);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/events/:eventId/requests/:requestId", async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateSongRequestStatus(req.params.requestId, status);
      if (!updated) return res.status(404).json({ error: "Request not found" });
      broadcastToAll(req.params.eventId, { type: "request_updated", request: updated });
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/events/:eventCode/reactions", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event || event.status !== "active") return res.status(404).json({ error: "Event not found or ended" });
      const { crowdName, emoji } = req.body;
      if (!crowdName || !emoji) return res.status(400).json({ error: "crowdName and emoji required" });
      const reaction = await storage.createReaction({ eventId: event.id, crowdName, emoji });
      broadcastToAll(event.id, { type: "reaction", reaction });
      return res.json(reaction);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Polls
  app.post("/api/events/:eventId/polls", async (req, res) => {
    try {
      const { question, options } = req.body;
      if (!question || !options?.length) return res.status(400).json({ error: "question and options required" });
      // Polls require pro or club tier
      const event = await storage.getEvent(req.params.eventId);
      if (event) {
        const allowed = await checkDJTier(event.djId, ["pro", "club"]);
        if (!allowed) return res.status(403).json({ error: "Polls require DJ Pro or DJ Club subscription" });
      }
      const existing = await storage.getActivePoll(req.params.eventId);
      if (existing) await storage.closePoll(existing.id);
      const poll = await storage.createPoll({ eventId: req.params.eventId, question, options });
      broadcastToAll(req.params.eventId, { type: "new_poll", poll });
      return res.json(poll);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/events/:eventCode/polls/:pollId/vote", async (req, res) => {
    try {
      const { crowdName, option } = req.body;
      if (!crowdName || !option) return res.status(400).json({ error: "crowdName and option required" });
      const poll = await storage.votePoll(req.params.pollId, option, crowdName);
      if (!poll) return res.status(404).json({ error: "Poll not found or already closed" });
      const event = await storage.getEventByCode(req.params.eventCode);
      if (event) broadcastToAll(event.id, { type: "poll_vote", poll });
      return res.json(poll);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/events/:eventId/polls/:pollId/close", async (req, res) => {
    try {
      const poll = await storage.closePoll(req.params.pollId);
      if (!poll) return res.status(404).json({ error: "Poll not found" });
      broadcastToAll(req.params.eventId, { type: "poll_closed", poll });
      return res.json(poll);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Shoutouts
  app.post("/api/events/:eventCode/shoutouts", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event || event.status !== "active") return res.status(404).json({ error: "Event not found or ended" });
      const { fromName, message, paid, amount } = req.body;
      if (!fromName || !message) return res.status(400).json({ error: "fromName and message required" });
      const shoutout = await storage.createShoutout({ eventId: event.id, fromName, message, paid, amount: amount || 0 });
      broadcastToDJ(event.id, { type: "new_shoutout", shoutout });
      return res.json(shoutout);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/events/:eventId/shoutouts/:shoutoutId/announce", async (req, res) => {
    try {
      const shoutout = await storage.markShoutoutAnnounced(req.params.shoutoutId);
      if (!shoutout) return res.status(404).json({ error: "Shoutout not found" });
      return res.json(shoutout);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Tips
  app.post("/api/events/:eventCode/tips", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event || event.status !== "active") return res.status(404).json({ error: "Event not found or ended" });
      const { fromName, amount } = req.body;
      if (!fromName || !amount || amount <= 0) return res.status(400).json({ error: "fromName and amount > 0 required" });
      const tip = await storage.createTip({ eventId: event.id, fromName, amount: parseFloat(amount) });
      broadcastToDJ(event.id, { type: "new_tip", tip });
      broadcastToAll(event.id, { type: "tip_received", fromName, amount: tip.amount });
      return res.json(tip);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Mood Board
  app.post("/api/events/:eventId/mood", async (req, res) => {
    try {
      const { moodColor, moodKeyword } = req.body;
      const event = await storage.updateEvent(req.params.eventId, { moodColor, moodKeyword });
      if (!event) return res.status(404).json({ error: "Event not found" });
      broadcastToCrowd(event.id, { type: "mood_update", moodColor, moodKeyword });
      return res.json(event);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Battle Mode - Second DJ joins by event code
  app.post("/api/events/:eventCode/battle-join", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (!event.battleMode) return res.status(400).json({ error: "Event is not in battle mode" });
      const { djName } = req.body;
      if (!djName) return res.status(400).json({ error: "djName required" });
      // Update deck B DJ name if not already set
      const updatedEvent = await storage.updateEvent(event.id, { deckBDjName: djName });
      broadcastToAll(event.id, { type: "battle_dj_joined", deck: "B", djName });
      return res.json({ event: updatedEvent, deck: "B", message: `${djName} joined battle as Deck B!` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Battle Mode - Get current vote status and leader
  app.get("/api/events/:eventCode/battle-status", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const votes = await storage.getEventBattleVotes(event.id);
      const voteCount = { A: votes.filter(v => v.deck === "A").length, B: votes.filter(v => v.deck === "B").length };
      const leader = voteCount.A > voteCount.B ? "A" : voteCount.B > voteCount.A ? "B" : "tied";
      return res.json({ voteCount, leader, deckADjName: event.deckADjName, deckBDjName: event.deckBDjName });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Battle Mode Votes
  app.post("/api/events/:eventCode/battle-vote", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event || !event.battleMode) return res.status(404).json({ error: "Event not found or battle mode not active" });
      const { crowdName, deck } = req.body;
      if (!crowdName || !["A", "B"].includes(deck)) return res.status(400).json({ error: "crowdName and deck (A or B) required" });
      const vote = await storage.createBattleVote(event.id, crowdName, deck);
      const votes = await storage.getEventBattleVotes(event.id);
      const voteCount = { A: votes.filter(v => v.deck === "A").length, B: votes.filter(v => v.deck === "B").length };
      broadcastToAll(event.id, { type: "battle_vote", voteCount });
      return res.json({ vote, voteCount });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Leaderboard
  app.get("/api/events/:eventCode/leaderboard", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const [requests, tips, reactions] = await Promise.all([
        storage.getEventSongRequests(event.id),
        storage.getEventTips(event.id),
        storage.getEventReactions(event.id),
      ]);
      const leaderMap = new Map<string, { crowdName: string; requests: number; tips: number; reactions: number; totalScore: number }>();
      const ensure = (name: string) => {
        if (!leaderMap.has(name)) leaderMap.set(name, { crowdName: name, requests: 0, tips: 0, reactions: 0, totalScore: 0 });
        return leaderMap.get(name)!;
      };
      for (const r of requests.filter(r => r.status === "approved")) { const e = ensure(r.crowdName); e.requests++; e.totalScore += 10; }
      for (const t of tips) { const e = ensure(t.fromName); e.tips += t.amount; e.totalScore += t.amount; }
      for (const r of reactions) { const e = ensure(r.crowdName); e.reactions++; e.totalScore += 1; }
      const leaderboard = Array.from(leaderMap.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
      return res.json(leaderboard);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Subscriptions ---
  app.get("/api/subscriptions/tiers", (_req, res) => {
    return res.json({
      tiers: [
        { id: "starter", name: "Starter", price: 0, features: ["1 active event", "Basic crowd page", "Song requests"] },
        { id: "pro", name: "DJ Pro", price: 14.99, features: ["Unlimited events", "Priority requests", "Polls", "Shoutouts", "Tips", "AI Crowd Coach", "Battle Mode", "Mood Board"] },
        { id: "club", name: "DJ Club", price: 39.99, features: ["Everything in Pro", "Leaderboard badges", "Advanced analytics", "Priority support", "Custom branding"] },
      ],
      dayPass: { price: DAY_PASS_PRICE, features: ["All Pro features for 24 hours"] },
    });
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const { djId, tier, dayPass, eventId } = req.body;
      if (!djId || !tier) return res.status(400).json({ error: "djId and tier required" });
      if (!["starter", "pro", "club"].includes(tier)) return res.status(400).json({ error: "Invalid tier" });
      const sub = await storage.createSubscription({ djId, tier, dayPass, eventId });
      return res.json({ subscription: sub, message: "Subscription activated (simulated payment)" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/subscriptions/:djId", async (req, res) => {
    try {
      const sub = await storage.getDJSubscription(req.params.djId);
      return res.json({ subscription: sub || null, tier: sub?.tier || "starter" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // --- Admin ---
  const ADMIN_KEY = process.env.ADMIN_KEY || "admin";

  function requireAdmin(req: any, res: any, next: any) {
    const key = req.headers["x-admin-key"] || req.query.adminKey;
    if (key !== ADMIN_KEY) return res.status(401).json({ error: "Unauthorized: invalid admin key" });
    next();
  }

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [events, totalRevenue, subscriptionsByTier, topDJs, payouts, subscriptions] = await Promise.all([
        storage.listActiveEvents(),
        storage.getTotalPlatformRevenue(),
        storage.getSubscriptionsByTier(),
        storage.getTopDJs(10),
        storage.listPayouts(),
        storage.listSubscriptions(),
      ]);
      return res.json({
        activeEvents: events.length,
        totalRevenue,
        subscriptionsByTier,
        topDJs,
        pendingPayouts: payouts.filter(p => p.status === "pending"),
        allPayouts: payouts,
        totalSubscriptions: subscriptions.length,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/payouts/:payoutId/process", requireAdmin, async (req, res) => {
    try {
      const payout = await storage.markPayoutProcessed(req.params.payoutId);
      if (!payout) return res.status(404).json({ error: "Payout not found" });
      return res.json(payout);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  registerAIDJRoutes(app);

  return httpServer;
}

function generateEventCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getHarmonicCompatibility(keyA?: string, keyB?: string): boolean {
  if (!keyA || !keyB) return false;
  const camelotMap: Record<string, string> = {
    "C Major": "8B", "A Minor": "8A", "G Major": "9B", "E Minor": "9A",
    "D Major": "10B", "B Minor": "10A", "A Major": "11B", "F# Minor": "11A",
    "E Major": "12B", "C# Minor": "12A", "B Major": "1B", "G# Minor": "1A",
    "F# Major": "2B", "D# Minor": "2A", "Db Major": "3B", "Bb Minor": "3A",
    "Ab Major": "4B", "F Minor": "4A", "Eb Major": "5B", "C Minor": "5A",
    "Bb Major": "6B", "G Minor": "6A", "F Major": "7B", "D Minor": "7A",
  };
  const cA = camelotMap[keyA];
  const cB = camelotMap[keyB];
  if (!cA || !cB) return false;
  const numA = parseInt(cA);
  const numB = parseInt(cB);
  const letterA = cA.slice(-1);
  const letterB = cB.slice(-1);
  if (numA === numB) return true;
  if (letterA === letterB && (Math.abs(numA - numB) === 1 || Math.abs(numA - numB) === 11)) return true;
  return false;
}
