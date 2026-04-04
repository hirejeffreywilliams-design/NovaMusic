import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Sparkles, Zap, ChevronRight, Loader2, RotateCcw, ListMusic,
  ArrowRight, CheckCircle2, Play, MessageCircle, Send, Trash2,
  Music2, Radio, Headphones, Mic2
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   Novel Feature 1: Global Trend Radar
══════════════════════════════════════════════════════════ */
const GLOBAL_TRENDS_2025 = [
  { genre: "Afrobeats", heat: 98, artist: "Burna Boy, Wizkid, Rema" },
  { genre: "Amapiano", heat: 94, artist: "Kabza De Small, Focalistic" },
  { genre: "Phonk", heat: 91, artist: "Ghostemane, Soudiere" },
  { genre: "Jersey Club", heat: 88, artist: "DJ Smallz 732, Bandmanrill" },
  { genre: "UK Drill", heat: 85, artist: "Central Cee, Headie One" },
  { genre: "Hyperpop", heat: 80, artist: "100 gecs, Charli XCX" },
  { genre: "K-Pop", heat: 77, artist: "BTS, BLACKPINK, Stray Kids" },
];

function GlobalTrendRadar() {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? GLOBAL_TRENDS_2025 : GLOBAL_TRENDS_2025.slice(0, 3);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }} data-testid="global-trend-radar">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#e879f9]" />
          <span className="text-[10px] font-black text-white/65 tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>GLOBAL TREND RADAR</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,45,120,0.15)", color: "#ff2d78", border: "1px solid rgba(255,45,120,0.2)" }}>LIVE 2025</span>
        </div>
        <ChevronRight className={`w-3 h-3 text-white/25 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      <div className="px-3 pb-2.5 space-y-1.5">
        {displayed.map((t) => (
          <div key={t.genre} className="flex items-center gap-2">
            <div className="text-[9px] font-black text-white/50 w-16 shrink-0">{t.genre}</div>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${t.heat}%`,
                  background: t.heat > 90 ? "linear-gradient(90deg,#ff2d78,#ff9500)" : t.heat > 80 ? "linear-gradient(90deg,#ffd60a,#30d158)" : "linear-gradient(90deg,#818cf8,#0af)",
                }} />
            </div>
            <span className="text-[8px] font-black text-white/25 w-5 text-right">{t.heat}</span>
          </div>
        ))}
        {expanded && (
          <p className="text-[8px] text-white/18 pt-1 italic">
            Hot right now: {GLOBAL_TRENDS_2025.find(t => t.heat > 90)?.artist}
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Novel Feature 2: Energy Curve Planner
══════════════════════════════════════════════════════════ */
function EnergyCurvePlanner({ deckABpm, deckBBpm }: { deckABpm?: number; deckBBpm?: number }) {
  const bpmA = deckABpm || 120;
  const bpmB = deckBBpm || 128;
  const avg = (bpmA + bpmB) / 2;
  const energyPct = Math.min(100, Math.round(((avg - 80) / 80) * 100));
  const label = energyPct > 80 ? "🔥 PEAK" : energyPct > 60 ? "⚡ HIGH" : energyPct > 40 ? "🌊 MID" : "🌙 CHILL";
  const color = energyPct > 80 ? "#ff453a" : energyPct > 60 ? "#ffd60a" : energyPct > 40 ? "#0af" : "#818cf8";
  return (
    <div className="px-3 py-2.5 rounded-xl space-y-2" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }} data-testid="energy-curve-planner">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-white/55 tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>⚡ ENERGY CURVE</span>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${color}1a`, color, border: `1px solid ${color}30` }}>{label}</span>
      </div>
      <div className="flex items-end gap-0.5 h-8">
        {Array.from({ length: 20 }, (_, i) => {
          const curve = i < 5 ? 0.3 + i * 0.06 : i < 12 ? 0.6 + (i - 5) * 0.04 : i < 17 ? 0.88 - (i - 12) * 0.03 : 0.73;
          const isNow = i === Math.min(19, Math.floor(energyPct / 5));
          return (
            <div key={i} className="flex-1 rounded-sm transition-all"
              style={{
                height: `${Math.round(curve * 100)}%`,
                background: isNow ? color : `${color}35`,
                boxShadow: isNow ? `0 0 6px ${color}` : "none",
              }} />
          );
        })}
      </div>
      <div className="flex justify-between text-[7px] text-white/18">
        <span>INTRO</span><span>BUILD</span><span>PEAK</span><span>DROP</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Novel Feature 3: Live Hype Score
══════════════════════════════════════════════════════════ */
function LiveHypeScore({ isAPlaying, isBPlaying, deckABpm, deckBBpm }: {
  isAPlaying: boolean; isBPlaying: boolean; deckABpm?: number; deckBBpm?: number;
}) {
  const score = useMemo(() => {
    let s = 0;
    if (isAPlaying) s += 40;
    if (isBPlaying) s += 40;
    const bpmA = deckABpm || 0;
    const bpmB = deckBBpm || 0;
    if (bpmA > 0 && bpmB > 0) {
      const diff = Math.abs(bpmA - bpmB);
      s += diff < 3 ? 20 : diff < 8 ? 10 : 0;
    }
    return Math.min(100, s);
  }, [isAPlaying, isBPlaying, deckABpm, deckBBpm]);

  const color = score >= 90 ? "#ff2d78" : score >= 70 ? "#ffd60a" : score >= 50 ? "#0af" : "rgba(255,255,255,0.25)";
  const label = score >= 90 ? "ON FIRE 🔥" : score >= 70 ? "HYPE ⚡" : score >= 50 ? "VIBING 🌊" : "STANDBY 💤";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: `${color}0d`, border: `1px solid ${color}1a` }} data-testid="live-hype-score">
      <div className="relative w-8 h-8 shrink-0">
        <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
          <circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 12 * score / 100} ${2 * Math.PI * 12 * (1 - score / 100)}`}
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dasharray 0.5s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black" style={{ color }}>{score}</span>
      </div>
      <div>
        <div className="text-[9px] font-black tracking-wider" style={{ color, fontFamily: "'Oxanium', sans-serif" }}>{label}</div>
        <div className="text-[8px] text-white/22 mt-0.5">Live hype score</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-components
══════════════════════════════════════════════════════════ */
interface TrackInfo {
  name: string;
  bpm?: number;
  key?: string;
  duration?: number;
}

interface MixParams {
  score: number;
  mixType: string;
  blendBeats: number;
  blendDuration: number;
  rateAdjust: number;
  fxOnOut: string[];
}

interface TransitionPlan {
  fromTrack: string;
  toTrack: string;
  score: number;
  mixType: string;
  blendBeats: number;
  blendDuration: number;
  rateAdjust: number;
  fxOnOut: string[];
}

interface PlaylistAnalysis {
  orderedTracks: TrackInfo[];
  transitions: TransitionPlan[];
  avgBpm: number;
  totalDuration: number;
  aiComment: string;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "#30d158" : score >= 55 ? "#ffd60a" : score >= 35 ? "#ff9500" : "#ff453a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black" style={{ color }}>{score}</span>
    </div>
  );
}

function MixTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; label: string; icon: string }> = {
    "long-blend": { bg: "#30d158", label: "Smooth Blend", icon: "🌊" },
    "quick-blend": { bg: "#0af", label: "Quick Mix", icon: "⚡" },
    "echo-out": { bg: "#ffd60a", label: "Echo Out", icon: "🔊" },
    "cut": { bg: "#ff453a", label: "Hard Cut", icon: "✂️" },
  };
  const s = styles[type] || { bg: "#bf5af2", label: type, icon: "🎵" };
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${s.bg}22`, color: s.bg, border: `1px solid ${s.bg}28` }}>
      {s.icon} {s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   DJ Jeff Chat Interface — Vertical Music AI Agent
══════════════════════════════════════════════════════════ */
const JEFF_SUGGESTED = [
  "How do I mix Amapiano into Hip Hop?",
  "What BPM should I start a party set?",
  "Explain harmonic mixing for beginners",
  "What's trending globally right now?",
  "How long should my blends be?",
  "Best way to read the crowd?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function JeffChat({ deckA, deckB }: { deckA: any; deckB: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const userMsg = text || input.trim();
    if (!userMsg || isStreaming) return;
    setInput("");

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsStreaming(true);
    abortRef.current = false;

    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const context = {
        deckA: deckA?.fileName || undefined,
        deckB: deckB?.fileName || undefined,
        bpmA: deckA?.bpm || undefined,
        bpmB: deckB?.bpm || undefined,
        keyA: deckA?.detectedKey || undefined,
        keyB: deckB?.detectedKey || undefined,
      };

      const resp = await fetch("/api/ai-dj/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");
      const dec = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        if (abortRef.current) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "text") {
              full += evt.data;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: full, streaming: true };
                return updated;
              });
            }
          } catch (_) {}
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: full, streaming: false };
        return updated;
      });
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "I hit a snag — try again! 🎵", streaming: false };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming, deckA, deckB]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="jeff-chat">
      {/* Messages */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-0.5" style={{ scrollbarWidth: "none" }}>
        {messages.length === 0 && (
          <div className="py-2">
            <p className="text-[10px] text-white/35 text-center mb-3 leading-relaxed">
              Ask me anything about music or DJing — I'm a specialist in music from every corner of the globe 🌍
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {JEFF_SUGGESTED.map((q, i) => (
                <button key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left text-[9px] px-2.5 py-2 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(232,121,249,0.07)", border: "1px solid rgba(232,121,249,0.15)", color: "rgba(232,121,249,0.7)" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78, #0af)", boxShadow: "0 0 10px rgba(191,90,242,0.4)" }}>
                DJ
              </div>
            )}
            <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
              msg.role === "user"
                ? "text-white/85 rounded-tr-sm"
                : "text-white/75 rounded-tl-sm"
            }`}
              style={msg.role === "user"
                ? { background: "rgba(191,90,242,0.2)", border: "1px solid rgba(191,90,242,0.25)" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
              }>
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm align-text-bottom animate-pulse"
                  style={{ background: "#e879f9" }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center">
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); abortRef.current = true; }}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10 shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            data-testid="button-jeff-clear-chat"
          >
            <Trash2 className="w-3 h-3 text-white/30" />
          </button>
        )}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Jeff about music or DJing..."
            disabled={isStreaming}
            className="w-full px-3 py-2 rounded-xl text-[11px] text-white/80 placeholder-white/20 outline-none transition-all pr-10"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            data-testid="input-jeff-chat"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #e879f9, #bf5af2)", boxShadow: "0 0 8px rgba(232,121,249,0.4)" }}
            data-testid="button-jeff-send"
          >
            {isStreaming ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Send className="w-3 h-3 text-white" />}
          </button>
        </div>
      </div>

      <p className="text-[8px] text-white/18 text-center italic">
        Jeff only discusses music & DJing topics — your vertical music specialist
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main AIDJAssistant Component
══════════════════════════════════════════════════════════ */
interface AIDJAssistantProps {
  deckA: { fileName: string; isPlaying: boolean; bpm?: number; key?: string; duration?: number; buffer: any; detectedKey?: string; camelotCode?: string };
  deckB: { fileName: string; isPlaying: boolean; bpm?: number; key?: string; duration?: number; buffer: any; detectedKey?: string; camelotCode?: string };
  queue: TrackInfo[];
  engine: any;
  compact?: boolean;
}

