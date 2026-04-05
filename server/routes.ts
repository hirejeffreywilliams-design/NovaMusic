import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Readable } from "stream";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { registerAIDJRoutes } from "./ai-dj";
import { registerPlatformRoutes } from "./platform-routes";
import { storage } from "./storage";
import { PLATFORM_CUT, DJ_CUT, SUBSCRIPTION_PRICES, DAY_PASS_PRICE } from "@shared/schema";
import OpenAI from "openai";

const tmpUpload = multer({ dest: os.tmpdir() });

const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "server/uploads/tracks"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const trackUpload = multer({
  storage: trackStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are accepted"));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

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
  listenerId?: string;
  joinedAt: number;
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

  const verifiedDjConnections = new WeakSet<WebSocket>();
  const activeBroadcasts = new Set<string>();

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const eventId = url.searchParams.get("eventId") || "";
    const clientTypeRaw = (url.searchParams.get("type") || "crowd") as WSClientType;
    const clientName = url.searchParams.get("name") || "";
    const djId = url.searchParams.get("djId") || "";
    const listenerId = url.searchParams.get("listenerId") || `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let clientType = clientTypeRaw;

    if (clientTypeRaw === "dj" && eventId) {
      const event = await storage.getEvent(eventId);
      if (!event || event.djId !== djId) {
        clientType = "crowd";
      } else {
        verifiedDjConnections.add(ws);
      }
    }

    const client: WSClient = { ws, type: clientType, eventId, name: clientName, listenerId, joinedAt: Date.now() };
    const clients = getRoomClients(eventId);
    clients.add(client);

    // Broadcast updated listener list on join
    if (eventId) {
      const listeners = Array.from(clients)
        .filter(c => c.type === "crowd" && c.name)
        .map(c => ({ name: c.name!, joinedAt: c.joinedAt }));
      broadcastToAll(eventId, { type: "listener_update", count: listeners.length, listeners });
      // Notify late-joining listener if DJ is already broadcasting
      if (clientType === "crowd" && activeBroadcasts.has(eventId) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "rtc_broadcasting" }));
      }
    }

    ws.on("message", (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        const isDjVerified = verifiedDjConnections.has(ws);
        if (msg.type === "crowd_sing" && isDjVerified) {
          broadcastToCrowd(eventId, { type: "crowd_sing", line: msg.line });
        }
        if (msg.type === "lyrics_line" && isDjVerified) {
          broadcastToCrowd(eventId, { type: "lyrics_line", lineIndex: msg.lineIndex });
        }
        if (msg.type === "tip_goal_update" && isDjVerified && typeof msg.tipGoal === "number") {
          broadcastToAll(eventId, { type: "tip_goal_update", tipGoal: msg.tipGoal });
        }
        // WebRTC signaling relay (per-listener)
        if (msg.type === "rtc_broadcasting" && isDjVerified) {
          activeBroadcasts.add(eventId);
          broadcastToCrowd(eventId, { type: "rtc_broadcasting" });
        }
        if (msg.type === "rtc_stopped" && isDjVerified) {
          activeBroadcasts.delete(eventId);
          broadcastToCrowd(eventId, { type: "rtc_stopped" });
        }
        if (msg.type === "rtc_request_offer" && !isDjVerified) {
          broadcastToDJ(eventId, { type: "rtc_request_offer", fromListener: listenerId });
        }
        if (msg.type === "rtc_offer" && isDjVerified && msg.toListener) {
          const target = Array.from(clients).find(c => c.listenerId === msg.toListener);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({ type: "rtc_offer", sdp: msg.sdp }));
          }
        }
        if (msg.type === "rtc_answer" && !isDjVerified) {
          broadcastToDJ(eventId, { type: "rtc_answer", sdp: msg.sdp, fromListener: listenerId });
        }
        if (msg.type === "rtc_ice" && isDjVerified && msg.toListener) {
          const target = Array.from(clients).find(c => c.listenerId === msg.toListener);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({ type: "rtc_ice", candidate: msg.candidate }));
          }
        }
        if (msg.type === "rtc_ice" && !isDjVerified) {
          broadcastToDJ(eventId, { type: "rtc_ice", candidate: msg.candidate, fromListener: listenerId });
        }
      } catch (_) {}
    });

    ws.on("close", () => {
      clients.delete(client);
      if (verifiedDjConnections.has(ws)) {
        activeBroadcasts.delete(eventId);
        broadcastToCrowd(eventId, { type: "rtc_stopped" });
      }
      if (clients.size === 0) rooms.delete(eventId);
      else {
        const listeners = Array.from(clients)
          .filter(c => c.type === "crowd" && c.name)
          .map(c => ({ name: c.name!, joinedAt: c.joinedAt }));
        broadcastToAll(eventId, { type: "listener_update", count: listeners.length, listeners });
      }
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
  app.post("/api/analyze", tmpUpload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const filePath = req.file.path;
      const result = {
        bpm: 0, key: "", sections: [] as { type: string; start: number; end: number }[],
        beatgrid: [] as number[], suggestedCuePoints: [] as number[], confidence: 0,
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

  // --- Events (crowd engagement) ---
  app.post("/api/events", async (req, res) => {
    try {
      const { name, djId, djName, battleMode, deckADjName, deckBDjName } = req.body;
      if (!name || !djId || !djName) return res.status(400).json({ error: "name, djId, djName required" });
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
      const allTips = await storage.getEventTips(event.id);
      const totalTips = allTips.reduce((s, t) => s + t.amount, 0);
      broadcastToDJ(event.id, { type: "new_tip", tip });
      broadcastToAll(event.id, { type: "tip_received", fromName, amount: tip.amount, totalTips, tipId: tip.id });
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

  // Battle Mode
  app.post("/api/events/:eventCode/battle-join", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.eventCode);
      if (!event) return res.status(404).json({ error: "Event not found" });
      if (!event.battleMode) return res.status(400).json({ error: "Event is not in battle mode" });
      const { djName } = req.body;
      if (!djName) return res.status(400).json({ error: "djName required" });
      const updatedEvent = await storage.updateEvent(event.id, { deckBDjName: djName });
      broadcastToAll(event.id, { type: "battle_dj_joined", deck: "B", djName });
      return res.json({ event: updatedEvent, deck: "B", message: `${djName} joined battle as Deck B!` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

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
        { id: "pro", name: "DJ Pro", price: SUBSCRIPTION_PRICES.pro, features: ["Unlimited events", "Priority requests", "Polls", "Shoutouts", "Tips", "AI Crowd Coach", "Battle Mode", "Mood Board"] },
        { id: "club", name: "DJ Club", price: SUBSCRIPTION_PRICES.club, features: ["Everything in Pro", "Leaderboard badges", "Advanced analytics", "Priority support", "Custom branding"] },
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

  // --- DMCA Notices ---
  app.post("/api/dmca/notices", async (req, res) => {
    try {
      const { reporterName, contact, claimedWork, infringingUrl } = req.body;
      if (!reporterName || !contact || !claimedWork || !infringingUrl) {
        return res.status(400).json({ error: "All fields are required" });
      }
      const notice = await storage.createDmcaNotice({ reporterName, contact, claimedWork, infringingUrl });
      return res.json(notice);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/dmca/notices", async (req, res) => {
    try {
      const notices = await storage.listDmcaNotices();
      return res.json(notices);
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

  // --- Auth (music rights) ---
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, accountType, tosAcknowledged, venueLicenseAcknowledged } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    if (!["dj", "artist"].includes(accountType || "dj")) return res.status(400).json({ error: "Invalid account type" });
    if (!tosAcknowledged) return res.status(400).json({ error: "You must agree to the Terms of Service" });
    if (accountType !== "artist" && !venueLicenseAcknowledged) return res.status(400).json({ error: "DJs must acknowledge venue licensing responsibilities" });

    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already taken" });

    const now = new Date().toISOString();
    const user = await storage.createUser({
      username,
      password,
      accountType: accountType || "dj",
      tosAcknowledgedAt: tosAcknowledged ? now : undefined,
      venueLicenseAcknowledgedAt: (accountType !== "artist" && venueLicenseAcknowledged) ? now : undefined,
    });

    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) return res.status(401).json({ error: "Invalid credentials" });
    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  // --- Artist Profiles ---
  app.get("/api/artist/profile/:userId", async (req, res) => {
    const profile = await storage.getArtistProfile(req.params.userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json(profile);
  });

  app.post("/api/artist/profile", async (req, res) => {
    const { userId, stageName, bio, payoutInfoPlaceholder } = req.body || {};
    if (!userId || !stageName) return res.status(400).json({ error: "userId and stageName are required" });
    const existing = await storage.getArtistProfile(userId);
    if (existing) {
      const updated = await storage.updateArtistProfile(existing.id, { stageName, bio, payoutInfoPlaceholder });
      return res.json(updated);
    }
    const profile = await storage.createArtistProfile({ userId, stageName, bio, payoutInfoPlaceholder, createdAt: new Date().toISOString() });
    return res.json(profile);
  });

  app.put("/api/artist/profile/:id", async (req, res) => {
    const { stageName, bio, payoutInfoPlaceholder } = req.body || {};
    const updated = await storage.updateArtistProfile(req.params.id, { stageName, bio, payoutInfoPlaceholder });
    if (!updated) return res.status(404).json({ error: "Profile not found" });
    return res.json(updated);
  });

  // --- Tracks (Marketplace) ---
  app.get("/api/tracks", async (req, res) => {
    const { genre, licenseType, minBpm, maxBpm, key } = req.query as Record<string, string>;
    const filters: any = {};
    if (genre) filters.genre = genre;
    if (licenseType) filters.licenseType = licenseType;
    if (minBpm) filters.minBpm = parseInt(minBpm);
    if (maxBpm) filters.maxBpm = parseInt(maxBpm);
    if (key) filters.key = key;
    const tracks = await storage.getTracks(Object.keys(filters).length > 0 ? filters : undefined);
    return res.json(tracks);
  });

  app.get("/api/tracks/artist/:artistId", async (req, res) => {
    const tracks = await storage.getTracksByArtist(req.params.artistId);
    return res.json(tracks);
  });

  app.get("/api/tracks/file/:filename", async (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), "server/uploads/tracks", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.sendFile(filePath);
  });

  app.get("/api/tracks/preview/:filename", async (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), "server/uploads/tracks", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Preview not found" });
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.sendFile(filePath);
  });

  app.get("/api/tracks/:id", async (req, res) => {
    const track = await storage.getTrackById(req.params.id);
    if (!track) return res.status(404).json({ error: "Track not found" });
    return res.json(track);
  });

  app.post("/api/tracks", trackUpload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" });
    const { artistId, title, artistName, genre, bpm, key, isrc, licenseType, royaltyRate } = req.body || {};
    if (!artistId || !title || !artistName || !licenseType) {
      return res.status(400).json({ error: "artistId, title, artistName, and licenseType are required" });
    }
    if (!["free", "royalty", "promo"].includes(licenseType)) {
      return res.status(400).json({ error: "licenseType must be free, royalty, or promo" });
    }
    if (licenseType === "royalty" && (!royaltyRate || parseFloat(royaltyRate) < 0.01 || parseFloat(royaltyRate) > 1.00)) {
      return res.status(400).json({ error: "royalty rate must be between $0.01 and $1.00 per play" });
    }

    const fileUrl = `/api/tracks/file/${req.file.filename}`;
    const track = await storage.createTrack({
      artistId,
      title,
      artistName,
      genre: genre || null,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
      isrc: isrc || null,
      licenseType,
      royaltyRate: royaltyRate ? parseFloat(royaltyRate) : null,
      fileUrl,
      previewUrl: fileUrl,
      available: true,
      createdAt: new Date().toISOString(),
    });

    return res.json(track);
  });

  app.put("/api/tracks/:id", async (req, res) => {
    const { title, genre, bpm, key, isrc, licenseType, royaltyRate, available } = req.body || {};
    const updated = await storage.updateTrack(req.params.id, { title, genre, bpm, key, isrc, licenseType, royaltyRate, available });
    if (!updated) return res.status(404).json({ error: "Track not found" });
    return res.json(updated);
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    await storage.deleteTrack(req.params.id);
    return res.json({ ok: true });
  });

  // --- Play Events (Royalty Tracking) ---
  app.post("/api/play-events", async (req, res) => {
    const { trackId, eventId, djUserId, trackTitle, artistName, label, isrc, licenseType, duration, royaltyAmount, eventName, venueName } = req.body || {};
    if (!trackTitle || !artistName) return res.status(400).json({ error: "trackTitle and artistName are required" });

    const event = await storage.createPlayEvent({
      trackId: trackId || null,
      eventId: eventId || null,
      djUserId: djUserId || null,
      trackTitle,
      artistName,
      label: label || null,
      isrc: isrc || null,
      licenseType: licenseType || null,
      duration: duration || null,
      royaltyAmount: royaltyAmount || null,
      playedAt: new Date().toISOString(),
      eventName: eventName || null,
      venueName: venueName || null,
    });

    return res.json(event);
  });

  app.get("/api/play-events/event/:eventId", async (req, res) => {
    const events = await storage.getPlayEventsByEvent(req.params.eventId);
    return res.json(events);
  });

  app.get("/api/play-events/event/:eventId/csv", async (req, res) => {
    const events = await storage.getPlayEventsByEvent(req.params.eventId);
    const header = [
      "# PLAY LOG / CUE SHEET",
      `# Event: ${req.params.eventId}`,
      "# NOTICE: DJs and venues are responsible for obtaining proper performance licenses from ASCAP, BMI, or SESAC.",
      "# Please share this log with your venue's licensing contact for PRO compliance.",
      "# Consult a qualified music attorney for guidance specific to your situation.",
      "",
      "Track Title,Artist,Label,ISRC,Start Time,Duration (sec),License Type",
    ].join("\n");

    const rows = events.map((e) => {
      const cols = [
        `"${(e.trackTitle || "").replace(/"/g, '""')}"`,
        `"${(e.artistName || "").replace(/"/g, '""')}"`,
        `"${(e.label || "").replace(/"/g, '""')}"`,
        `"${(e.isrc || "").replace(/"/g, '""')}"`,
        `"${e.playedAt}"`,
        `"${e.duration || ""}"`,
        `"${e.licenseType || "own"}"`,
      ];
      return cols.join(",");
    });

    const csv = header + "\n" + rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="playlog-${req.params.eventId}.csv"`);
    return res.send(csv);
  });

  // --- Artist Dashboard ---
  app.get("/api/artist/dashboard/:artistProfileId", async (req, res) => {
    const profile = await storage.getArtistProfileById(req.params.artistProfileId);
    if (!profile) return res.status(404).json({ error: "Artist profile not found" });

    const artistTracks = await storage.getTracksByArtist(req.params.artistProfileId);
    const trackIds = artistTracks.map((t) => t.id);
    const allPlayEvents = trackIds.length > 0 ? await storage.getPlayEventsByArtistTrack(trackIds) : [];

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthEvents = allPlayEvents.filter((e) => e.playedAt.startsWith(currentMonth));
    const totalEarningsThisMonth = monthEvents.reduce((sum, e) => sum + (e.royaltyAmount || 0), 0);
    const platformFeeMonth = totalEarningsThisMonth * PLATFORM_CUT;
    const netEarningsThisMonth = totalEarningsThisMonth - platformFeeMonth;

    const trackStats = artistTracks.map((t) => {
      const plays = allPlayEvents.filter((e) => e.trackId === t.id);
      const earnings = plays.reduce((sum, e) => sum + (e.royaltyAmount || 0), 0);
      return { track: t, totalPlays: plays.length, totalEarnings: earnings, netEarnings: earnings * DJ_CUT, plays };
    });

    const payouts = await storage.getRoyaltyPayouts(req.params.artistProfileId);

    return res.json({ profile, trackStats, totalEarningsThisMonth, netEarningsThisMonth, pendingPayout: netEarningsThisMonth, payouts });
  });

  // --- Admin Royalties ---
  app.get("/api/admin/royalties", async (req, res) => {
    const allPayouts = await storage.getRoyaltyPayouts();
    const allEvents = await storage.getAllPlayEvents();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEvents = allEvents.filter((e) => e.playedAt.startsWith(currentMonth));

    const totalRoyaltiesThisMonth = monthEvents.reduce((sum, e) => sum + (e.royaltyAmount || 0), 0);
    const platformFeeIncome = totalRoyaltiesThisMonth * PLATFORM_CUT;

    const byArtist: Record<string, { artistName: string; plays: number; totalAmount: number; platformFee: number; netAmount: number }> = {};
    for (const e of monthEvents) {
      if (!e.trackId || !e.royaltyAmount) continue;
      const track = await storage.getTrackById(e.trackId);
      if (!track) continue;
      if (!byArtist[track.artistId]) {
        byArtist[track.artistId] = { artistName: e.artistName, plays: 0, totalAmount: 0, platformFee: 0, netAmount: 0 };
      }
      byArtist[track.artistId].plays += 1;
      byArtist[track.artistId].totalAmount += e.royaltyAmount;
      byArtist[track.artistId].platformFee += e.royaltyAmount * PLATFORM_CUT;
      byArtist[track.artistId].netAmount += e.royaltyAmount * DJ_CUT;
    }

    return res.json({
      totalRoyaltiesThisMonth,
      platformFeeIncome,
      byArtist,
      pendingPayouts: allPayouts.filter((p) => p.status === "pending"),
      allPayouts,
    });
  });

  app.post("/api/admin/royalties/calculate", async (req, res) => {
    const allEvents = await storage.getAllPlayEvents();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEvents = allEvents.filter((e) => e.playedAt.startsWith(currentMonth));

    const byArtist: Record<string, { plays: PlayEventItem[]; artistName: string }> = {};
    for (const e of monthEvents) {
      if (!e.trackId || !e.royaltyAmount) continue;
      const track = await storage.getTrackById(e.trackId);
      if (!track) continue;
      if (!byArtist[track.artistId]) byArtist[track.artistId] = { plays: [], artistName: e.artistName };
      byArtist[track.artistId].plays.push(e as any);
    }

    const payouts = [];
    for (const [artistId, data] of Object.entries(byArtist)) {
      const totalAmount = data.plays.reduce((s: number, e: any) => s + (e.royaltyAmount || 0), 0);
      const platformFee = totalAmount * PLATFORM_CUT;
      const netAmount = totalAmount - platformFee;
      const payout = await storage.createRoyaltyPayout({
        artistId,
        period: currentMonth,
        totalPlays: data.plays.length,
        totalAmount,
        platformFee,
        netAmount,
        status: "pending",
        createdAt: new Date().toISOString(),
        paidAt: null,
      });
      payouts.push(payout);
    }

    return res.json({ payouts, message: `Calculated ${payouts.length} artist payout(s) for ${currentMonth}` });
  });

  app.post("/api/admin/royalties/:id/mark-paid", async (req, res) => {
    const updated = await storage.markPayoutPaid(req.params.id);
    if (!updated) return res.status(404).json({ error: "Payout not found" });
    return res.json(updated);
  });

  // ═══════════════════════════════════════════════════════════
  // Auth: Logout & Profile
  // ═══════════════════════════════════════════════════════════
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("lib_session");
    return res.json({ ok: true, message: "Logged out" });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.put("/api/auth/profile", async (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const { username, accountType } = req.body || {};
    const updated = await storage.updateUser(userId, { ...(username && { username }), ...(accountType && { accountType }) });
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...safeUser } = updated;
    return res.json(safeUser);
  });

  // ═══════════════════════════════════════════════════════════
  // Playlists
  // ═══════════════════════════════════════════════════════════
  app.post("/api/playlists", async (req, res) => {
    try {
      const { userId, name, description, visibility } = req.body;
      if (!userId || !name) return res.status(400).json({ error: "userId and name required" });
      const now = new Date().toISOString();
      const playlist = await storage.createPlaylist({ userId, name, description, visibility: visibility || "private", coverUrl: null, createdAt: now, updatedAt: now });
      return res.json(playlist);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/playlists/user/:userId", async (req, res) => {
    const playlists = await storage.listUserPlaylists(req.params.userId);
    return res.json(playlists);
  });

  app.get("/api/playlists/public", async (_req, res) => {
    const playlists = await storage.listPublicPlaylists();
    return res.json(playlists);
  });

  app.get("/api/playlists/:id", async (req, res) => {
    const playlist = await storage.getPlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    const tracks = await storage.getPlaylistTracks(playlist.id);
    return res.json({ playlist, tracks });
  });

  app.put("/api/playlists/:id", async (req, res) => {
    const { name, description, visibility } = req.body || {};
    const updated = await storage.updatePlaylist(req.params.id, { ...(name && { name }), ...(description !== undefined && { description }), ...(visibility && { visibility }), updatedAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: "Playlist not found" });
    return res.json(updated);
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    await storage.deletePlaylist(req.params.id);
    return res.json({ ok: true });
  });

  app.post("/api/playlists/:id/tracks", async (req, res) => {
    try {
      const { trackId, addedBy } = req.body;
      if (!trackId) return res.status(400).json({ error: "trackId required" });
      const playlist = await storage.getPlaylist(req.params.id);
      if (!playlist) return res.status(404).json({ error: "Playlist not found" });
      const existingTracks = await storage.getPlaylistTracks(req.params.id);
      const pt = await storage.addTrackToPlaylist({ playlistId: req.params.id, trackId, addedBy: addedBy || null, position: existingTracks.length, addedAt: new Date().toISOString() });
      return res.json(pt);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/playlists/:id/tracks/:trackId", async (req, res) => {
    await storage.removeTrackFromPlaylist(req.params.id, req.params.trackId);
    return res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════
  // Social: Followers
  // ═══════════════════════════════════════════════════════════
  app.post("/api/follow/:artistId", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const follower = await storage.followUser({ followerId: userId, followingId: req.params.artistId, createdAt: new Date().toISOString() });
    return res.json(follower);
  });

  app.delete("/api/follow/:artistId", async (req, res) => {
    const userId = req.headers["x-user-id"] as string || req.body?.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await storage.unfollowUser(userId, req.params.artistId);
    return res.json({ ok: true });
  });

  app.get("/api/followers/:userId", async (req, res) => {
    const followers = await storage.getFollowers(req.params.userId);
    return res.json(followers);
  });

  app.get("/api/following/:userId", async (req, res) => {
    const following = await storage.getFollowing(req.params.userId);
    return res.json(following);
  });

  app.get("/api/is-following/:followerId/:followingId", async (req, res) => {
    const result = await storage.isFollowing(req.params.followerId, req.params.followingId);
    return res.json({ following: result });
  });

  // ═══════════════════════════════════════════════════════════
  // Social: Likes
  // ═══════════════════════════════════════════════════════════
  app.post("/api/likes/:trackId", async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const like = await storage.likeTrack({ userId, trackId: req.params.trackId, createdAt: new Date().toISOString() });
    return res.json(like);
  });

  app.delete("/api/likes/:trackId", async (req, res) => {
    const userId = req.headers["x-user-id"] as string || req.body?.userId;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await storage.unlikeTrack(userId, req.params.trackId);
    return res.json({ ok: true });
  });

  app.get("/api/likes/track/:trackId", async (req, res) => {
    const likes = await storage.getTrackLikes(req.params.trackId);
    return res.json({ count: likes.length, likes });
  });

  app.get("/api/likes/user/:userId", async (req, res) => {
    const likes = await storage.getUserLikes(req.params.userId);
    return res.json(likes);
  });

  // ═══════════════════════════════════════════════════════════
  // Social: Comments
  // ═══════════════════════════════════════════════════════════
  app.post("/api/comments/:trackId", async (req, res) => {
    const { userId, content, username } = req.body;
    if (!userId || !content || !username) return res.status(400).json({ error: "userId, content, and username required" });
    const comment = await storage.createComment({ userId, trackId: req.params.trackId, content, username, createdAt: new Date().toISOString() });
    return res.json(comment);
  });

  app.get("/api/comments/:trackId", async (req, res) => {
    const comments = await storage.getTrackComments(req.params.trackId);
    return res.json(comments);
  });

  app.delete("/api/comments/:commentId", async (req, res) => {
    await storage.deleteComment(req.params.commentId);
    return res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════
  // Live Streams
  // ═══════════════════════════════════════════════════════════
  app.post("/api/streams", async (req, res) => {
    try {
      const { artistId, artistName, title, description, scheduledAt } = req.body;
      if (!artistId || !artistName || !title) return res.status(400).json({ error: "artistId, artistName, and title required" });
      const stream = await storage.createLiveStream({ artistId, artistName, title, description, scheduledAt, status: "scheduled", startedAt: null, endedAt: null, createdAt: new Date().toISOString() });
      return res.json(stream);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/streams/live", async (_req, res) => {
    const streams = await storage.listActiveLiveStreams();
    return res.json(streams);
  });

  app.get("/api/streams/artist/:artistId", async (req, res) => {
    const streams = await storage.listArtistStreams(req.params.artistId);
    return res.json(streams);
  });

  app.get("/api/streams/:id", async (req, res) => {
    const stream = await storage.getLiveStream(req.params.id);
    if (!stream) return res.status(404).json({ error: "Stream not found" });
    return res.json(stream);
  });

  app.post("/api/streams/:id/start", async (req, res) => {
    const updated = await storage.updateLiveStream(req.params.id, { status: "live", startedAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: "Stream not found" });
    return res.json(updated);
  });

  app.post("/api/streams/:id/end", async (req, res) => {
    const updated = await storage.updateLiveStream(req.params.id, { status: "ended", endedAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: "Stream not found" });
    return res.json(updated);
  });

  // ═══════════════════════════════════════════════════════════
  // Lyrics
  // ═══════════════════════════════════════════════════════════
  app.get("/api/lyrics/:trackId", async (req, res) => {
    const lyrics = await storage.getLyrics(req.params.trackId);
    if (!lyrics) return res.status(404).json({ error: "Lyrics not found" });
    return res.json(lyrics);
  });

  app.post("/api/lyrics/:trackId", async (req, res) => {
    const { plainText, syncedLines } = req.body;
    if (!plainText) return res.status(400).json({ error: "plainText required" });
    const existing = await storage.getLyrics(req.params.trackId);
    if (existing) {
      const updated = await storage.updateLyrics(req.params.trackId, { plainText, syncedLines });
      return res.json(updated);
    }
    const lyrics = await storage.createLyrics({ trackId: req.params.trackId, plainText, syncedLines: syncedLines || null, createdAt: new Date().toISOString() });
    return res.json(lyrics);
  });

  // ═══════════════════════════════════════════════════════════
  // Charts & Leaderboards
  // ═══════════════════════════════════════════════════════════
  app.get("/api/charts/top-tracks", async (req, res) => {
    const { genre, limit: limitStr } = req.query as Record<string, string>;
    const limit = parseInt(limitStr || "50", 10);
    const tracks = genre ? await storage.getTopTracksByGenre(genre, limit) : await storage.getTopTracks(limit);
    return res.json(tracks);
  });

  app.get("/api/charts/top-artists", async (req, res) => {
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const artists = await storage.getTopArtists(limit);
    return res.json(artists);
  });

  // ═══════════════════════════════════════════════════════════
  // Discovery
  // ═══════════════════════════════════════════════════════════
  app.get("/api/discovery/trending", async (req, res) => {
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const tracks = await storage.getTrendingTracks(limit);
    return res.json(tracks);
  });

  app.get("/api/discovery/recommendations/:userId", async (req, res) => {
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const tracks = await storage.getRecommendedTracks(req.params.userId, limit);
    return res.json(tracks);
  });

  app.get("/api/discovery/moods", (_req, res) => {
    return res.json([
      { id: "energetic", name: "Energetic", icon: "zap", color: "#ef4444" },
      { id: "chill", name: "Chill", icon: "cloud", color: "#06b6d4" },
      { id: "happy", name: "Happy", icon: "sun", color: "#eab308" },
      { id: "dark", name: "Dark", icon: "moon", color: "#6366f1" },
      { id: "focus", name: "Focus", icon: "brain", color: "#22c55e" },
      { id: "party", name: "Party", icon: "sparkles", color: "#f97316" },
    ]);
  });

  app.get("/api/discovery/moods/:mood", async (req, res) => {
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const tracks = await storage.getTracksByMood(req.params.mood, limit);
    return res.json(tracks);
  });

  app.get("/api/discovery/genres", async (_req, res) => {
    const genres = await storage.getGenreList();
    const defaultGenres = ["Electronic", "House", "Techno", "Hip-Hop", "Pop", "R&B", "Afrobeats", "Reggaeton", "Jazz", "Lo-fi", "Ambient", "Dance"];
    const allGenres = Array.from(new Set([...defaultGenres, ...genres])).sort();
    return res.json(allGenres);
  });

  // ═══════════════════════════════════════════════════════════
  // Concerts / Events
  // ═══════════════════════════════════════════════════════════
  app.post("/api/concerts", async (req, res) => {
    try {
      const { artistId, artistName, title, description, venue, city, date, time, ticketUrl, imageUrl, price, capacity } = req.body;
      if (!artistId || !artistName || !title || !venue || !city || !date) return res.status(400).json({ error: "artistId, artistName, title, venue, city, and date required" });
      const concert = await storage.createConcert({ artistId, artistName, title, description, venue, city, date, time, ticketUrl, imageUrl, price, capacity, createdAt: new Date().toISOString() });
      return res.json(concert);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/concerts", async (req, res) => {
    const { city, artistId } = req.query as Record<string, string>;
    const concerts = await storage.listConcerts({ city, artistId });
    return res.json(concerts);
  });

  app.get("/api/concerts/:id", async (req, res) => {
    const concert = await storage.getConcert(req.params.id);
    if (!concert) return res.status(404).json({ error: "Concert not found" });
    return res.json(concert);
  });

  app.put("/api/concerts/:id", async (req, res) => {
    const updated = await storage.updateConcert(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Concert not found" });
    return res.json(updated);
  });

  app.delete("/api/concerts/:id", async (req, res) => {
    await storage.deleteConcert(req.params.id);
    return res.json({ ok: true });
  });

  app.post("/api/concerts/:id/rsvp", async (req, res) => {
    const concert = await storage.getConcert(req.params.id);
    if (!concert) return res.status(404).json({ error: "Concert not found" });
    await storage.updateConcert(req.params.id, { rsvpCount: concert.rsvpCount + 1 });
    return res.json({ ok: true, rsvpCount: concert.rsvpCount + 1 });
  });

  // ═══════════════════════════════════════════════════════════
  // Merchandise Store
  // ═══════════════════════════════════════════════════════════
  app.post("/api/merch", async (req, res) => {
    try {
      const { artistId, name, description, price, imageUrl, category, stock } = req.body;
      if (!artistId || !name || price == null) return res.status(400).json({ error: "artistId, name, and price required" });
      const item = await storage.createMerchandise({ artistId, name, description, price, imageUrl, category: category || "other", stock: stock || 0, available: true, createdAt: new Date().toISOString() });
      return res.json(item);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/merch/artist/:artistId", async (req, res) => {
    const items = await storage.listArtistMerchandise(req.params.artistId);
    return res.json(items);
  });

  app.get("/api/merch/:id", async (req, res) => {
    const item = await storage.getMerchandise(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json(item);
  });

  app.put("/api/merch/:id", async (req, res) => {
    const updated = await storage.updateMerchandise(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.json(updated);
  });

  app.delete("/api/merch/:id", async (req, res) => {
    await storage.deleteMerchandise(req.params.id);
    return res.json({ ok: true });
  });

  app.post("/api/merch/order", async (req, res) => {
    try {
      const { userId, merchId, quantity } = req.body;
      if (!userId || !merchId) return res.status(400).json({ error: "userId and merchId required" });
      const item = await storage.getMerchandise(merchId);
      if (!item) return res.status(404).json({ error: "Item not found" });
      const qty = quantity || 1;
      const order = await storage.createMerchOrder({ userId, merchId, quantity: qty, totalPrice: item.price * qty, status: "pending", createdAt: new Date().toISOString() });
      return res.json(order);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/merch/orders/:userId", async (req, res) => {
    const orders = await storage.listUserOrders(req.params.userId);
    return res.json(orders);
  });

  // ═══════════════════════════════════════════════════════════
  // Music Production: Beats
  // ═══════════════════════════════════════════════════════════
  app.post("/api/beats", async (req, res) => {
    try {
      const { userId, name, bpm, key, genre, pattern } = req.body;
      if (!userId || !name || !pattern) return res.status(400).json({ error: "userId, name, and pattern required" });
      const now = new Date().toISOString();
      const beat = await storage.createBeat({ userId, name, bpm: bpm || 120, key, genre, pattern, createdAt: now, updatedAt: now });
      return res.json(beat);
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  app.get("/api/beats/user/:userId", async (req, res) => {
    const beats = await storage.listUserBeats(req.params.userId);
    return res.json(beats);
  });

  app.get("/api/beats/:id", async (req, res) => {
    const beat = await storage.getBeat(req.params.id);
    if (!beat) return res.status(404).json({ error: "Beat not found" });
    return res.json(beat);
  });

  app.put("/api/beats/:id", async (req, res) => {
    const updated = await storage.updateBeat(req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: "Beat not found" });
    return res.json(updated);
  });

  app.delete("/api/beats/:id", async (req, res) => {
    await storage.deleteBeat(req.params.id);
    return res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════════════════
  // Samples Library
  // ═══════════════════════════════════════════════════════════
  app.get("/api/samples", async (req, res) => {
    const { category } = req.query as Record<string, string>;
    const samples = await storage.listSamples(category);
    return res.json(samples);
  });

  app.get("/api/samples/:id", async (req, res) => {
    const sample = await storage.getSample(req.params.id);
    if (!sample) return res.status(404).json({ error: "Sample not found" });
    return res.json(sample);
  });

  // ═══════════════════════════════════════════════════════════
  // Admin: User Management & Content Moderation
  // ═══════════════════════════════════════════════════════════
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const users = await storage.listAllUsers();
    return res.json(users.map(u => { const { password: _pw, ...safe } = u; return safe; }));
  });

  app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...safe } = user;
    return res.json(safe);
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const { accountType } = req.body || {};
    const updated = await storage.updateUser(req.params.id, { ...(accountType && { accountType }) });
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { password: _pw, ...safe } = updated;
    return res.json(safe);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(req.params.id);
    return res.json({ ok: true });
  });

  app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
    try {
      const [users, tracks, events, totalRevenue, subscriptionsByTier] = await Promise.all([
        storage.listAllUsers(),
        storage.getTracks(),
        storage.listAllEvents(),
        storage.getTotalPlatformRevenue(),
        storage.getSubscriptionsByTier(),
      ]);
      const activeStreams = await storage.listActiveLiveStreams();
      return res.json({
        totalUsers: users.length,
        totalTracks: tracks.length,
        totalEvents: events.length,
        activeStreams: activeStreams.length,
        totalRevenue,
        subscriptionsByTier,
        usersByType: {
          dj: users.filter(u => u.accountType === "dj").length,
          artist: users.filter(u => u.accountType === "artist").length,
        },
      });
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
  });

  registerAIDJRoutes(app);
  registerPlatformRoutes(app);

  // --- Library Session Middleware ---
  function getSessionId(req: Request, res: Response): string {
    let sid = req.cookies?.["lib_session"];
    if (!sid) {
      sid = randomUUID();
      res.cookie("lib_session", sid, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: "lax" });
    }
    return sid;
  }

  // Library Favorites
  app.get("/api/library/favorites", async (req: Request, res: Response) => {
    const sid = getSessionId(req, res);
    const favs = await storage.getFavorites(sid);
    return res.json(favs.map(f => JSON.parse(f.trackData)));
  });

  app.post("/api/library/favorites", async (req: Request, res: Response) => {
    const sid = getSessionId(req, res);
    const track = req.body;
    if (!track?.id) return res.status(400).json({ error: "track.id required" });
    await storage.addFavorite(sid, track.id, JSON.stringify(track));
    return res.json({ ok: true });
  });

  app.delete("/api/library/favorites/:trackId", async (req: Request, res: Response) => {
    const sid = getSessionId(req, res);
    await storage.removeFavorite(sid, req.params.trackId as string);
    return res.json({ ok: true });
  });

  // Library History
  app.get("/api/library/history", async (req: Request, res: Response) => {
    const sid = getSessionId(req, res);
    const hist = await storage.getHistory(sid);
    return res.json(hist.map(h => JSON.parse(h.trackData)));
  });

  app.post("/api/library/history", async (req: Request, res: Response) => {
    const sid = getSessionId(req, res);
    const track = req.body;
    if (!track?.id) return res.status(400).json({ error: "track.id required" });
    await storage.addHistory(sid, track.id, JSON.stringify(track));
    return res.json({ ok: true });
  });

  // --- Jamendo Free Music Library ---

  interface JamendoTrackResult {
    id: string;
    name: string;
    artist_name: string;
    album_image: string;
    image: string;
    audio: string;
    duration: number;
    license_ccurl: string;
    popularity_total?: number;
    popularity_week?: number;
    musicinfo?: {
      tags?: {
        genres?: string[];
        instruments?: string[];
        vartags?: string[];
      };
      speed?: string;
    };
  }

  interface JamendoApiResponse {
    headers?: { results_count?: number };
    results: JamendoTrackResult[];
  }

  function mapJamendoTrack(t: JamendoTrackResult) {
    const vartags = t.musicinfo?.tags?.vartags ?? [];
    const bpmTag = vartags.find(v => /^\d{2,3}bpm$/i.test(v));
    const bpm = bpmTag ? parseInt(bpmTag, 10) : undefined;
    const keyTag = vartags.find(v => /^[A-Ga-g][b#]?\s*(major|minor|maj|min)$/i.test(v));
    const key = keyTag ?? undefined;
    return {
      id: t.id,
      name: t.name,
      artist: t.artist_name,
      albumArt: t.album_image || t.image,
      duration: t.duration,
      genre: t.musicinfo?.tags?.genres?.join(", ") ?? "",
      mood: vartags.filter(v => !bpmTag || v !== bpmTag).join(", "),
      license: t.license_ccurl,
      bpm,
      key,
      energy: t.musicinfo?.speed ?? undefined,
      popularityTotal: t.popularity_total ?? 0,
      popularityWeek: t.popularity_week ?? 0,
    };
  }

  // In-memory cache: key -> { data, expiresAt }
  const jamendoCache = new Map<string, { data: any; expiresAt: number }>();
  const CACHE_TTL_MS = 10 * 60 * 1000;

  async function jamendoFetch(params: URLSearchParams): Promise<JamendoTrackResult[]> {
    const key = params.toString();
    const cached = jamendoCache.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.data;
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${key}`);
    if (!response.ok) return [];
    const data: JamendoApiResponse = await response.json();
    const results = data.results || [];
    jamendoCache.set(key, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
    return results;
  }

  async function fetchGenreBatch(clientId: string, genre: string, offset: number, limit: number): Promise<JamendoTrackResult[]> {
    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: limit.toString(),
      offset: offset.toString(),
      include: "musicinfo",
      imagesize: "200",
      audioformat: "mp31",
      tags: genre,
      order: "popularity_total_desc",
    });
    return jamendoFetch(params);
  }

  // /api/jamendo/library?genre=electronic&page=0
  // Total cap: 200 tracks per genre. page=0 fetches all 200 in 4 parallel batches of 50.
  // Subsequent pages are served from the cache (offset within the 200-track set).
  const PAGE_SIZE = 50;
  const MAX_GENRE_TRACKS = 200;
  app.get("/api/jamendo/library", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Jamendo client ID not configured" });

    const { genre = "electronic", page = "0" } = req.query as Record<string, string>;
    const pageNum = Math.max(0, parseInt(page, 10) || 0);
    const cacheKey = `library:${genre}`;

    try {
      // Fetch all 200 tracks on first access (4 batches of 50), then serve from cache
      let allTracks: JamendoTrackResult[];
      const cachedGenre = jamendoCache.get(cacheKey);
      if (cachedGenre && Date.now() < cachedGenre.expiresAt) {
        allTracks = cachedGenre.data as JamendoTrackResult[];
      } else {
        const batches = await Promise.all(
          Array.from({ length: MAX_GENRE_TRACKS / PAGE_SIZE }, (_, i) =>
            fetchGenreBatch(clientId, genre, i * PAGE_SIZE, PAGE_SIZE)
          )
        );
        const seen = new Set<string>();
        allTracks = batches.flat().filter(t => seen.has(t.id) ? false : (seen.add(t.id), true));
        jamendoCache.set(cacheKey, { data: allTracks, expiresAt: Date.now() + 10 * 60 * 1000 });
      }

      const sliceStart = pageNum * PAGE_SIZE;
      const sliceEnd = Math.min(sliceStart + PAGE_SIZE, MAX_GENRE_TRACKS);
      const pageSlice = allTracks.slice(sliceStart, sliceEnd);
      return res.json({ tracks: pageSlice.map(mapJamendoTrack), total: allTracks.length, page: pageNum });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch" });
    }
  });

  // /api/jamendo/featured?limit=100
  app.get("/api/jamendo/featured", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Jamendo client ID not configured" });

    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);
    const genres = ["electronic", "hiphop", "pop", "house", "dance", "techno", "rnb", "rock"];
    const perGenre = Math.ceil(limit / genres.length);

    try {
      const batches = await Promise.all(genres.map(genre => {
        const params = new URLSearchParams({
          client_id: clientId,
          format: "json",
          limit: perGenre.toString(),
          offset: "0",
          include: "musicinfo",
          imagesize: "200",
          audioformat: "mp31",
          tags: genre,
          order: "popularity_total_desc",
        });
        return jamendoFetch(params);
      }));
      const allTracks = batches.flat();
      const seen = new Set<string>();
      const unique = allTracks
        .filter(t => seen.has(t.id) ? false : (seen.add(t.id), true))
        .sort((a, b) => (b.popularity_total ?? 0) - (a.popularity_total ?? 0))
        .slice(0, limit);
      return res.json({ tracks: unique.map(mapJamendoTrack) });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch" });
    }
  });

  // /api/jamendo/trending?limit=100
  app.get("/api/jamendo/trending", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Jamendo client ID not configured" });

    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);
    try {
      const makeParams = (offset: number) => new URLSearchParams({
        client_id: clientId,
        format: "json",
        limit: "50",
        offset: String(offset),
        include: "musicinfo",
        imagesize: "200",
        audioformat: "mp31",
        order: "popularity_week_desc",
      });
      const batches = limit > 50
        ? await Promise.all([jamendoFetch(makeParams(0)), jamendoFetch(makeParams(50))])
        : [await jamendoFetch(makeParams(0))];
      const allTracks = batches.flat();
      const seen = new Set<string>();
      const unique = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      return res.json({ tracks: unique.slice(0, limit).map(mapJamendoTrack) });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch" });
    }
  });

  // /api/jamendo/suggest?bpm=128&key=C+Major
  app.get("/api/jamendo/suggest", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Jamendo client ID not configured" });

    const { bpm, genre } = req.query as Record<string, string>;
    const bpmVal = bpm ? parseInt(bpm, 10) : undefined;

    try {
      const searchGenre = genre || "electronic";
      const params = new URLSearchParams({
        client_id: clientId,
        format: "json",
        limit: "50",
        offset: "0",
        include: "musicinfo",
        imagesize: "200",
        audioformat: "mp31",
        tags: searchGenre,
        order: "popularity_total_desc",
      });
      const results = await jamendoFetch(params);
      let filtered = results.map(mapJamendoTrack);

      if (bpmVal) {
        const lo = bpmVal * 0.95;
        const hi = bpmVal * 1.05;
        filtered = filtered.filter(t => !t.bpm || (t.bpm >= lo && t.bpm <= hi));
      }

      return res.json({ tracks: filtered.slice(0, 20) });
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch" });
    }
  });

  app.get("/api/jamendo/search", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Jamendo client ID not configured" });
    }

    const { q = "", genre = "", mood = "", limit = "20", offset = "0" } = req.query as Record<string, string>;

    const clampedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50).toString();
    const clampedOffset = Math.max(parseInt(offset, 10) || 0, 0).toString();

    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: clampedLimit,
      offset: clampedOffset,
      include: "musicinfo",
      imagesize: "200",
      audioformat: "mp31",
    });

    if (q.trim()) params.set("namesearch", q.trim());
    const tagParts = [genre.trim(), mood.trim()].filter(Boolean);
    if (tagParts.length > 0) params.set("tags", tagParts.join("+"));

    try {
      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);
      if (!response.ok) {
        return res.status(response.status).json({ error: "Jamendo API error" });
      }
      const data: JamendoApiResponse = await response.json();
      const tracks = (data.results || []).map(mapJamendoTrack);
      return res.json({ tracks, total: data.headers?.results_count ?? tracks.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch from Jamendo";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/api/jamendo/stream", async (req: Request, res: Response) => {
    const clientId = process.env.JAMENDO_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: "Jamendo client ID not configured" });

    const { id } = req.query as Record<string, string>;
    if (!id) return res.status(400).json({ error: "Track id required" });

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        format: "json",
        id,
        audioformat: "mp31",
      });
      const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params.toString()}`);
      if (!response.ok) return res.status(response.status).json({ error: "Jamendo API error" });
      const data: JamendoApiResponse = await response.json();
      const track = data.results?.[0];
      if (!track) return res.status(404).json({ error: "Track not found" });

      const audioResp = await fetch(track.audio);
      if (!audioResp.ok) return res.status(502).json({ error: "Failed to fetch audio" });
      if (!audioResp.body) return res.status(502).json({ error: "No audio body received" });

      const contentType = audioResp.headers.get("content-type") ?? "audio/mpeg";
      const contentLength = audioResp.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=3600");

      Readable.fromWeb(audioResp.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stream error";
      return res.status(500).json({ error: message });
    }
  });

  return httpServer;
}

function generateEventCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type PlayEventItem = {
  id: string;
  trackId: string | null;
  royaltyAmount: number | null;
  artistName: string;
};

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
