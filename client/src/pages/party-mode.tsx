import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { Turntable } from "@/components/turntable";
import { Microphone } from "@/components/microphone";
import { BeginnerTips, TipBubble } from "@/components/beginner-tips";
import { SongQueue, QueuedSong } from "@/components/song-queue";
import { AudioOutput } from "@/components/audio-output";
import { PlatformSync } from "@/components/platform-sync";
import {
  ArrowLeft, Play, Pause, Upload, HelpCircle,
  Sparkles, Zap, ChevronRight, ChevronLeft, Settings,
} from "lucide-react";

const PARTY_COLORS = ["#ff2d78", "#ff9500", "#ffd60a", "#30d158", "#0af", "#bf5af2", "#64d2ff", "#ff453a"];

const PARTY_FX = [
  { name: "AIR HORN", emoji: "📯", freq: 400, type: "horn" as const },
  { name: "BASS DROP", emoji: "💥", freq: 60, type: "drop" as const },
  { name: "SCRATCH", emoji: "🎵", freq: 800, type: "scratch" as const },
  { name: "SIREN", emoji: "🚨", freq: 600, type: "siren" as const },
  { name: "LASER", emoji: "⚡", freq: 2000, type: "laser" as const },
  { name: "CLAP", emoji: "👏", freq: 1200, type: "clap" as const },
  { name: "WOOSH", emoji: "💨", freq: 300, type: "woosh" as const },
  { name: "YEAH!", emoji: "🤙", freq: 500, type: "vocal" as const },
  { name: "BOMB", emoji: "💣", freq: 40, type: "bomb" as const },
  { name: "RISER", emoji: "🚀", freq: 200, type: "riser" as const },
  { name: "REWIND", emoji: "⏪", freq: 1500, type: "rewind" as const },
  { name: "LET'S GO", emoji: "🙌", freq: 700, type: "crowd" as const },
];

function generatePartySound(ctx: AudioContext, type: string, freq: number) {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.5, now);

  switch (type) {
    case "horn": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.1);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now); osc.stop(now + 0.8); break;
    }
    case "drop": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.8, now); masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now); osc.stop(now + 0.6); break;
    }
    case "scratch": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.05);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.1); osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.15);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2); break;
    }
    case "siren": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.3);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.6); osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.8); osc.start(now); osc.stop(now + 0.8); break;
    }
    case "laser": {
      const osc = ctx.createOscillator(); osc.type = "square";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3); break;
    }
    case "clap": {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/ctx.sampleRate*30) * 0.6;
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(masterGain); src.start(now); break;
    }
    case "woosh": {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.sin(Math.PI * i / d.length) * 0.4;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq, now); filter.frequency.linearRampToValueAtTime(freq*4, now+0.5);
      src.connect(filter); filter.connect(masterGain); src.start(now); break;
    }
    case "vocal": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 800; f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1200; f2.Q.value = 5;
      osc.connect(f1); osc.connect(f2); f1.connect(masterGain); f2.connect(masterGain);
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq*1.2, now+0.2);
      masterGain.gain.linearRampToValueAtTime(0, now+0.4); osc.start(now); osc.stop(now+0.4); break;
    }
    case "bomb": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(freq, now+0.5);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.8, now); masterGain.gain.linearRampToValueAtTime(0, now+0.8);
      osc.start(now); osc.stop(now+0.8); break;
    }
    case "riser": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq*10, now+1.5);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.1, now);
      masterGain.gain.linearRampToValueAtTime(0.5, now+1.2); masterGain.gain.linearRampToValueAtTime(0, now+1.5);
      osc.start(now); osc.stop(now+1.5); break;
    }
    case "rewind": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.5);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now+0.5);
      osc.start(now); osc.stop(now+0.5); break;
    }
    case "crowd": {
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i/ctx.sampleRate;
        d[i] = (Math.random()*2-1)*0.3 * Math.sin(Math.PI*t) + Math.sin(2*Math.PI*400*t)*0.1*Math.sin(Math.PI*t);
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(masterGain); src.start(now); break;
    }
  }
}