const VIBES = ["🔥 Hype It Up", "🌊 Chill Vibes", "💃 Dance Floor", "❤️ Romantic", "🎉 Party Mode", "🌙 Late Night"];
const EVENT_TYPES = ["party", "family event", "wedding", "birthday", "work event"];

type JeffMode = "home" | "playlist" | "live" | "vibe" | "chat";

export function AIDJAssistant({ deckA, deckB, queue, engine, compact = false }: AIDJAssistantProps) {
  const [mode, setMode] = useState<JeffMode>("home");
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);
  const [liveAdvice, setLiveAdvice] = useState<{ text: string; params: MixParams | null }>({ text: "", params: null });
  const [vibeText, setVibeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("party");
  const [executingMix, setExecutingMix] = useState(false);
  const [mixProgress, setMixProgress] = useState("");
  const abortRef = useRef(false);

  const analyzePlaylist = useCallback(async () => {
    if (queue.length === 0 && !deckA.fileName && !deckB.fileName) return;
    const tracks: TrackInfo[] = [];
    if (deckA.buffer) tracks.push({ name: deckA.fileName || "Track A", bpm: deckA.bpm, key: deckA.key, duration: deckA.duration });
    if (deckB.buffer) tracks.push({ name: deckB.fileName || "Track B", bpm: deckB.bpm, key: deckB.key, duration: deckB.duration });
    queue.forEach(t => { if (!tracks.find(x => x.name === t.name)) tracks.push(t); });
    if (tracks.length === 0) return;

    setLoading(true);
    setAnalysis(null);
    try {
      const resp = await fetch("/api/ai-dj/analyze-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });
      const data = await resp.json();
      setAnalysis(data);
      setMode("playlist");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [deckA, deckB, queue]);

  const getLiveAdvice = useCallback(async () => {
    abortRef.current = true;
    setLiveAdvice({ text: "", params: null });
    setMode("live");
    abortRef.current = false;

    const resp = await fetch("/api/ai-dj/transition-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackA: deckA.fileName || "Deck A",
        trackB: deckB.fileName || "Deck B",
        deckABpm: deckA.bpm,
        deckBBpm: deckB.bpm,
      }),
    });

    const reader = resp.body?.getReader();
    if (!reader) return;
    const dec = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "params") setLiveAdvice(prev => ({ ...prev, params: evt.data }));
          if (evt.type === "text") setLiveAdvice(prev => ({ ...prev, text: prev.text + evt.data }));
        } catch (_) {}
      }
    }
  }, [deckA, deckB]);

  const getVibeTips = useCallback(async () => {
    if (!selectedVibe) return;
    setVibeText("");
    setMode("vibe");

    const resp = await fetch("/api/ai-dj/vibe-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vibe: selectedVibe,
        playingTracks: [deckA.fileName, deckB.fileName].filter(Boolean),
        eventType: selectedEvent,
      }),
    });

    const reader = resp.body?.getReader();
    if (!reader) return;
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "text") setVibeText(prev => prev + evt.data);
        } catch (_) {}
      }
    }
  }, [selectedVibe, selectedEvent, deckA, deckB]);

  const executeAutoMix = useCallback(async () => {
    if (!deckA.buffer || !deckB.buffer) return;
    setExecutingMix(true);
    setMixProgress("Calculating mix...");
    try {
      const resp = await fetch("/api/ai-dj/auto-mix-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackA: { name: deckA.fileName || "A", bpm: deckA.bpm, key: deckA.key, duration: deckA.duration },
          trackB: { name: deckB.fileName || "B", bpm: deckB.bpm, key: deckB.key, duration: deckB.duration },
        }),
      });
      const { steps, totalMs } = await resp.json();
      setMixProgress("Executing mix... 🎛️");
      for (const step of steps) {
        setTimeout(() => {
          switch (step.action) {
            case "setRate": engine.setRate(step.param.deck, step.param.rate); break;
            case "playDeck": engine.playDeck(step.param.deck); break;
            case "pauseDeck": engine.pauseDeck(step.param.deck); break;
            case "crossfade": engine.updateCrossfadeAB(step.param.value); break;
            case "setReverb": engine.setReverb(step.param.deck, step.param.amount, step.param.amount > 0); break;
            case "setDelay": engine.setDelay(step.param.deck, 0.5, step.param.amount, step.param.amount > 0); break;
          }
        }, step.time);
      }
      setTimeout(() => { setExecutingMix(false); setMixProgress(""); }, totalMs + 1000);
    } catch (e) {
      setExecutingMix(false);
      setMixProgress("");
    }
  }, [deckA, deckB, engine]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const TAB_BUTTONS: { id: JeffMode; icon: React.ReactNode; label: string; color: string }[] = [
    { id: "home", icon: <Sparkles className="w-3 h-3" />, label: "Tools", color: "#e879f9" },
    { id: "chat", icon: <MessageCircle className="w-3 h-3" />, label: "Ask Jeff", color: "#0af" },
  ];

  return (
    <div className="space-y-3">
      {/* ── Jeff Header ── */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{
          background: "linear-gradient(135deg, rgba(191,90,242,0.07), rgba(0,170,255,0.05))",
          border: "1px solid rgba(191,90,242,0.2)",
          boxShadow: "0 0 30px rgba(191,90,242,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Avatar + Name + Tab bar */}
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs text-white"
              style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78, #0af)", boxShadow: "0 0 20px rgba(191,90,242,0.55)" }}>
              DJ
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#30d158] border-2 border-[#0a0519] flex items-center justify-center"
              style={{ boxShadow: "0 0 6px rgba(48,209,88,0.5)" }}>
              <span className="text-[5px]">✓</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white tracking-wide" style={{ fontFamily: "'Oxanium', sans-serif" }}>DJ JEFF</div>
            <div className="text-[9px] text-white/35 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse inline-block" />
              <span>Music Specialist · Global Trends 2025</span>
            </div>
          </div>
          {mode !== "home" && mode !== "chat" && (
            <button onClick={() => setMode("home")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
              <RotateCcw className="w-3.5 h-3.5 text-white/35" />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
          {TAB_BUTTONS.map(tab => (
            <button key={tab.id}
              onClick={() => setMode(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black transition-all"
              style={mode === tab.id
                ? { background: `${tab.color}25`, color: tab.color, border: `1px solid ${tab.color}35`, boxShadow: `0 0 10px ${tab.color}20` }
                : { background: "transparent", color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }
              }
              data-testid={`button-jeff-tab-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── HOME mode ── */}
        {mode === "home" && (
          <div className="space-y-2">
            <LiveHypeScore isAPlaying={deckA.isPlaying} isBPlaying={deckB.isPlaying} deckABpm={deckA.bpm} deckBBpm={deckB.bpm} />
            <GlobalTrendRadar />
            {(deckA.bpm || deckB.bpm) && <EnergyCurvePlanner deckABpm={deckA.bpm} deckBBpm={deckB.bpm} />}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={analyzePlaylist}
                disabled={loading || (!deckA.buffer && !deckB.buffer && queue.length === 0)}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: "rgba(48,209,88,0.07)", borderColor: "rgba(48,209,88,0.18)" }}
                data-testid="button-ai-analyze-playlist">
                {loading ? <Loader2 className="w-5 h-5 text-[#30d158] animate-spin" /> : <ListMusic className="w-5 h-5 text-[#30d158]" />}
                <div>
                  <div className="text-[11px] font-black text-[#30d158]">Smart Playlist</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Best order by AI</div>
                </div>
              </button>

              <button onClick={getLiveAdvice}
                disabled={!deckA.buffer || !deckB.buffer}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: "rgba(0,170,255,0.07)", borderColor: "rgba(0,170,255,0.18)" }}
                data-testid="button-ai-transition-advice">
                <Zap className="w-5 h-5 text-[#0af]" />
                <div>
                  <div className="text-[11px] font-black text-[#0af]">Mix Advice</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Live coaching</div>
                </div>
              </button>

              <button onClick={executeAutoMix}
                disabled={executingMix || !deckA.buffer || !deckB.buffer}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: "rgba(255,45,120,0.07)", borderColor: "rgba(255,45,120,0.18)" }}
                data-testid="button-ai-auto-mix">
                {executingMix ? <Loader2 className="w-5 h-5 text-[#ff2d78] animate-spin" /> : <Play className="w-5 h-5 text-[#ff2d78]" />}
                <div>
                  <div className="text-[11px] font-black text-[#ff2d78]">Auto Mix</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Jeff mixes for you</div>
                </div>
              </button>

              <button onClick={() => setMode("vibe")}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: "rgba(255,149,0,0.07)", borderColor: "rgba(255,149,0,0.18)" }}
                data-testid="button-ai-vibe-tips">
                <Sparkles className="w-5 h-5 text-[#ff9500]" />
                <div>
                  <div className="text-[11px] font-black text-[#ff9500]">Vibe Coach</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Tips for any mood</div>
                </div>
              </button>
            </div>

            {executingMix && mixProgress && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.2)" }}>
                <Loader2 className="w-3.5 h-3.5 text-[#ff2d78] animate-spin shrink-0" />
                <span className="text-[11px] text-[#ff2d78]">{mixProgress}</span>
              </div>
            )}

            <div className="text-[9px] text-white/18 text-center pt-0.5">Load songs to unlock mix features</div>
          </div>
        )}

        {/* ── CHAT mode ── */}
        {mode === "chat" && (
          <JeffChat deckA={deckA} deckB={deckB} />
        )}

        {/* ── PLAYLIST mode ── */}
        {mode === "playlist" && analysis && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(48,209,88,0.07)", border: "1px solid rgba(48,209,88,0.15)" }}>
              <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/60 leading-relaxed">{analysis.aiComment}</p>
            </div>
            <div className="flex gap-2 text-center">
              {[
                { v: analysis.avgBpm, l: "Avg BPM", c: "#bf5af2" },
                { v: formatDuration(analysis.totalDuration), l: "Total", c: "#0af" },
                { v: analysis.orderedTracks.length, l: "Songs", c: "#30d158" },
              ].map(({ v, l, c }) => (
                <div key={l} className="flex-1 rounded-xl py-2 px-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-sm font-black" style={{ color: c }}>{v}</div>
                  <div className="text-[8px] text-white/28">{l}</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-white/28 uppercase tracking-wider font-bold">Optimal Order</div>
            <div className="space-y-1.5">
              {analysis.orderedTracks.map((t, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                      style={{ background: "#bf5af2" }}>{i + 1}</div>
                    <span className="text-[10px] text-white/65 truncate flex-1">{t.name}</span>
                    {t.bpm && <span className="text-[9px] text-white/28 shrink-0">{Math.round(t.bpm)} BPM</span>}
                  </div>
                  {i < analysis.transitions.length && (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                      <div className="w-px h-4 ml-2.5" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="flex-1 flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-white/18" />
                        <MixTypeBadge type={analysis.transitions[i].mixType} />
                        <ScoreBar score={analysis.transitions[i].score} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE ADVICE mode ── */}
        {mode === "live" && (
          <div className="space-y-3 animate-slide-in-up">
            {liveAdvice.params && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/28 uppercase tracking-wider">Mix Score</span>
                  <MixTypeBadge type={liveAdvice.params.mixType} />
                </div>
                <ScoreBar score={liveAdvice.params.score} />
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { v: liveAdvice.params.blendBeats, l: "bars", c: "#bf5af2" },
                    { v: `${liveAdvice.params.blendDuration.toFixed(1)}s`, l: "blend", c: "#0af" },
                    { v: liveAdvice.params.rateAdjust !== 1 ? liveAdvice.params.rateAdjust.toFixed(3) : "✓", l: "speed", c: "#30d158" },
                  ].map(({ v, l, c }) => (
                    <div key={l} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="text-[11px] font-black" style={{ color: c }}>{v}</div>
                      <div className="text-[8px] text-white/25">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3 rounded-xl min-h-[60px]" style={{ background: "rgba(0,170,255,0.07)", border: "1px solid rgba(0,170,255,0.15)" }}>
              {liveAdvice.text ? (
                <p className="text-[11px] text-white/65 leading-relaxed">{liveAdvice.text}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#0af] animate-spin" />
                  <span className="text-[10px] text-white/28">Analyzing your tracks...</span>
                </div>
              )}
            </div>
            <button onClick={executeAutoMix}
              disabled={executingMix || !deckA.buffer || !deckB.buffer}
              className="w-full py-3 rounded-xl text-xs font-black text-white transition-all disabled:opacity-30 hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #ff2d78, #bf5af2)", boxShadow: "0 0 20px rgba(255,45,120,0.25)" }}
              data-testid="button-execute-auto-mix">
              {executingMix ? "⏳ Mixing..." : "🚀 Let AI Mix It For Me!"}
            </button>
          </div>
        )}

        {/* ── VIBE mode ── */}
        {mode === "vibe" && (
          <div className="space-y-3 animate-slide-in-up">
            {!vibeText && (
              <>
                <div className="text-[9px] text-white/28 uppercase tracking-wider">Choose your vibe</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIBES.map((v) => (
                    <button key={v} onClick={() => setSelectedVibe(v)}
                      className="px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all border"
                      style={{
                        background: selectedVibe === v ? "rgba(191,90,242,0.18)" : "rgba(255,255,255,0.04)",
                        borderColor: selectedVibe === v ? "rgba(191,90,242,0.38)" : "rgba(255,255,255,0.07)",
                        color: selectedVibe === v ? "#bf5af2" : "rgba(255,255,255,0.45)",
                      }}
                      data-testid={`button-vibe-${v.replace(/\s/g, '-').toLowerCase()}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {EVENT_TYPES.map((e) => (
                    <button key={e} onClick={() => setSelectedEvent(e)}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all border"
                      style={{
                        background: selectedEvent === e ? "rgba(255,149,0,0.15)" : "rgba(255,255,255,0.04)",
                        borderColor: selectedEvent === e ? "rgba(255,149,0,0.35)" : "rgba(255,255,255,0.07)",
                        color: selectedEvent === e ? "#ff9500" : "rgba(255,255,255,0.32)",
                      }}>
                      {e}
                    </button>
                  ))}
                </div>
                <button onClick={getVibeTips} disabled={!selectedVibe}
                  className="w-full py-3 rounded-xl text-xs font-black text-white transition-all disabled:opacity-30 hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, #ff9500, #ffd60a)", boxShadow: "0 0 15px rgba(255,149,0,0.25)" }}
                  data-testid="button-get-vibe-tips">
                  {selectedVibe ? `Get Tips for "${selectedVibe.split(" ").slice(1).join(" ")}"` : "Pick a vibe first"}
                </button>
              </>
            )}
            {vibeText && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl min-h-[80px]" style={{ background: "rgba(255,149,0,0.07)", border: "1px solid rgba(255,149,0,0.15)" }}>
                  <p className="text-[11px] text-white/65 leading-relaxed whitespace-pre-line">{vibeText}</p>
                </div>
                <button onClick={() => { setVibeText(""); setSelectedVibe(""); }}
                  className="w-full py-2 rounded-xl text-[10px] font-bold border transition-all hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.38)", borderColor: "rgba(255,255,255,0.09)" }}>
                  Try another vibe
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[9px] text-white/22 italic text-center px-2" data-testid="text-ai-disclaimer">
        AI suggestions are for guidance only. DJ Jeff specializes exclusively in music and DJing.
      </p>
    </div>
  );
}
