import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { ArrowLeft, Play, Pause, SkipForward, Upload, Volume2, VolumeX, Sparkles, Disc3, Music, Zap } from "lucide-react";

const PARTY_COLORS = ["#ff2d78", "#ff9500", "#ffd60a", "#30d158", "#0af", "#bf5af2", "#64d2ff", "#ff453a"];

const PARTY_FX = [
  { name: "AIR HORN", emoji: "📯", freq: 400, type: "horn" as const },
  { name: "BASS DROP", emoji: "💥", freq: 60, type: "drop" as const },
  { name: "SCRATCH", emoji: "🎵", freq: 800, type: "scratch" as const },
  { name: "SIREN", emoji: "🚨", freq: 600, type: "siren" as const },
  { name: "LASER", emoji: "⚡", freq: 2000, type: "laser" as const },
  { name: "CLAP", emoji: "👏", freq: 1200, type: "clap" as const },
  { name: "WOOSH", emoji: "💨", freq: 300, type: "woosh" as const },
  { name: "YEAH!", emoji: "🎤", freq: 500, type: "vocal" as const },
  { name: "BOMB", emoji: "💣", freq: 40, type: "bomb" as const },
  { name: "RISER", emoji: "🚀", freq: 200, type: "riser" as const },
  { name: "REWIND", emoji: "⏪", freq: 1500, type: "rewind" as const },
  { name: "CROWD", emoji: "🙌", freq: 700, type: "crowd" as const },
];

function generatePartySound(ctx: AudioContext, type: string, freq: number) {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.5, now);

  switch (type) {
    case "horn": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.1);
      osc.frequency.setValueAtTime(freq * 1.5, now + 0.1);
      osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }
    case "drop": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
      osc.connect(masterGain);
      masterGain.gain.setValueAtTime(0.8, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    }
    case "scratch": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.05);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.1);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.15);
      osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
    case "siren": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.3);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.6);
      osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }
    case "laser": {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case "clap": {
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.6;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(masterGain);
      src.start(now);
      break;
    }
    case "woosh": {
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t / 0.5) * 0.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq, now);
      filter.frequency.linearRampToValueAtTime(freq * 4, now + 0.5);
      filter.Q.value = 2;
      src.connect(filter);
      filter.connect(masterGain);
      src.start(now);
      break;
    }
    case "vocal": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const formant1 = ctx.createBiquadFilter();
      formant1.type = "bandpass";
      formant1.frequency.value = 800;
      formant1.Q.value = 5;
      const formant2 = ctx.createBiquadFilter();
      formant2.type = "bandpass";
      formant2.frequency.value = 1200;
      formant2.Q.value = 5;
      osc.connect(formant1);
      osc.connect(formant2);
      formant1.connect(masterGain);
      formant2.connect(masterGain);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.2);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }
    case "bomb": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.5);
      osc.connect(masterGain);
      masterGain.gain.setValueAtTime(0.8, now);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      const noise = ctx.createBufferSource();
      const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nData.length; i++) {
        nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate * 10);
      }
      noise.buffer = nBuf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.4, now + 0.1);
      ng.gain.linearRampToValueAtTime(0, now + 0.5);
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now + 0.1);
      break;
    }
    case "riser": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 10, now + 1.5);
      osc.connect(masterGain);
      masterGain.gain.setValueAtTime(0.1, now);
      masterGain.gain.linearRampToValueAtTime(0.5, now + 1.2);
      masterGain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;
    }
    case "rewind": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    case "crowd": {
      const bufferSize = ctx.sampleRate * 1.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * 0.3 * Math.sin(Math.PI * t);
        data[i] += Math.sin(2 * Math.PI * 400 * t + Math.random() * 6.28) * 0.1 * Math.sin(Math.PI * t);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(masterGain);
      src.start(now);
      break;
    }
  }
}

