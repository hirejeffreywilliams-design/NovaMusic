import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import os from "os";
import path from "path";
import * as mm from "music-metadata";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 100 * 1024 * 1024 } });

export interface TrackInfo {
  name: string;
  bpm?: number;
  key?: string;
  duration?: number;
  energy?: number;
}

export interface AnalyzedTrack {
  id: string;
  name: string;
  bpm: number;
  key: string;
  duration: number;
  energy: number;
  genre: string;
  mood: string;
  fireZoneStart: number;
  fireZoneEnd: number;
  fireZoneLabel: string;
  isTrending: boolean;
  trendingReason?: string;
  bestMomentReason: string;
}

export interface SetlistPlan {
  tracks: AnalyzedTrack[];
  transitions: TransitionPlan[];
  totalDuration: number;
  avgBpm: number;
  genreJourney: string[];
  energyArc: number[];
  aiComment: string;
  vibeMessage: string;
}

export interface TransitionPlan {
  fromTrackId: string;
  toTrackId: string;
  fromTrack: string;
  toTrack: string;
  mixType: "long-blend" | "quick-blend" | "echo-out" | "cut";
  blendBeats: number;
  blendDuration: number;
  fxOnOut: string[];
  genreBridge: string;
  score: number;
  rateAdjust: number;
  transitionEffect: string;
}

export interface PlaylistAnalysis {
  tracks: TrackInfo[];
  totalDuration: number;
  avgBpm: number;
}

