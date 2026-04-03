import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Zap, ChevronRight, Loader2, Mic2, RotateCcw, ListMusic, ArrowRight, CheckCircle2, Play, Info } from "lucide-react";

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

interface AIDJAssistantProps {
  deckA: { fileName: string; isPlaying: boolean; bpm?: number; key?: string; duration?: number; buffer: any };
  deckB: { fileName: string; isPlaying: boolean; bpm?: number; key?: string; duration?: number; buffer: any };
  queue: TrackInfo[];
  engine: any;
  compact?: boolean;
}

const VIBES = ["🔥 Hype It Up", "🌊 Chill Vibes", "💃 Dance Floor", "❤️ Romantic", "🎉 Party Mode", "🌙 Late Night"];
const EVENT_TYPES = ["party", "family event", "wedding", "birthday", "work event"];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "#30d158" : score >= 55 ? "#ffd60a" : score >= 35 ? "#ff9500" : "#ff453a";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${s.bg}25`, color: s.bg, border: `1px solid ${s.bg}30` }}>
      {s.icon} {s.label}
    </span>
  );
}

export function AIDJAssistant({ deckA, deckB, queue, engine, compact = false }: AIDJAssistantProps) {
  const [mode, setMode] = useState<"home" | "playlist" | "live" | "vibe">("home");
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);
  const [liveAdvice, setLiveAdvice] = useState<{ text: string; params: MixParams | null }>({ text: "", params: null });
  const [vibeText, setVibeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("party");
  const [executingMix, setExecutingMix] = useState(false);
  const [mixProgress, setMixProgress] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

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
    cleanup();
    setLiveAdvice({ text: "", params: null });
    setMode("live");

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
  }, [deckA, deckB, cleanup]);

  const getVibeTips = useCallback(async () => {
    if (!selectedVibe) return;
    cleanup();
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
  }, [selectedVibe, selectedEvent, deckA, deckB, cleanup]);

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

      setTimeout(() => {
        setExecutingMix(false);
        setMixProgress("");
      }, totalMs + 1000);
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

  return (
    <div className="space-y-3">
      <div
        className="glass-panel rounded-2xl p-4 space-y-3"
        style={{ borderColor: "rgba(191,90,242,0.25)", background: "linear-gradient(135deg, rgba(191,90,242,0.05), rgba(0,170,255,0.05))" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78, #0af)", boxShadow: "0 0 18px rgba(191,90,242,0.6)" }}>
              DJ
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#30d158] border-2 border-[#0a0519] flex items-center justify-center">
              <span className="text-[5px]">✓</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-white tracking-wide">DJ JEFF</div>
            <div className="text-[9px] text-white/35 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse inline-block" />
              Online · Global trends · 2024–2025
            </div>
          </div>
          {mode !== "home" && (
            <button onClick={() => setMode("home")} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <RotateCcw className="w-3.5 h-3.5 text-white/40" />
            </button>
          )}
        </div>

        {mode === "home" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={analyzePlaylist}
                disabled={loading || (!deckA.buffer && !deckB.buffer && queue.length === 0)}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30 group"
                style={{ background: "rgba(48,209,88,0.07)", borderColor: "rgba(48,209,88,0.18)" }}
                data-testid="button-ai-analyze-playlist"
              >
                {loading ? <Loader2 className="w-5 h-5 text-[#30d158] animate-spin" /> : <ListMusic className="w-5 h-5 text-[#30d158]" />}
                <div>
                  <div className="text-[11px] font-black text-[#30d158]">Smart Playlist</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Best song order by AI</div>
                </div>
              </button>

              <button
                onClick={getLiveAdvice}
                disabled={!deckA.buffer || !deckB.buffer}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: "rgba(0,170,255,0.07)", borderColor: "rgba(0,170,255,0.18)" }}
                data-testid="button-ai-transition-advice"
              >
                <Zap className="w-5 h-5 text-[#0af]" />
                <div>
                  <div className="text-[11px] font-black text-[#0af]">Mix Advice</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Live transition coaching</div>
                </div>
              </button>

              <button
                onClick={executeAutoMix}
                disabled={executingMix || !deckA.buffer || !deckB.buffer}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-30"
                style={{ background: "rgba(255,45,120,0.07)", borderColor: "rgba(255,45,120,0.18)" }}
                data-testid="button-ai-auto-mix"
              >
                {executingMix ? <Loader2 className="w-5 h-5 text-[#ff2d78] animate-spin" /> : <Play className="w-5 h-5 text-[#ff2d78]" />}
                <div>
                  <div className="text-[11px] font-black text-[#ff2d78]">Auto Mix</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">DJ Jeff mixes for you</div>
                </div>
              </button>

              <button
                onClick={() => setMode("vibe")}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: "rgba(255,149,0,0.07)", borderColor: "rgba(255,149,0,0.18)" }}
                data-testid="button-ai-vibe-tips"
              >
                <Sparkles className="w-5 h-5 text-[#ff9500]" />
                <div>
                  <div className="text-[11px] font-black text-[#ff9500]">Vibe Coach</div>
                  <div className="text-[8px] text-white/25 leading-tight mt-0.5">Tips for any mood</div>
                </div>
              </button>
            </div>
            <div className="px-2 py-1.5 rounded-lg text-[9px] text-white/20 text-center">
              Load songs to unlock all features
            </div>
          </div>
        )}

        {executingMix && mixProgress && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff2d78]/10 border border-[#ff2d78]/20">
            <Loader2 className="w-3.5 h-3.5 text-[#ff2d78] animate-spin shrink-0" />
            <span className="text-[11px] text-[#ff2d78]">{mixProgress}</span>
          </div>
        )}

        {mode === "playlist" && analysis && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#30d158]/8 border border-[#30d158]/15">
              <CheckCircle2 className="w-4 h-4 text-[#30d158] shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/60 leading-relaxed">{analysis.aiComment}</p>
            </div>

            <div className="flex gap-3 text-center">
              <div className="flex-1 glass-panel rounded-xl py-2 px-3">
                <div className="text-sm font-black text-[#bf5af2]">{analysis.avgBpm}</div>
                <div className="text-[8px] text-white/30">Avg BPM</div>
              </div>
              <div className="flex-1 glass-panel rounded-xl py-2 px-3">
                <div className="text-sm font-black text-[#0af]">{formatDuration(analysis.totalDuration)}</div>
                <div className="text-[8px] text-white/30">Total Time</div>
              </div>
              <div className="flex-1 glass-panel rounded-xl py-2 px-3">
                <div className="text-sm font-black text-[#30d158]">{analysis.orderedTracks.length}</div>
                <div className="text-[8px] text-white/30">Songs</div>
              </div>
            </div>

            <div className="text-[9px] text-white/30 uppercase tracking-wider font-bold">Optimal Order</div>
            <div className="space-y-1.5">
              {analysis.orderedTracks.map((t, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0" style={{ background: "#bf5af2" }}>{i + 1}</div>
                    <span className="text-[10px] text-white/70 truncate flex-1">{t.name}</span>
                    {t.bpm && <span className="text-[9px] text-white/30 shrink-0">{Math.round(t.bpm)} BPM</span>}
                  </div>
                  {i < analysis.transitions.length && (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <div className="w-px h-4 bg-white/10 ml-2.5" />
                      <div className="flex-1 flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-white/20" />
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

        {mode === "live" && (
          <div className="space-y-3 animate-slide-in-up">
            {liveAdvice.params && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">Mix Score</span>
                  <MixTypeBadge type={liveAdvice.params.mixType} />
                </div>
                <ScoreBar score={liveAdvice.params.score} />
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="glass-panel rounded-xl p-2">
                    <div className="text-[11px] font-black text-[#bf5af2]">{liveAdvice.params.blendBeats}</div>
                    <div className="text-[8px] text-white/25">bars to blend</div>
                  </div>
                  <div className="glass-panel rounded-xl p-2">
                    <div className="text-[11px] font-black text-[#0af]">{liveAdvice.params.blendDuration.toFixed(1)}s</div>
                    <div className="text-[8px] text-white/25">transition time</div>
                  </div>
                  <div className="glass-panel rounded-xl p-2">
                    <div className="text-[11px] font-black text-[#30d158]">{liveAdvice.params.rateAdjust !== 1 ? liveAdvice.params.rateAdjust.toFixed(3) : "✓"}</div>
                    <div className="text-[8px] text-white/25">speed adjust</div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#0af]/8 border border-[#0af]/15 min-h-[60px]">
              {liveAdvice.text ? (
                <p className="text-[11px] text-white/70 leading-relaxed">{liveAdvice.text}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#0af] animate-spin" />
                  <span className="text-[10px] text-white/30">Analyzing your tracks...</span>
                </div>
              )}
            </div>

            <button
              onClick={executeAutoMix}
              disabled={executingMix || !deckA.buffer || !deckB.buffer}
              className="w-full py-3 rounded-xl text-xs font-black text-white transition-all disabled:opacity-30 hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #ff2d78, #bf5af2)", boxShadow: "0 0 20px rgba(255,45,120,0.25)" }}
              data-testid="button-execute-auto-mix"
            >
              {executingMix ? "⏳ Mixing..." : "🚀 Let AI Mix It For Me!"}
            </button>
          </div>
        )}

        {mode === "vibe" && (
          <div className="space-y-3 animate-slide-in-up">
            {!vibeText && (
              <>
                <div className="text-[9px] text-white/30 uppercase tracking-wider">Choose your vibe</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIBES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVibe(v)}
                      className="px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all border"
                      style={{
                        background: selectedVibe === v ? "rgba(191,90,242,0.2)" : "rgba(255,255,255,0.04)",
                        borderColor: selectedVibe === v ? "rgba(191,90,242,0.4)" : "rgba(255,255,255,0.08)",
                        color: selectedVibe === v ? "#bf5af2" : "rgba(255,255,255,0.5)",
                      }}
                      data-testid={`button-vibe-${v.replace(/\s/g, '-').toLowerCase()}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  {EVENT_TYPES.map((e) => (
                    <button
                      key={e}
                      onClick={() => setSelectedEvent(e)}
                      className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all border"
                      style={{
                        background: selectedEvent === e ? "rgba(255,149,0,0.15)" : "rgba(255,255,255,0.04)",
                        borderColor: selectedEvent === e ? "rgba(255,149,0,0.35)" : "rgba(255,255,255,0.08)",
                        color: selectedEvent === e ? "#ff9500" : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <button
                  onClick={getVibeTips}
                  disabled={!selectedVibe}
                  className="w-full py-3 rounded-xl text-xs font-black text-white transition-all disabled:opacity-30 hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, #ff9500, #ffd60a)", boxShadow: "0 0 15px rgba(255,149,0,0.25)" }}
                  data-testid="button-get-vibe-tips"
                >
                  {selectedVibe ? `Get Tips for "${selectedVibe.split(" ").slice(1).join(" ")}"` : "Pick a vibe first"}
                </button>
              </>
            )}

            {vibeText && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[#ff9500]/8 border border-[#ff9500]/15 min-h-[80px]">
                  <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">{vibeText}</p>
                </div>
                <button
                  onClick={() => { setVibeText(""); setSelectedVibe(""); }}
                  className="w-full py-2 rounded-xl text-[10px] font-bold text-white/40 border border-white/10 hover:bg-white/5"
                >
                  Try another vibe
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[9px] text-white/25 italic text-center px-2" data-testid="text-ai-disclaimer">
        AI suggestions are generated automatically and are for guidance only. Always apply your own professional judgment.
      </p>
    </div>
  );
}