type PartySection = "mix" | "fx" | "mic" | "settings";

export default function PartyMode() {
  const [, navigate] = useLocation();
  const engine = useAudioEngine();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [crossfade, setCrossfade] = useState(0.5);
  const [showTips, setShowTips] = useState(false);
  const [activeSection, setActiveSection] = useState<PartySection>("mix");
  const [padPage, setPadPage] = useState(0);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const [showFirstTimeTip, setShowFirstTimeTip] = useState(true);
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);
  const confettiIdRef = useRef(0);

  const [queueA, setQueueA] = useState<QueuedSong[]>([]);
  const [queueB, setQueueB] = useState<QueuedSong[]>([]);
  const [queueIndexA, setQueueIndexA] = useState(-1);
  const [queueIndexB, setQueueIndexB] = useState(-1);

  const prevPlayingA = useRef(false);
  const prevPlayingB = useRef(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const spawnConfetti = useCallback(() => {
    const items = Array.from({ length: 12 }, () => ({
      id: confettiIdRef.current++,
      x: Math.random() * 100,
      color: PARTY_COLORS[Math.floor(Math.random() * PARTY_COLORS.length)],
      delay: Math.random() * 0.5,
    }));
    setConfetti((c) => [...c, ...items]);
    setTimeout(() => setConfetti((c) => c.filter((i) => !items.find((ni) => ni.id === i.id))), 2000);
  }, []);

  const handleFxPad = useCallback((index: number) => {
    const fx = PARTY_FX[index];
    const ctx = getAudioCtx();
    generatePartySound(ctx, fx.type, fx.freq);
    setActivePad(index);
    if (fx.type === "drop" || fx.type === "horn" || fx.type === "crowd") spawnConfetti();
    setTimeout(() => setActivePad(null), 350);
  }, [getAudioCtx, spawnConfetti]);

  const addFilesToQueue = useCallback(
    (files: FileList, deck: "A" | "B") => {
      const audioFiles = Array.from(files).filter((f) =>
        f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i.test(f.name)
      );
      const songs: QueuedSong[] = audioFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
      }));
      if (deck === "A") {
        setQueueA((q) => [...q, ...songs]);
        if (songs.length > 0 && queueIndexA === -1) {
          engine.loadFile(songs[0].file, "A");
          setQueueIndexA(0);
          setShowFirstTimeTip(false);
        }
      } else {
        setQueueB((q) => [...q, ...songs]);
        if (songs.length > 0 && queueIndexB === -1) {
          engine.loadFile(songs[0].file, "B");
          setQueueIndexB(0);
        }
      }
    },
    [engine, queueIndexA, queueIndexB]
  );

  const loadQueueSong = useCallback(
    (song: QueuedSong, index: number, deck: "A" | "B") => {
      engine.loadFile(song.file, deck);
      if (deck === "A") setQueueIndexA(index);
      else setQueueIndexB(index);
    },
    [engine]
  );

  const reorderQueue = useCallback(
    (deck: "A" | "B", from: number, to: number) => {
      const setQ = deck === "A" ? setQueueA : setQueueB;
      setQ((q) => {
        const next = [...q];
        if (to < 0 || to >= next.length) return next;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    []
  );

  const removeFromQueue = useCallback(
    (deck: "A" | "B", index: number) => {
      const setQ = deck === "A" ? setQueueA : setQueueB;
      setQ((q) => q.filter((_, i) => i !== index));
    },
    []
  );

  useEffect(() => {
    const deckA = engine.decks.A;
    const wasPlaying = prevPlayingA.current;
    const isNowDone = wasPlaying && !deckA.isPlaying && deckA.duration > 0 &&
      Math.abs(deckA.currentTime - deckA.duration) < 0.5;
    prevPlayingA.current = deckA.isPlaying;
    if (isNowDone && queueIndexA >= 0 && queueIndexA < queueA.length - 1) {
      const next = queueIndexA + 1;
      engine.loadFile(queueA[next].file, "A");
      setQueueIndexA(next);
      setTimeout(() => engine.playDeck("A"), 300);
    }
  }, [engine.decks.A.isPlaying, engine.decks.A.currentTime, engine.decks.A.duration]);

  useEffect(() => {
    const deckB = engine.decks.B;
    const wasPlaying = prevPlayingB.current;
    const isNowDone = wasPlaying && !deckB.isPlaying && deckB.duration > 0 &&
      Math.abs(deckB.currentTime - deckB.duration) < 0.5;
    prevPlayingB.current = deckB.isPlaying;
    if (isNowDone && queueIndexB >= 0 && queueIndexB < queueB.length - 1) {
      const next = queueIndexB + 1;
      engine.loadFile(queueB[next].file, "B");
      setQueueIndexB(next);
      setTimeout(() => engine.playDeck("B"), 300);
    }
  }, [engine.decks.B.isPlaying, engine.decks.B.currentTime, engine.decks.B.duration]);

  const handleFileA = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFilesToQueue(e.target.files, "A"); }
  }, [addFilesToQueue]);

  const handleFileB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFilesToQueue(e.target.files, "B"); }
  }, [addFilesToQueue]);

  const deckA = engine.decks.A;
  const deckB = engine.decks.B;

  const padsPerPage = 8;
  const totalPages = Math.ceil(PARTY_FX.length / padsPerPage);
  const visiblePads = PARTY_FX.slice(padPage * padsPerPage, (padPage + 1) * padsPerPage);

  const sections: { id: PartySection; label: string; emoji: string }[] = [
    { id: "mix", label: "Mix", emoji: "🎛️" },
    { id: "fx", label: "Sound FX", emoji: "⚡" },
    { id: "mic", label: "Mic", emoji: "🎙️" },
    { id: "settings", label: "Setup", emoji: "⚙️" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
    >
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none z-50 w-2 h-2 rounded-full"
          style={{
            left: `${c.x}%`,
            top: "40%",
            background: c.color,
            boxShadow: `0 0 6px ${c.color}`,
            animation: `float-up 1.8s ease-out ${c.delay}s forwards`,
          }}
        />
      ))}

      {showTips && <BeginnerTips onClose={() => setShowTips(false)} />}

      <header className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-xl">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-party-back">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ffd60a]" />
          <span className="text-base font-black tracking-wider neon-text-pink" data-testid="text-party-title">PARTY MODE</span>
          <Sparkles className="w-5 h-5 text-[#ffd60a]" />
        </div>
        <button
          onClick={() => setShowTips(true)}
          className="p-2 rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/20 hover:bg-[#ffd60a]/15 transition-colors"
          data-testid="button-help"
        >
          <HelpCircle className="w-5 h-5 text-[#ffd60a]" />
        </button>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-3 pt-2 pb-4 gap-3 overflow-auto">
        {showFirstTimeTip && (
          <TipBubble text="Welcome! Tap 'Load Song' on a deck to pick music — or add a whole playlist! 🎉" />
        )}

        <div className="flex gap-3 justify-center">
          {[
            { id: "A" as const, color: "#ff2d78", fileRef: fileInputARef, onFile: handleFileA, deck: deckA, queue: queueA, queueIndex: queueIndexA },
            { id: "B" as const, color: "#0af", fileRef: fileInputBRef, onFile: handleFileB, deck: deckB, queue: queueB, queueIndex: queueIndexB },
          ].map(({ id, color, fileRef, onFile, deck, queue, queueIndex }) => (
            <div key={id} className="flex-1 glass-panel rounded-2xl p-3 flex flex-col items-center gap-2" style={{ borderColor: `${color}20` }}>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color }}>
                Deck {id}
              </div>

              <div
                className="relative cursor-pointer group"
                onClick={() => {
                  if (deck.buffer) {
                    deck.isPlaying ? engine.pauseDeck(id) : engine.playDeck(id);
                  } else {
                    fileRef.current?.click();
                  }
                }}
                data-testid={`turntable-deck-${id}`}
              >
                <Turntable isPlaying={deck.isPlaying} color={color} size={130} deckLabel={id} />
                {!deck.buffer && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-1" style={{ color }} />
                      <span className="text-[9px] text-white/50">Tap to load</span>
                    </div>
                  </div>
                )}
                {deck.buffer && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                      {deck.isPlaying
                        ? <Pause className="w-4 h-4 text-white" />
                        : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[9px] text-white/30 truncate max-w-full w-full text-center" data-testid={`text-deck-${id}-name`}>
                {deck.fileName || "No song loaded"}
              </p>
              {queue.length > 1 && (
                <p className="text-[9px] text-white/20 text-center">
                  {queueIndex + 1}/{queue.length} in playlist
                </p>
              )}

              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                  style={{ color, borderColor: `${color}30`, background: `${color}10` }}
                  data-testid={`button-load-deck-${id}`}
                >
                  Load Song
                </button>
                <button
                  onClick={() => deck.isPlaying ? engine.pauseDeck(id) : engine.playDeck(id)}
                  disabled={!deck.buffer}
                  className="px-3 py-1.5 rounded-lg text-white text-[10px] font-bold disabled:opacity-30 transition-all"
                  style={{
                    background: deck.isPlaying ? `${color}40` : color,
                    boxShadow: deck.isPlaying ? "none" : `0 0 12px ${color}50`,
                  }}
                  data-testid={`button-play-deck-${id}`}
                >
                  {deck.isPlaying ? "⏸" : "▶️"}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="audio/*" multiple onChange={onFile} className="hidden" />
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(191,90,242,0.15)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff2d78]/80">Deck A</span>
            <span className="text-[10px] text-white/30 font-medium">BLEND / MIX</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0af]/80">Deck B</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={crossfade}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setCrossfade(v);
              engine.updateCrossfadeAB(v);
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #ff2d78 ${crossfade * 100}%, #0af ${crossfade * 100}%)` }}
            data-testid="slider-crossfade"
          />
          <div className="flex justify-between mt-2">
            <button onClick={() => { engine.updateCrossfadeAB(0); setCrossfade(0); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#ff2d78]/10 text-[#ff2d78] border border-[#ff2d78]/20"
              data-testid="button-fade-to-a">← Full A</button>
            <button onClick={() => { engine.updateCrossfadeAB(0.5); setCrossfade(0.5); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 text-white/40 border border-white/10"
              data-testid="button-fade-center">Center</button>
            <button onClick={() => { engine.updateCrossfadeAB(1); setCrossfade(1); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#0af]/10 text-[#0af] border border-[#0af]/20"
              data-testid="button-fade-to-b">Full B →</button>
          </div>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
          {sections.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                activeSection === id ? "bg-[#bf5af2] text-white" : "text-white/40 hover:text-white/60"
              }`}
              style={activeSection === id ? { boxShadow: "0 0 15px rgba(191,90,242,0.4)" } : {}}
              data-testid={`tab-party-${id}`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeSection === "fx" && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ffd60a]" />
                <span className="text-sm font-bold text-white/80">Sound FX Pads</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPadPage((p) => Math.max(0, p - 1))} disabled={padPage === 0}
                  className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10" data-testid="button-pad-prev">
                  <ChevronLeft className="w-4 h-4 text-white/50" />
                </button>
                <span className="text-[10px] text-white/30">{padPage + 1}/{totalPages}</span>
                <button onClick={() => setPadPage((p) => Math.min(totalPages - 1, p + 1))} disabled={padPage === totalPages - 1}
                  className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10" data-testid="button-pad-next">
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {visiblePads.map((fx, pageIdx) => {
                const i = padPage * padsPerPage + pageIdx;
                const color = PARTY_COLORS[i % PARTY_COLORS.length];
                const isActive = activePad === i;
                return (
                  <button
                    key={fx.name}
                    onClick={() => handleFxPad(i)}
                    className="pad-button rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all active:scale-90"
                    style={{
                      background: isActive ? `${color}50` : `${color}12`,
                      border: `1.5px solid ${color}${isActive ? "90" : "28"}`,
                      boxShadow: isActive ? `0 0 25px ${color}50, 0 0 50px ${color}20` : "none",
                      minHeight: 90,
                    }}
                    data-testid={`button-fx-${fx.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                  >
                    <span className="text-2xl">{fx.emoji}</span>
                    <span className="text-[8px] font-black tracking-wider leading-tight text-center" style={{ color }}>
                      {fx.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <TipBubble text="Tap any button to fire a sound effect! Bass Drop and Air Horn work great when the beat hits! 🔥" />
          </div>
        )}

        {activeSection === "mix" && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (deckA.buffer) engine.playDeck("A"); if (deckB.buffer) engine.playDeck("B"); }}
                className="py-4 rounded-2xl text-sm font-black bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 hover:bg-[#30d158]/25 active:scale-95 transition-all"
                data-testid="button-play-all"
              >▶️ Play Both</button>
              <button
                onClick={() => { engine.pauseDeck("A"); engine.pauseDeck("B"); }}
                className="py-4 rounded-2xl text-sm font-black bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/25 hover:bg-[#ff453a]/25 active:scale-95 transition-all"
                data-testid="button-stop-all"
              >⏹ Stop All</button>
            </div>
            <div className="glass-panel rounded-2xl p-3 space-y-2" style={{ borderColor: "rgba(255,45,120,0.1)" }}>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Volume Deck A</span>
              <input type="range" min={0} max={1} step={0.01} value={deckA.volume}
                onChange={(e) => engine.setVolume("A", parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #ff2d78 ${deckA.volume*100}%, rgba(255,255,255,0.1) ${deckA.volume*100}%)` }}
                data-testid="slider-vol-a" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Volume Deck B</span>
              <input type="range" min={0} max={1} step={0.01} value={deckB.volume}
                onChange={(e) => engine.setVolume("B", parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #0af ${deckB.volume*100}%, rgba(255,255,255,0.1) ${deckB.volume*100}%)` }}
                data-testid="slider-vol-b" />
            </div>
            <SongQueue
              deckLabel="A"
              deckColor="#ff2d78"
              currentIndex={queueIndexA}
              queue={queueA}
              isPlaying={deckA.isPlaying}
              onLoadSong={(song, idx) => loadQueueSong(song, idx, "A")}
              onAddFiles={(files) => addFilesToQueue(files, "A")}
              onRemove={(idx) => removeFromQueue("A", idx)}
              onReorder={(from, to) => reorderQueue("A", from, to)}
            />
            <SongQueue
              deckLabel="B"
              deckColor="#0af"
              currentIndex={queueIndexB}
              queue={queueB}
              isPlaying={deckB.isPlaying}
              onLoadSong={(song, idx) => loadQueueSong(song, idx, "B")}
              onAddFiles={(files) => addFilesToQueue(files, "B")}
              onRemove={(idx) => removeFromQueue("B", idx)}
              onReorder={(from, to) => reorderQueue("B", from, to)}
            />
            <TipBubble text="Tip: Slide the Blend bar to mix between songs. You can also load a full playlist and it auto-advances!" />
          </div>
        )}

        {activeSection === "mic" && (
          <div className="animate-slide-in-up space-y-3">
            <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(255,45,120,0.15)" }}>
              <Microphone audioCtxGetter={engine.getCtx} masterNode={null} />
            </div>
            <TipBubble text="Turn on your mic to speak over the music! Great for hyping up the crowd or making announcements 🎙️" />
          </div>
        )}

        {activeSection === "settings" && (
          <div className="animate-slide-in-up space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 px-1">🔵 Bluetooth & Audio</h3>
              <AudioOutput audioCtxGetter={engine.getCtx} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 px-1">🎵 Music Sources</h3>
              <PlatformSync />
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-2 text-white/10 text-[9px] tracking-widest uppercase">
        DJ Hybrid &middot; Party Mode &middot; Made for Everyone
      </footer>
    </div>
  );
}