function scoreMixTransition(a: TrackInfo, b: TrackInfo): number {
  let score = 50;

  if (a.bpm && b.bpm) {
    const diff = Math.abs(a.bpm - b.bpm);
    const ratio = Math.min(a.bpm, b.bpm) / Math.max(a.bpm, b.bpm);
    if (diff <= 2) score += 30;
    else if (diff <= 5) score += 22;
    else if (diff <= 10) score += 14;
    else if (ratio > 0.48 && ratio < 0.52) score += 18;
    else if (ratio > 0.65) score += 8;
  } else {
    score += 15;
  }

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

function buildOptimalOrder(tracks: TrackInfo[]): number[] {
  if (tracks.length <= 1) return tracks.map((_, i) => i);

  const remaining = new Set<number>(tracks.map((_, i) => i));
  const order: number[] = [];

  let best = 0;
  let bestDiff = Infinity;
  for (const i of remaining) {
    const bpm = tracks[i].bpm ?? 120;
    const d = Math.abs(bpm - 120);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  order.push(best);
  remaining.delete(best);

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

function guessGenreFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.match(/amapiano|log drum|kabza|dj maphorisa|focalistic|sun-el/)) return "Amapiano";
  if (lower.match(/afrobeats|afrohouse|afropop|burna|wizkid|davido|asake|rema|tems|ckay/)) return "Afrobeats";
  if (lower.match(/phonk|drift|memphis|ghostemane|kordhell|nightcore|sped.?up/)) return "Phonk";
  if (lower.match(/drill|uk drill|pop smoke|central cee|digga d|fivio foreign|polo g/)) return "Drill";
  if (lower.match(/hip.?hop|rap|trap|lil|young|uzi|21 savage|gunna|future|metro|playboi/)) return "Hip Hop";
  if (lower.match(/r.?b|soul|rnb|brent|sza|summer walker|daniel caesar|frank ocean|the weeknd/)) return "R&B";
  if (lower.match(/pop|taylor|ariana|billie|dua|olivia|harry styles|sabrina carpenter|chappell/)) return "Pop";
  if (lower.match(/edm|house|techno|trance|dubstep|dnb|drum.?and.?bass|fisher|fred again|skrillex|calvin harris/)) return "EDM";
  if (lower.match(/reggaeton|latin|bad bunny|j balvin|peso pluma|karol.?g|maluma|shakira|feid|ozuna/)) return "Latin";
  if (lower.match(/jersey|club|juke|footwork|tekno club/)) return "Jersey Club";
  if (lower.match(/rock|guitar|metal|alternative|indie|nirvana|arctic monkeys|the 1975/)) return "Rock";
  if (lower.match(/country|western|luke|morgan|blake|kenny|zach bryan|tyler childers/)) return "Country";
  if (lower.match(/jazz|blues|swing|trumpet|saxophone|coltrane/)) return "Jazz";
  if (lower.match(/classic|beethoven|mozart|symphony|orchestra/)) return "Classical";
  if (lower.match(/soca|dancehall|caribbean|bashment|kes|machel/)) return "Soca/Dancehall";
  if (lower.match(/kpop|k-pop|bts|blackpink|stray kids|aespa|newjeans|nct/)) return "K-Pop";
  return "Pop";
}

function guessEnergyFromName(name: string, genre: string): number {
  const lower = name.toLowerCase();
  let energy = 0.6;
  if (genre === "EDM" || genre === "Hip Hop") energy = 0.8;
  if (genre === "Pop" || genre === "Latin") energy = 0.7;
  if (genre === "R&B" || genre === "Jazz") energy = 0.5;
  if (genre === "Classical") energy = 0.3;
  if (lower.match(/drop|banger|fire|hype|go|lit|turn up|remix/)) energy = Math.min(1, energy + 0.15);
  if (lower.match(/slow|chill|relax|sleep|calm|soft|sad|love song/)) energy = Math.max(0.1, energy - 0.2);
  return Math.round(energy * 100) / 100;
}

function estimateFireZone(duration: number, genre: string, energy: number): { start: number; label: string } {
  let fireZoneFraction = 0.3;
  if (genre === "EDM") fireZoneFraction = 0.33;
  if (genre === "Pop") fireZoneFraction = 0.25;
  if (genre === "Hip Hop") fireZoneFraction = 0.28;
  if (energy > 0.8) fireZoneFraction = Math.max(0.2, fireZoneFraction - 0.05);

  const start = Math.round(duration * fireZoneFraction);
  const label = energy >= 0.8 ? "The Drop 🔥" : energy >= 0.6 ? "The Hook ⚡" : "Best Part 🎵";
  return { start, label };
}

interface TrackAIAnalysis {
  genre: string;
  mood: string;
  isTrending: boolean;
  trendingReason?: string;
  bestMomentReason: string;
  bpm: number;
  key: string;
  energy: number;
  duration?: number;
}

async function checkTrendingWithSearch(songName: string): Promise<{ isTrending: boolean; evidence?: string }> {
  try {
    const query = encodeURIComponent(`${songName} billboard chart top 100 2024 2025`);
    const resp = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return { isTrending: false };
    const data = await resp.json() as { Abstract?: string; AbstractText?: string };
    const combined = ((data.Abstract || "") + " " + (data.AbstractText || "")).toLowerCase();
    const chartSignals = ["billboard", "hot 100", "chart", "#1", "number one", "grammy", "platinum", "gold", "certified", "streamed"];
    const found = chartSignals.find(k => combined.includes(k));
    if (found && combined.length > 40) {
      const excerpt = (data.AbstractText || data.Abstract || "").slice(0, 100);
      return { isTrending: true, evidence: excerpt || `Found chart signal: ${found}` };
    }
    return { isTrending: false };
  } catch {
    return { isTrending: false };
  }
}

async function analyzeTracksWithAI(fileNames: string[]): Promise<Record<string, TrackAIAnalysis>> {
  const trackList = fileNames.map((n, i) => `${i + 1}. "${n}"`).join("\n");

  const prompt = `You are DJ Jeff — an elite AI DJ with encyclopedic knowledge of global music through 2025. You know every chart, every genre scene, every trend from Lagos to London to Seoul to São Paulo.

Analyze these tracks and return a JSON object:

Tracks:
${trackList}

For each track, return:
- genre: Choose the MOST accurate genre from: Hip Hop, R&B, Pop, EDM, Afrobeats, Amapiano, Latin, Drill, Phonk, Jersey Club, K-Pop, Soca/Dancehall, Rock, Country, Jazz, Classical
- mood: (Hype / Energetic / Chill / Romantic / Melancholic / Happy / Dark / Euphoric)
- bpm: estimated BPM (integer 60-200, be specific to the genre — Amapiano ~112-114, Afrobeats ~102-115, Phonk ~130-160, Drill ~138-145, UK Garage ~130-136)
- key: musical key (e.g. "C Major", "A Minor", "F# Minor")
- energy: energy level 0.0-1.0
- isTrending: boolean — ONLY true if you have HIGH CONFIDENCE the song/artist has charted on Billboard, Spotify Global, Apple Music, or gone massively viral globally in 2022-2025. Be generous for well-known artists. False for unknown/personal recordings.
- trendingReason: concise evidence if isTrending (e.g. "Spotify Global Top 10, 2024" or "Billboard Hot 100 #1 2024"), omit or null otherwise
- bestMomentReason: short exciting description of the best part to DJ (e.g. "The iconic log drum drop at 0:52", "The Amapiano piano riff at 1:20", "That massive chorus drop")

Current 2024-2025 trending artists by genre you should know:
- Hip Hop/Rap: Kendrick Lamar, Drake, Travis Scott, Future, Gunna, Lil Baby, Playboi Carti, Sexyy Red, GloRilla
- R&B: SZA, Summer Walker, Usher, Brent Faiyaz, Chris Brown, Cardi B
- Pop: Taylor Swift, Sabrina Carpenter, Chappell Roan, Dua Lipa, Billie Eilish, Olivia Rodrigo, Ariana Grande
- EDM: Fred Again, Skrillex, Fisher, Chris Lake, Calvin Harris, David Guetta
- Afrobeats: Burna Boy, Wizkid, Asake, Rema, Tems, CKay, Davido
- Amapiano: Kabza De Small, DJ Maphorisa, Focalistic, Sun-El Musician, Vigro Deep
- Latin: Bad Bunny, Peso Pluma, Karol G, Feid, Rosalía, J Balvin, Ozuna
- Phonk: Ghostemane, Kordhell, MXDVS, 9lokknine, Soudiere
- Drill: Central Cee, Pop Smoke, Fivio Foreign, Polo G, Digga D
- K-Pop: BTS, BLACKPINK, Stray Kids, aespa, NewJeans, NCT

Return ONLY a valid JSON object:
{
  "Song Name": { "genre": "Amapiano", "mood": "Energetic", "bpm": 112, "key": "C Major", "energy": 0.8, "isTrending": true, "trendingReason": "Spotify Africa Top 10, 2024", "bestMomentReason": "The log drum bassline hits at 0:45" },
  ...
}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (e) {
    console.error("AI track analysis error:", e);
    return {};
  }
}

async function generateSetlistPlan(tracks: AnalyzedTrack[]): Promise<{ aiComment: string; vibeMessage: string; genreJourney: string[] }> {
  const trackSummary = tracks.map((t, i) =>
    `${i + 1}. "${t.name}" - ${t.genre}, ${t.bpm} BPM, energy ${Math.round(t.energy * 100)}%${t.isTrending ? ", TRENDING" : ""}`
  ).join("\n");

  const prompt = `You are DJ Jeff — a world-class AI DJ who knows global music trends from Lagos to London to Seoul. You are charismatic, confident, and genuinely hyped about music. Here is your planned setlist:

${trackSummary}

Respond with a JSON object containing:
- aiComment: 2-3 punchy, excited sentences about the energy journey of this set. Reference genres and trends (Amapiano, Afrobeats, Phonk, etc.) where relevant. Sound like a real DJ hyping the crowd, not a robot. Under 80 words.
- vibeMessage: A short DJ Jeff hype line (e.g. "Amapiano flow loading — DJ Jeff in the building!", "Genre switch incoming — keep your eyes on the wheels!"). Under 20 words.
- genreJourney: Array of genre names in order as the set flows (deduplicate consecutive same genres, include global genres like Amapiano, Afrobeats, Phonk)

Example: {"aiComment": "DJ Jeff opening with that Amapiano heat, then we ride the energy into global Hip Hop territory — the crowd won't know what hit them! This setlist flows like pure fire from start to finish.", "vibeMessage": "DJ Jeff loading the global sound system!", "genreJourney": ["Amapiano", "Hip Hop", "R&B"]}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });
    const content = resp.choices[0]?.message?.content || "{}";
    const data = JSON.parse(content);
    return {
      aiComment: data.aiComment || "This set is going to be FIRE! Let's get the crowd moving!",
      vibeMessage: data.vibeMessage || "Watch this drop! 🔥",
      genreJourney: data.genreJourney || tracks.map(t => t.genre),
    };
  } catch (e) {
    console.error("Setlist plan AI error:", e);
    return {
      aiComment: "This set is going to be FIRE! Let's get the crowd moving!",
      vibeMessage: "Watch this drop! 🔥",
      genreJourney: tracks.map(t => t.genre),
    };
  }
}