export default function PartyMode() {
  const [, navigate] = useLocation();
  const engine = useAudioEngine();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [crossfade, setCrossfade] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const handleFxPad = useCallback((index: number) => {
    const fx = PARTY_FX[index];
    const ctx = getAudioCtx();
    generatePartySound(ctx, fx.type, fx.freq);
    setActivePad(index);
    setTimeout(() => setActivePad(null), 300);
  }, [getAudioCtx]);

  const handleFileA = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file, "A");
  }, [engine]);

  const handleFileB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file, "B");
  }, [engine]);

  const deckA = engine.decks.A;
  const deckB = engine.decks.B;

  return (
    <div className="min-h-screen bg-[#0a0519] flex flex-col" style={{ background: "linear-gradient(180deg, #0a0519 0%, #1a0830 50%, #0a0519 100%)" }}>
      <header className="flex items-center justify-between px-4 py-3 bg-[#0a0519]/80 backdrop-blur-xl border-b border-[#ff2d78]/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5" data-testid="button-party-back">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <Sparkles className="w-6 h-6 text-[#ff2d78]" />
          <span className="text-sm font-bold tracking-wider neon-text-pink" data-testid="text-party-title">PARTY MODE</span>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className="p-2 rounded-lg hover:bg-white/5"
          data-testid="button-mute-toggle"
        >
          {muted ? <VolumeX className="w-5 h-5 text-[#ff453a]" /> : <Volume2 className="w-5 h-5 text-[#30d158]" />}
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-3">
          <div className="deck-surface p-4 flex flex-col items-center gap-3" style={{ borderColor: "rgba(255,45,120,0.2)" }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#ff2d78] font-bold">Deck A</div>
            <div className={`w-20 h-20 rounded-full border-2 border-[#ff2d78]/30 flex items-center justify-center relative ${deckA.isPlaying ? "animate-vinyl-spin" : ""}`}
              style={{ background: "radial-gradient(circle, #1a0830 40%, #ff2d78 200%)" }}>
              <Disc3 className="w-8 h-8 text-[#ff2d78]/60" />
            </div>
            <p className="text-[10px] text-white/40 truncate max-w-full" data-testid="text-deck-a-name">{deckA.fileName || "No Track"}</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputARef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#ff2d78]/10 text-[#ff2d78] border border-[#ff2d78]/20 hover:bg-[#ff2d78]/20 transition-colors"
                data-testid="button-load-deck-a"
              >
                <Upload className="w-3 h-3 inline mr-1" />Load
              </button>
              <button
                onClick={() => deckA.isPlaying ? engine.pauseDeck("A") : engine.playDeck("A")}
                disabled={!deckA.buffer}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#ff2d78]/20 text-white border border-[#ff2d78]/30 hover:bg-[#ff2d78]/30 transition-colors disabled:opacity-30"
                data-testid="button-play-deck-a"
              >
                {deckA.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
            <input ref={fileInputARef} type="file" accept="audio/*" onChange={handleFileA} className="hidden" />
          </div>

          <div className="deck-surface p-4 flex flex-col items-center gap-3" style={{ borderColor: "rgba(0,170,255,0.2)" }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#0af] font-bold">Deck B</div>
            <div className={`w-20 h-20 rounded-full border-2 border-[#0af]/30 flex items-center justify-center relative ${deckB.isPlaying ? "animate-vinyl-spin" : ""}`}
              style={{ background: "radial-gradient(circle, #0a1530 40%, #0af 200%)" }}>
              <Disc3 className="w-8 h-8 text-[#0af]/60" />
            </div>
            <p className="text-[10px] text-white/40 truncate max-w-full" data-testid="text-deck-b-name">{deckB.fileName || "No Track"}</p>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputBRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#0af]/10 text-[#0af] border border-[#0af]/20 hover:bg-[#0af]/20 transition-colors"
                data-testid="button-load-deck-b"
              >
                <Upload className="w-3 h-3 inline mr-1" />Load
              </button>
              <button
                onClick={() => deckB.isPlaying ? engine.pauseDeck("B") : engine.playDeck("B")}
                disabled={!deckB.buffer}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#0af]/20 text-white border border-[#0af]/30 hover:bg-[#0af]/30 transition-colors disabled:opacity-30"
                data-testid="button-play-deck-b"
              >
                {deckB.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
            <input ref={fileInputBRef} type="file" accept="audio/*" onChange={handleFileB} className="hidden" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(191,90,242,0.15)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#ff2d78]/60 font-bold">A</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">Crossfade</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#0af]/60 font-bold">B</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={crossfade}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setCrossfade(v);
              engine.updateCrossfadeAB(v);
            }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer slider-neon"
            style={{ background: `linear-gradient(to right, #ff2d78, #bf5af2, #0af)` }}
            data-testid="slider-crossfade"
          />
        </div>

        <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(255,45,120,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#ffd60a]" />
            <span className="text-xs font-bold text-white/80">Sound FX Pads</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PARTY_FX.map((fx, i) => (
              <button
                key={fx.name}
                onClick={() => handleFxPad(i)}
                className={`pad-button rounded-xl p-3 flex flex-col items-center gap-1 transition-all ${
                  activePad === i ? "scale-95" : ""
                }`}
                style={{
                  background: activePad === i
                    ? `${PARTY_COLORS[i % PARTY_COLORS.length]}40`
                    : `${PARTY_COLORS[i % PARTY_COLORS.length]}15`,
                  border: `1px solid ${PARTY_COLORS[i % PARTY_COLORS.length]}${activePad === i ? "80" : "30"}`,
                  boxShadow: activePad === i ? `0 0 20px ${PARTY_COLORS[i % PARTY_COLORS.length]}40` : "none",
                }}
                data-testid={`button-fx-${fx.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
              >
                <span className="text-xl">{fx.emoji}</span>
                <span className="text-[8px] font-bold tracking-wider text-white/60">{fx.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(48,209,88,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-[#30d158]" />
            <span className="text-xs font-bold text-white/80">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (deckA.buffer) engine.playDeck("A");
                if (deckB.buffer) engine.playDeck("B");
              }}
              className="px-4 py-3 rounded-xl text-xs font-bold bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 hover:bg-[#30d158]/25 transition-all"
              data-testid="button-play-all"
            >
              Play Both
            </button>
            <button
              onClick={() => {
                engine.pauseDeck("A");
                engine.pauseDeck("B");
              }}
              className="px-4 py-3 rounded-xl text-xs font-bold bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/25 hover:bg-[#ff453a]/25 transition-all"
              data-testid="button-stop-all"
            >
              Stop All
            </button>
            <button
              onClick={() => { engine.updateCrossfadeAB(0); setCrossfade(0); }}
              className="px-4 py-3 rounded-xl text-xs font-bold bg-[#ff2d78]/15 text-[#ff2d78] border border-[#ff2d78]/25 hover:bg-[#ff2d78]/25 transition-all"
              data-testid="button-fade-to-a"
            >
              Fade to A
            </button>
            <button
              onClick={() => { engine.updateCrossfadeAB(1); setCrossfade(1); }}
              className="px-4 py-3 rounded-xl text-xs font-bold bg-[#0af]/15 text-[#0af] border border-[#0af]/25 hover:bg-[#0af]/25 transition-all"
              data-testid="button-fade-to-b"
            >
              Fade to B
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center py-3 text-white/15 text-[10px] tracking-widest uppercase">
        DJ Hybrid &middot; Party Mode
      </footer>
    </div>
  );
}
