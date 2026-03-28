import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface TrackInfo {
  name: string;
  bpm?: number;
  key?: string;
  duration?: number;
  energy?: number;
}

export interface PlaylistAnalysis {
  tracks: TrackInfo[];
  totalDuration: number;
  avgBpm: number;
}

// Proprietary DJ algorithm - scores transition quality between two tracks
function scoreMixTransition(a: TrackInfo, b: TrackInfo): number {
  let score = 50;

  // BPM compatibility (0-30 points)
  if (a.bpm && b.bpm) {
    const diff = Math.abs(a.bpm - b.bpm);
    const ratio = Math.min(a.bpm, b.bpm) / Math.max(a.bpm, b.bpm);
    if (diff <= 2) score += 30;
    else if (diff <= 5) score += 22;
    else if (diff <= 10) score += 14;
    else if (ratio > 0.48 && ratio < 0.52) score += 18; // half-time compatible
    else if (ratio > 0.65) score += 8;
  } else {
    score += 15; // neutral if unknown
  }

  // Key compatibility (0-20 points) using Camelot wheel
  const camelotMap: Record<string, [number, string]> = {
    "C Major": [8, "B"], "A Minor": [8, "A"],
    "G Major": [9, "B"], "E Minor": [9, "A"],
    "D Major": [10, "B"], "B Minor": [10, "A"],
    "A Major": [11, "B"], "F# Minor": [11, "A"],
    "E Major": [12, "B"], "C# Minor": [12, "A"],
    "B Major": [1, "B"], "G# Minor": [1, "A"],
    "F# Major": [2, "B"], "D# Minor": [2, "A"],
    "Db Major": [3, "B"], "Bb Minor": [3, "A"],
    "Ab Major": [4, "B"], "F Minor": [4, "A"],
    "Eb Major": [5, "B"], "C Minor": [5, "A"],
    "Bb Major": [6, "B"], "G Minor": [6, "A"],
    "F Major": [7, "B"], "D Minor": [7, "A"],
  };

  if (a.key && b.key) {
    const ca = camelotMap[a.key];
    const cb = camelotMap[b.key];
    if (ca && cb) {
      const same = ca[0] === cb[0];
      const adjacent = ca[1] === cb[1] && (Math.abs(ca[0] - cb[0]) === 1 || Math.abs(ca[0] - cb[0]) === 11);
      const relative = Math.abs(ca[0] - cb[0]) === 0 && ca[1] !== cb[1];
      if (same) score += 20;
      else if (adjacent) score += 15;
      else if (relative) score += 10;
      else score += 3;
    } else {
      score += 10;
    }
  } else {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

// Build optimal playlist order using greedy nearest-neighbor with score
function buildOptimalOrder(tracks: TrackInfo[]): number[] {
  if (tracks.length <= 1) return tracks.map((_, i) => i);

  const remaining = new Set<number>(tracks.map((_, i) => i));
  const order: number[] = [];

  // Start with the track closest to 120 BPM (good opener energy)
  let best = 0;
  let bestDiff = Infinity;
  for (const i of remaining) {
    const bpm = tracks[i].bpm ?? 120;
    const d = Math.abs(bpm - 120);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  order.push(best);
  remaining.delete(best);

  // Greedily pick the best-scoring next track
  while (remaining.size > 0) {
    const current = tracks[order[order.length - 1]];
    let bestNext = -1;
    let bestScore = -1;
    for (const i of remaining) {
      const s = scoreMixTransition(current, tracks[i]);
      if (s > bestScore) { bestScore = s; bestNext = i; }
    }
    order.push(bestNext);
    remaining.delete(bestNext);
  }

  return order;
}

// Determine mix type and params for a pair
function getMixParams(a: TrackInfo, b: TrackInfo) {
  const score = scoreMixTransition(a, b);
  const bpmDiff = a.bpm && b.bpm ? Math.abs(a.bpm - b.bpm) : 999;
  const needsBpmSync = a.bpm && b.bpm && bpmDiff > 0 && bpmDiff <= 12;
  const rateAdjust = needsBpmSync && a.bpm && b.bpm ? +(a.bpm / b.bpm).toFixed(4) : 1;

  let mixType: "long-blend" | "quick-blend" | "echo-out" | "cut";
  let blendBeats: number;
  let fxOnOut: string[];

  if (score >= 75) { mixType = "long-blend"; blendBeats = 32; fxOnOut = []; }
  else if (score >= 55) { mixType = "quick-blend"; blendBeats = 16; fxOnOut = ["filter-sweep"]; }
  else if (score >= 35) { mixType = "echo-out"; blendBeats = 8; fxOnOut = ["reverb", "delay"]; }
  else { mixType = "cut"; blendBeats = 4; fxOnOut = ["filter", "reverb"]; }

  const beatDuration = a.bpm ? 60 / a.bpm : 0.5;
  const blendDuration = blendBeats * beatDuration;

  return { score, mixType, blendBeats, blendDuration, rateAdjust, fxOnOut };
}

export function registerAIDJRoutes(app: Express) {

  // Analyze a playlist and get AI suggestions
  app.post("/api/ai-dj/analyze-playlist", async (req: Request, res: Response) => {
    try {
      const { tracks }: { tracks: TrackInfo[] } = req.body;
      if (!tracks || tracks.length === 0) {
        return res.status(400).json({ error: "No tracks provided" });
      }

      // Build optimal order
      const optimalOrder = buildOptimalOrder(tracks);
      const orderedTracks = optimalOrder.map(i => tracks[i]);

      // Build transition plan
      const transitions = [];
      for (let i = 0; i < orderedTracks.length - 1; i++) {
        const params = getMixParams(orderedTracks[i], orderedTracks[i + 1]);
        transitions.push({
          fromTrack: orderedTracks[i].name,
          toTrack: orderedTracks[i + 1].name,
          ...params,
        });
      }

      const avgBpm = tracks.filter(t => t.bpm).reduce((s, t) => s + (t.bpm || 0), 0) / (tracks.filter(t => t.bpm).length || 1);
      const totalDuration = tracks.reduce((s, t) => s + (t.duration || 0), 0);

      // AI description
      const trackSummary = orderedTracks.map((t, i) => `${i + 1}. "${t.name}" (${t.bpm ? Math.round(t.bpm) + "BPM" : "?"}, ${t.key || "?"}, ${t.duration ? Math.round(t.duration) + "s" : "?"})`).join("\n");
      const prompt = `You are a professional DJ assistant helping party guests. Here is a playlist you've ordered for best flow:\n\n${trackSummary}\n\nIn 2-3 friendly, fun sentences, describe the energy journey of this set and give one quick tip for hyping the crowd. Use simple, excited language — not technical DJ terms. Under 80 words total.`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });
      const aiComment = aiResp.choices[0]?.message?.content?.trim() || "";

      return res.json({ optimalOrder, orderedTracks, transitions, avgBpm: Math.round(avgBpm), totalDuration, aiComment });
    } catch (err: any) {
      console.error("AI DJ analyze error:", err);
      return res.status(500).json({ error: err.message || "Analysis failed" });
    }
  });

  // Get real-time transition advice for two current tracks (streaming)
  app.post("/api/ai-dj/transition-advice", async (req: Request, res: Response) => {
    try {
      const { trackA, trackB, currentPosition, deckABpm, deckBBpm } = req.body;

      const params = getMixParams(
        { name: trackA || "Track A", bpm: deckABpm },
        { name: trackB || "Track B", bpm: deckBBpm }
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send algorithmic advice immediately (no wait)
      res.write(`data: ${JSON.stringify({ type: "params", data: params })}\n\n`);

      const prompt = `You are a friendly DJ assistant speaking to a beginner at a party. The current song "${trackA || "A"}" is playing${deckABpm ? ` at ${Math.round(deckABpm)} BPM` : ""}. The next song "${trackB || "B"}"${deckBBpm ? ` is at ${Math.round(deckBBpm)} BPM` : ""}.

Mix score: ${params.score}/100. Recommended: ${params.mixType.replace("-", " ")}.

In 1-2 very short, excited sentences tell them exactly what to do right now to mix to the next song. Use simple words, no DJ jargon. Be encouraging. Under 40 words.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        stream: true,
      });

      let full = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          full += text;
          res.write(`data: ${JSON.stringify({ type: "text", data: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done", full })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Transition advice error:", err);
      if (!res.headersSent) return res.status(500).json({ error: err.message });
      res.write(`data: ${JSON.stringify({ type: "error" })}\n\n`);
      res.end();
    }
  });

  // Get AI song recommendations based on mood/vibe
  app.post("/api/ai-dj/vibe-tips", async (req: Request, res: Response) => {
    try {
      const { vibe, playingTracks, eventType } = req.body;

      const prompt = `You are a fun DJ assistant at a ${eventType || "party"}. The current vibe request is: "${vibe || "keep the energy up"}". ${playingTracks ? `Songs playing: ${playingTracks.join(", ")}.` : ""}

Give 3 short, specific tips in a numbered list for what to do RIGHT NOW — things like when to drop the bass, when to use sound effects, when to fade, etc. Use emojis, be hype. Under 60 words total.`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) res.write(`data: ${JSON.stringify({ type: "text", data: text })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Vibe tips error:", err);
      if (!res.headersSent) return res.status(500).json({ error: err.message });
      res.write(`data: ${JSON.stringify({ type: "error" })}\n\n`);
      res.end();
    }
  });

  // Auto-execute a mix transition (returns step-by-step commands)
  app.post("/api/ai-dj/auto-mix-plan", (req: Request, res: Response) => {
    try {
      const { trackA, trackB } = req.body as { trackA: TrackInfo; trackB: TrackInfo };
      const params = getMixParams(trackA, trackB);

      const steps: { time: number; action: string; param?: any }[] = [];
      const beat = trackA.bpm ? 60000 / trackA.bpm : 500;

      // Step 1: Sync BPM if needed
      if (params.rateAdjust !== 1) {
        steps.push({ time: 0, action: "setRate", param: { deck: "B", rate: params.rateAdjust } });
      }

      // Step 2: Start deck B
      steps.push({ time: 0, action: "playDeck", param: { deck: "B" } });

      // Step 3: Apply outgoing FX
      if (params.fxOnOut.includes("reverb")) {
        steps.push({ time: beat * 2, action: "setReverb", param: { deck: "A", amount: 0.5 } });
      }
      if (params.fxOnOut.includes("delay")) {
        steps.push({ time: beat * 2, action: "setDelay", param: { deck: "A", amount: 0.4 } });
      }

      // Step 4: Crossfade steps (smooth S-curve)
      const fadeSteps = params.blendBeats * 2;
      for (let i = 0; i <= fadeSteps; i++) {
        const t = i / fadeSteps;
        const curve = t * t * (3 - 2 * t); // smoothstep
        steps.push({ time: beat * (params.blendBeats / 2) + (i * (beat * params.blendBeats) / fadeSteps), action: "crossfade", param: { value: curve } });
      }

      // Step 5: Mute A + reset
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2), action: "pauseDeck", param: { deck: "A" } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setReverb", param: { deck: "A", amount: 0 } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setDelay", param: { deck: "A", amount: 0 } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setRate", param: { deck: "B", rate: 1 } });

      return res.json({ params, steps, totalMs: beat * params.blendBeats + beat * (params.blendBeats / 2) + 500 });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