interface AudioFileMeta {
  duration: number;
  bpm: number | null;
  key: string | null;
}

async function extractAudioFileMeta(filePath: string): Promise<AudioFileMeta> {
  try {
    const meta = await mm.parseFile(filePath, { duration: true, skipCovers: true });
    const duration = meta.format.duration ?? 0;
    const bpm = meta.common.bpm ?? null;
    const key = meta.common.key ?? null;
    return { duration: Math.round(duration), bpm, key };
  } catch {
    return { duration: 0, bpm: null, key: null };
  }
}

export function registerAIDJRoutes(app: Express) {

  app.post("/api/ai-dj/analyze-tracks", upload.array("files", 50), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const fileNames = files.map(f => path.parse(f.originalname).name);

      interface ClientAudioMeta {
        duration: number;
        energy: number;
        fireZoneStart: number;
      }

      const clientAudioMetaRaw: string | undefined = (req.body as Record<string, string>).audioMeta;
      const clientAudioMeta: Array<ClientAudioMeta | null> = clientAudioMetaRaw
        ? (JSON.parse(clientAudioMetaRaw) as Array<ClientAudioMeta | null>)
        : files.map(() => null);

      const [aiData, fileMetas] = await Promise.all([
        analyzeTracksWithAI(fileNames),
        Promise.all(files.map(f => extractAudioFileMeta(f.path))),
      ]);

      const trendingVerifications = await Promise.all(
        files.map(async (f) => {
          const name = path.parse(f.originalname).name;
          return checkTrendingWithSearch(name);
        })
      );

      const analyzedTracks: AnalyzedTrack[] = files.map((f, idx) => {
        const name = path.parse(f.originalname).name;
        const ai = aiData[name] || {};
        const fileMeta = fileMetas[idx];
        const clientMeta = clientAudioMeta[idx] ?? null;
        const trendingVerified = trendingVerifications[idx];

        const genre = ai.genre || guessGenreFromName(name);
        const energy = clientMeta?.energy ?? ai.energy ?? guessEnergyFromName(name, genre);
        const duration = (clientMeta?.duration && clientMeta.duration > 0)
          ? clientMeta.duration
          : (fileMeta.duration > 0 ? fileMeta.duration : 210);
        const bpm = fileMeta.bpm ?? ai.bpm ?? (genre === "EDM" ? 128 : genre === "Hip Hop" ? 95 : genre === "Pop" ? 115 : 110);
        const key = fileMeta.key ?? ai.key ?? "C Major";

        const rawClientStart = clientMeta?.fireZoneStart;
        const clampedClientStart = (rawClientStart && rawClientStart > 0 && rawClientStart < duration * 0.95)
          ? rawClientStart
          : null;
        const fireZoneStart = clampedClientStart ?? estimateFireZone(duration, genre, energy).start;
        const isTrending = trendingVerified.isTrending || (ai.isTrending && !!trendingVerified.evidence);
        const segmentDuration = isTrending ? Math.min(90, duration - fireZoneStart) : Math.min(60, duration - fireZoneStart);
        const fireZoneEnd = Math.min(duration, fireZoneStart + Math.max(30, segmentDuration));
        const fireZoneLabel = energy >= 0.8 ? "The Drop 🔥" : energy >= 0.6 ? "The Hook ⚡" : "Best Part 🎵";

        const trendingReason = trendingVerified.evidence ?? (ai.isTrending ? ai.trendingReason : undefined);

        return {
          id: `track-${idx}-${Date.now()}`,
          name,
          bpm,
          key,
          duration,
          energy,
          genre,
          mood: ai.mood || "Energetic",
          fireZoneStart,
          fireZoneEnd,
          fireZoneLabel,
          isTrending: isTrending ?? false,
          trendingReason,
          bestMomentReason: ai.bestMomentReason || `The best part of "${name}"`,
        };
      });

      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });

      return res.json({ tracks: analyzedTracks });
    } catch (err: unknown) {
      files?.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
      console.error("Track analysis error:", err);
      const message = err instanceof Error ? err.message : "Analysis failed";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/ai-dj/build-setlist", async (req: Request, res: Response) => {
    try {
      const { tracks, vibe }: { tracks: AnalyzedTrack[]; vibe?: string } = req.body;
      if (!tracks || tracks.length === 0) {
        return res.status(400).json({ error: "No tracks provided" });
      }

      let sortedTracks = [...tracks];

      if (vibe === "chill") {
        sortedTracks.sort((a, b) => a.energy - b.energy);
      } else if (vibe === "hype") {
        sortedTracks.sort((a, b) => b.energy - a.energy);
      } else {
        const optimalOrder = buildOptimalOrder(sortedTracks);
        sortedTracks = optimalOrder.map(i => tracks[i]);
      }

      const transitions: TransitionPlan[] = [];
      for (let i = 0; i < sortedTracks.length - 1; i++) {
        const a = sortedTracks[i];
        const b = sortedTracks[i + 1];
        const params = getMixParams(a, b);

        const transitionEffects: Record<string, string> = {
          "long-blend": "Smooth crossfade",
          "quick-blend": "Filter sweep + crossfade",
          "echo-out": "Echo fade + reverb tail",
          "cut": "Hard cut with filter",
        };

        const sameGenre = a.genre === b.genre;
        const genreBridge = sameGenre
          ? `Staying in ${a.genre}`
          : `${a.genre} → ${b.genre}`;

        transitions.push({
          fromTrackId: a.id,
          toTrackId: b.id,
          fromTrack: a.name,
          toTrack: b.name,
          ...params,
          genreBridge,
          transitionEffect: transitionEffects[params.mixType] || "Crossfade",
        });
      }

      const avgBpm = Math.round(sortedTracks.reduce((s, t) => s + t.bpm, 0) / sortedTracks.length);
      const totalDuration = sortedTracks.reduce((s, t) => s + t.duration, 0);
      const energyArc = sortedTracks.map(t => Math.round(t.energy * 100));

      const genreJourneyRaw = sortedTracks.map(t => t.genre);
      const genreJourney: string[] = [genreJourneyRaw[0]];
      for (let i = 1; i < genreJourneyRaw.length; i++) {
        if (genreJourneyRaw[i] !== genreJourney[genreJourney.length - 1]) {
          genreJourney.push(genreJourneyRaw[i]);
        }
      }

      const setlistMeta = await generateSetlistPlan(sortedTracks);

      return res.json({
        tracks: sortedTracks,
        transitions,
        avgBpm,
        totalDuration,
        energyArc,
        genreJourney: setlistMeta.genreJourney.length > 0 ? setlistMeta.genreJourney : genreJourney,
        aiComment: setlistMeta.aiComment,
        vibeMessage: setlistMeta.vibeMessage,
      });
    } catch (err: unknown) {
      console.error("Build setlist error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Setlist build failed" });
    }
  });

  app.post("/api/ai-dj/dj-status", async (req: Request, res: Response) => {
    try {
      const { currentTrack, nextTrack, phase, vibe } = req.body;

      const prompts: Record<string, string> = {
        playing: `You are DJ Jeff — a charismatic world-class AI DJ. Song "${currentTrack?.name}" (${currentTrack?.genre}) is playing. Drop ONE iconic DJ Jeff status line under 10 words. Be specific to the genre (e.g. reference Amapiano piano, Afrobeats rhythm, Phonk energy, etc.)`,
        transitioning: `You are DJ Jeff. Transitioning from "${currentTrack?.name}" to "${nextTrack?.name}". ONE short hype line about this genre blend, under 12 words. Be bold!`,
        fireZone: `You are DJ Jeff. The fire zone of "${currentTrack?.name}" is coming UP. ONE explosive hype warning, under 10 words!`,
        trending: `You are DJ Jeff. "${currentTrack?.name}" is currently trending worldwide. ONE punchy line about why this track is hot right now. Under 12 words, use current slang.`,
      };

      const promptText = prompts[phase] || prompts.playing;

      const resp = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: promptText }],
        max_tokens: 50,
      });

      const message = resp.choices[0]?.message?.content?.trim() || "Feeling this vibe! 🔥";
      return res.json({ message });
    } catch (_: unknown) {
      return res.json({ message: "Let's GO! 🔥" });
    }
  });

  app.post("/api/ai-dj/analyze-playlist", async (req: Request, res: Response) => {
    try {
      const { tracks }: { tracks: TrackInfo[] } = req.body;
      if (!tracks || tracks.length === 0) {
        return res.status(400).json({ error: "No tracks provided" });
      }

      const optimalOrder = buildOptimalOrder(tracks);
      const orderedTracks = optimalOrder.map(i => tracks[i]);

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

      const trackSummary = orderedTracks.map((t, i) => `${i + 1}. "${t.name}" (${t.bpm ? Math.round(t.bpm) + "BPM" : "?"}, ${t.key || "?"}, ${t.duration ? Math.round(t.duration) + "s" : "?"})`).join("\n");
      const prompt = `You are DJ Jeff — a charismatic, globally-aware AI DJ who knows music from every corner of the world (Lagos, London, Seoul, São Paulo, Miami). Here is the playlist order you've curated:\n\n${trackSummary}\n\nIn 2-3 punchy, exciting sentences, describe the energy journey of this set for a beginner. Mention if there are global genres like Amapiano, Afrobeats, or Phonk — make it sound cool and adventurous! Give one crowd engagement tip. Simple language, no DJ jargon. Under 80 words total.`;

      const aiResp = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });
      const aiComment = aiResp.choices[0]?.message?.content?.trim() || "";

      return res.json({ optimalOrder, orderedTracks, transitions, avgBpm: Math.round(avgBpm), totalDuration, aiComment });
    } catch (err: unknown) {
      console.error("AI DJ analyze error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "Analysis failed" });
    }
  });

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

      res.write(`data: ${JSON.stringify({ type: "params", data: params })}\n\n`);

      const prompt = `You are DJ Jeff — a world-class AI DJ coaching a party beginner. The current song "${trackA || "A"}" is playing${deckABpm ? ` at ${Math.round(deckABpm)} BPM` : ""}. The next song "${trackB || "B"}"${deckBBpm ? ` is at ${Math.round(deckBBpm)} BPM` : ""}.

Mix score: ${params.score}/100. DJ Jeff recommends: ${params.mixType.replace("-", " ")}.

Tell them in 1-2 short, encouraging sentences EXACTLY what to do right now — simple actions like "slowly move the crossfader" or "wait for the beat to drop then switch". No jargon. Sound confident and supportive like a cool DJ friend. Under 40 words.`;

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
    } catch (err: unknown) {
      console.error("Transition advice error:", err);
      if (!res.headersSent) return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
      res.write(`data: ${JSON.stringify({ type: "error" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/ai-dj/vibe-tips", async (req: Request, res: Response) => {
    try {
      const { vibe, playingTracks, eventType } = req.body;

      const prompt = `You are DJ Jeff — a world-class AI DJ who knows global music trends for 2024-2025 (Amapiano, Afrobeats, Phonk, UK Drill, Latin, K-Pop and more). You're at a ${eventType || "party"} and the vibe request is: "${vibe || "keep the energy up"}". ${playingTracks ? `Songs currently playing or queued: ${playingTracks.join(", ")}.` : ""}

Give 3 short, actionable tips as DJ Jeff for what to do RIGHT NOW to nail this vibe. Be specific (e.g. "Queue an Amapiano log drum track next", "Hit the reverb FX during the breakdown"). Use emojis, sound hype and knowledgeable. Under 70 words total.`;

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
    } catch (err: unknown) {
      console.error("Vibe tips error:", err);
      if (!res.headersSent) return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
      res.write(`data: ${JSON.stringify({ type: "error" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/ai-dj/auto-mix-plan", (req: Request, res: Response) => {
    try {
      const { trackA, trackB } = req.body as { trackA: TrackInfo; trackB: TrackInfo };
      const params = getMixParams(trackA, trackB);

      const steps: { time: number; action: string; param?: any }[] = [];
      const beat = trackA.bpm ? 60000 / trackA.bpm : 500;

      if (params.rateAdjust !== 1) {
        steps.push({ time: 0, action: "setRate", param: { deck: "B", rate: params.rateAdjust } });
      }

      steps.push({ time: 0, action: "playDeck", param: { deck: "B" } });

      if (params.fxOnOut.includes("reverb")) {
        steps.push({ time: beat * 2, action: "setReverb", param: { deck: "A", amount: 0.5 } });
      }
      if (params.fxOnOut.includes("delay")) {
        steps.push({ time: beat * 2, action: "setDelay", param: { deck: "A", amount: 0.4 } });
      }

      const fadeSteps = params.blendBeats * 2;
      for (let i = 0; i <= fadeSteps; i++) {
        const t = i / fadeSteps;
        const curve = t * t * (3 - 2 * t);
        steps.push({ time: beat * (params.blendBeats / 2) + (i * (beat * params.blendBeats) / fadeSteps), action: "crossfade", param: { value: curve } });
      }

      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2), action: "pauseDeck", param: { deck: "A" } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setReverb", param: { deck: "A", amount: 0 } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setDelay", param: { deck: "A", amount: 0 } });
      steps.push({ time: beat * params.blendBeats + beat * (params.blendBeats / 2) + 200, action: "setRate", param: { deck: "B", rate: 1 } });

      return res.json({ params, steps, totalMs: beat * params.blendBeats + beat * (params.blendBeats / 2) + 500 });
    } catch (err: unknown) {
      return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
    }
  });
}
