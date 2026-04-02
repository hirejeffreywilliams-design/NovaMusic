import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Upload, Sparkles, Play, Pause, SkipForward, Shuffle, Disc3,
  Zap, TrendingUp, Flame, Music, ChevronRight, ArrowLeft,
  RefreshCw, Volume2, Mic2
} from "lucide-react";

interface AnalyzedTrack {
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
  buffer?: AudioBuffer;
  file?: File;
}

interface TransitionPlan {
  fromTrackId: string;
  toTrackId: string;
  fromTrack: string;
  toTrack: string;
  mixType: string;
  blendBeats: number;
  blendDuration: number;
  fxOnOut: string[];
  genreBridge: string;
  score: number;
  rateAdjust: number;
  transitionEffect: string;
}

interface SetlistPlan {
  tracks: AnalyzedTrack[];
  transitions: TransitionPlan[];
  totalDuration: number;
  avgBpm: number;
  genreJourney: string[];
  energyArc: number[];
  aiComment: string;
  vibeMessage: string;
}

type AppScreen = "upload" | "scanning" | "setlist" | "playing";
type VibeDial = "chill" | "party" | "hype";

const GENRE_COLORS: Record<string, string> = {
  "Hip Hop": "#ff9500",
  "R&B": "#ff2d78",
  "Pop": "#bf5af2",
  "EDM": "#0af",
  "Rock": "#ff453a",
  "Latin": "#ffd60a",
  "Country": "#30d158",
  "Jazz": "#64d2ff",
  "Afrobeats": "#ff9500",
  "Classical": "#a78bfa",
  "default": "#bf5af2",
};

const DJ_MESSAGES = [
  "I'm feeling this transition 🔥",
  "Watch this drop! 💥",
  "Genre switch incoming! 🎵",
  "This one's trending right now, let's GO! 🚀",
  "Beatmatching... locked in! ⚡",
  "Crossfade in 3... 2... 1! 🎧",
  "The crowd is going crazy! 🙌",
  "Energy at maximum! 💫",
  "Smooth like butter! 🌊",
  "This is the fire zone! 🔥",
];

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number; life: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 2.5 + 0.5,
        hue: Math.random() * 60 + 260,
        life: Math.random(),
      });
    }

    let animId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(10, 5, 25, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.003;
        p.hue += 0.3;
        if (p.y < 0 || p.life <= 0) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.life = 1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue % 360}, 100%, 70%, ${p.life * 0.5})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function SpinningRecord({ isPlaying, color = "#bf5af2", size = 160 }: { isPlaying: boolean; color?: string; size?: number }) {
  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from 0deg, #1a0a2e, #0d0620, #1a0a2e, #0d0620)`,
        boxShadow: isPlaying ? `0 0 40px ${color}60, 0 0 80px ${color}20` : `0 0 20px ${color}20`,
        animation: isPlaying ? "vinyl-spin 2s linear infinite" : "none",
        border: `3px solid ${color}40`,
      }}
    >
      {[0.8, 0.6, 0.4, 0.25].map((ratio, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * ratio,
            height: size * ratio,
            border: `1px solid ${i === 0 ? color + "30" : "rgba(255,255,255,0.05)"}`,
          }}
        />
      ))}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          background: isPlaying ? color : `${color}60`,
          boxShadow: isPlaying ? `0 0 15px ${color}` : "none",
        }}
      >
        <Disc3 className="w-4 h-4 text-white" style={{ width: size * 0.1, height: size * 0.1 }} />
      </div>
    </div>
  );
}

function WaveformBars({ energy, color, count = 20 }: { energy: number; color: string; count?: number }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 40 }} data-testid="waveform-bars">
      {Array.from({ length: count }, (_, i) => {
        const height = (0.2 + Math.random() * 0.8 * energy) * 40;
        const delay = i * 0.05;
        return (
          <div
            key={i}
            className="rounded-full flex-1"
            style={{
              height: `${height}px`,
              background: `linear-gradient(to top, ${color}, ${color}80)`,
              animation: `eq-bounce ${0.4 + Math.random() * 0.4}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              opacity: 0.7 + energy * 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

function EnergyBar({ energy, color }: { energy: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.round(energy * 100)}%`,
            background: energy >= 0.8 ? "#ff453a" : energy >= 0.6 ? "#ff9500" : energy >= 0.4 ? "#ffd60a" : "#30d158",
          }}
        />
      </div>
      <span className="text-[10px] font-black text-white/50">{Math.round(energy * 100)}%</span>
    </div>
  );
}

function ScanningAnimation({ track, index, total, done }: { track: AnalyzedTrack; index: number; total: number; done: boolean }) {
  const [phase, setPhase] = useState(0);
  const phases = ["Waveform...", "BPM Detection...", "Key Analysis...", "Genre Classification...", "Fire Zone Detection...", "Trending Check..."];

  useEffect(() => {
    if (done) { setPhase(phases.length); return; }
    const interval = setInterval(() => {
      setPhase(p => Math.min(p + 1, phases.length - 1));
    }, 350);
    return () => clearInterval(interval);
  }, [done]);

  const color = GENRE_COLORS[track.genre] || GENRE_COLORS.default;

  return (
    <div
      className="rounded-2xl p-4 border transition-all duration-500"
      style={{
        background: done ? `${color}08` : "rgba(20,10,40,0.6)",
        borderColor: done ? `${color}40` : "rgba(255,255,255,0.08)",
        boxShadow: done ? `0 0 20px ${color}15` : "none",
      }}
      data-testid={`scan-card-${index}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
            style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
          >
            {index + 1}
          </div>
          <div>
            <div className="text-sm font-bold text-white truncate max-w-[180px]" data-testid={`scan-track-name-${index}`}>{track.name}</div>
            <div className="text-[10px] text-white/40">{track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}` : "..."}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {done && track.isTrending && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#ffd60a25", color: "#ffd60a", border: "1px solid #ffd60a40" }}>
              <TrendingUp className="w-2.5 h-2.5" />TRENDING
            </span>
          )}
          {done && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}>
              {track.genre}
            </span>
          )}
        </div>
      </div>

      {!done ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[11px] text-white/50">{phases[phase]}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((phase + 1) / phases.length) * 100}%`, background: color }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-center">
            <div className="text-xs font-black" style={{ color }}>{track.bpm}</div>
            <div className="text-[9px] text-white/30">BPM</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-black" style={{ color }}>{track.key.replace(" Major", "M").replace(" Minor", "m")}</div>
            <div className="text-[9px] text-white/30">KEY</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-black" style={{ color: track.isTrending ? "#ffd60a" : "rgba(255,255,255,0.4)" }}>
              {track.isTrending ? "🔥 HOT" : track.mood}
            </div>
            <div className="text-[9px] text-white/30">{track.isTrending ? "STATUS" : "MOOD"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackCard({ track, index, transition, nextTrackGenre, isCurrentlyPlaying, onPlay }: {
  track: AnalyzedTrack;
  index: number;
  transition?: TransitionPlan;
  nextTrackGenre?: string;
  isCurrentlyPlaying: boolean;
  onPlay?: () => void;
}) {
  const color = GENRE_COLORS[track.genre] || GENRE_COLORS.default;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="relative">
      <div
        className="rounded-2xl p-4 border transition-all duration-300 cursor-pointer hover:scale-[1.01]"
        style={{
          background: isCurrentlyPlaying ? `${color}12` : "rgba(20,10,40,0.5)",
          borderColor: isCurrentlyPlaying ? `${color}60` : "rgba(255,255,255,0.06)",
          boxShadow: isCurrentlyPlaying ? `0 0 30px ${color}20, 0 0 60px ${color}08` : "none",
        }}
        onClick={onPlay}
        data-testid={`track-card-${index}`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
            >
              {isCurrentlyPlaying ? <Play className="w-3.5 h-3.5" /> : index + 1}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate" data-testid={`track-name-${index}`}>{track.name}</div>
              <div className="text-[10px] text-white/40">{formatTime(track.fireZoneStart)} Fire Zone · {formatTime(track.duration)}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {track.isTrending && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "#ffd60a20", color: "#ffd60a", border: "1px solid #ffd60a40" }} data-testid={`badge-trending-${index}`}>
                <TrendingUp className="w-2.5 h-2.5" />TRENDING
              </span>
            )}
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
              {track.genre}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>Energy</span>
            <span className="flex items-center gap-1">
              <Flame className="w-2.5 h-2.5" style={{ color }} />
              {track.fireZoneLabel}
            </span>
          </div>
          <EnergyBar energy={track.energy} color={color} />

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-mono">{track.bpm} BPM</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-mono">{track.key}</span>
            <span className="text-[9px] text-white/25 truncate flex-1">{track.bestMomentReason}</span>
          </div>
        </div>
      </div>

      {transition && (
        <div className="flex items-center gap-2 py-2 px-4">
          <div className="flex-1 border-t border-dashed border-white/10" />
          <div className="text-[9px] text-white/30 flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3 h-3" />
            <span>{transition.transitionEffect}</span>
            <span className="text-white/15">·</span>
            <span style={{ color: GENRE_COLORS[nextTrackGenre || ""] || "#bf5af2" }}>{transition.genreBridge}</span>
          </div>
          <div className="flex-1 border-t border-dashed border-white/10" />
        </div>
      )}
    </div>
  );
}

function GenreJourneyMap({ genres }: { genres: string[] }) {
  if (!genres || genres.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 border border-white/8 bg-white/3" data-testid="genre-journey">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Genre Journey</div>
      <div className="flex items-center gap-2 flex-wrap">
        {genres.map((genre, i) => {
          const color = GENRE_COLORS[genre] || GENRE_COLORS.default;
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
              >
                {genre}
              </span>
              {i < genres.length - 1 && (
                <ChevronRight className="w-3 h-3 text-white/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnergyArcChart({ energyArc, currentIndex }: { energyArc: number[]; currentIndex: number }) {
  if (!energyArc || energyArc.length === 0) return null;
  const max = Math.max(...energyArc, 1);

  return (
    <div className="rounded-2xl p-4 border border-white/8 bg-white/3" data-testid="energy-arc">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Energy Arc</div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {energyArc.map((e, i) => {
          const h = (e / max) * 48;
          const isCurrent = i === currentIndex;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: h,
                background: isCurrent ? "#bf5af2" : `rgba(191,90,242,${0.2 + (e / max) * 0.4})`,
                boxShadow: isCurrent ? "0 0 8px #bf5af2" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AIDJPage() {
  const [, navigate] = useLocation();
  const [screen, setScreen] = useState<AppScreen>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [scanningIndex, setScanningIndex] = useState(0);
  const [scannedTracks, setScannedTracks] = useState<AnalyzedTrack[]>([]);
  const [setlist, setSetlist] = useState<SetlistPlan | null>(null);
  const [vibe, setVibe] = useState<VibeDial>("party");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const setCurrentTrackIndexWithRef = useCallback((idx: number) => {
    currentTrackIndexRef.current = idx;
    setCurrentTrackIndex(idx);
  }, []);
  const [currentTime, setCurrentTime] = useState(0);
  const [aiStatus, setAiStatus] = useState("Ready to drop the beat!");
  const [djMessage, setDjMessage] = useState("Upload your music library to begin...");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cueTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const currentTrackIndexRef = useRef(0);
  const setlistRef = useRef<SetlistPlan | null>(null);
  const isPlayingRef = useRef(false);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext || AudioContext;
      audioCtxRef.current = new AudioCtx();
      const filter = audioCtxRef.current.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 20000;
      filter.Q.value = 0.5;
      filterRef.current = filter;
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.gain.value = 0.8;
      gainRef.current.connect(filter);
      filter.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  const rotateDJMessage = useCallback(() => {
    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    messageTimerRef.current = window.setInterval(() => {
      setDjMessage(DJ_MESSAGES[Math.floor(Math.random() * DJ_MESSAGES.length)]);
    }, 4000);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
  }, []);

  useEffect(() => {
    const titles: Record<typeof screen, string> = {
      upload: "AI DJ Mode - Upload Your Music | DJ Hybrid PRO",
      scanning: "Analyzing Your Tracks... | DJ Hybrid PRO",
      setlist: "Your AI-Built Setlist | DJ Hybrid PRO",
      playing: "Now Playing | DJ Hybrid PRO",
    };
    document.title = titles[screen] || "AI DJ Mode | DJ Hybrid PRO";
  }, [screen]);

  const analyzeAudioBuffer = useCallback((audioBuffer: AudioBuffer): { duration: number; energy: number; fireZoneStart: number } => {
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    const segCount = 32;
    const segSize = Math.floor(channelData.length / segCount);
    const energies: number[] = [];
    for (let i = 0; i < segCount; i++) {
      let e = 0;
      for (let j = 0; j < segSize; j++) {
        const s = channelData[i * segSize + j];
        e += s * s;
      }
      energies.push(e / segSize);
    }

    const maxE = Math.max(...energies, 1e-10);
    const norm = energies.map(e => e / maxE);
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const normalizedAvg = Math.min(1, Math.sqrt(avgEnergy / (maxE * 0.5)));

    let maxJump = 0;
    let dropSeg = Math.floor(segCount * 0.3);
    for (let i = 1; i < norm.length; i++) {
      const jump = norm[i] - norm[i - 1];
      if (jump > maxJump && i > 2) {
        maxJump = jump;
        dropSeg = i;
      }
    }

    const fireZoneStart = Math.round((dropSeg / segCount) * duration);
    const clampedFireZone = Math.max(5, Math.min(fireZoneStart, duration * 0.8));

    return {
      duration,
      energy: Math.round(Math.min(1, normalizedAvg + 0.2) * 100) / 100,
      fireZoneStart: Math.round(clampedFireZone),
    };
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const audioFiles = files.filter(f => f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(f.name));
    if (audioFiles.length === 0) return;

    setUploadedFiles(audioFiles);
    setScreen("scanning");
    setScanError(null);
    setScannedTracks([]);
    setScanningIndex(0);

    const formData = new FormData();
    audioFiles.forEach(f => formData.append("files", f));

    const clientAnalyses = await Promise.all(
      audioFiles.map(async (file) => {
        try {
          const arrayBuf = await file.arrayBuffer();
          const tempCtx = new AudioContext();
          try {
            const decoded = await tempCtx.decodeAudioData(arrayBuf);
            const result = analyzeAudioBuffer(decoded);
            await tempCtx.close();
            return result;
          } catch (_) {
            await tempCtx.close();
            return null;
          }
        } catch (_) {
          return null;
        }
      })
    );

    formData.append("audioMeta", JSON.stringify(clientAnalyses));

    try {
      const resp = await fetch("/api/ai-dj/analyze-tracks", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Analysis failed");
      const data = await resp.json();

      const analyzedWithFiles = data.tracks.map((t: AnalyzedTrack, i: number) => {
        const clientData = clientAnalyses[i];
        return {
          ...t,
          ...(clientData ? {
            duration: clientData.duration,
            energy: clientData.energy,
            fireZoneStart: clientData.fireZoneStart,
          } : {}),
          file: audioFiles[i],
        };
      });

      setScannedTracks([analyzedWithFiles[0]]);
      setScanningIndex(0);

      let revealIdx = 1;
      const interval = setInterval(() => {
        if (revealIdx < analyzedWithFiles.length) {
          setScannedTracks(prev => [...prev, analyzedWithFiles[revealIdx]]);
          setScanningIndex(revealIdx);
          revealIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setScannedTracks(analyzedWithFiles);
            setScanningIndex(analyzedWithFiles.length - 1);
            buildSetlist(analyzedWithFiles, vibe);
          }, 800);
        }
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      setScanError("Hmm, something went wrong. Please try again.");
    }
  }, [vibe, analyzeAudioBuffer]);

  const buildSetlist = useCallback(async (tracks: AnalyzedTrack[], currentVibe: VibeDial) => {
    setIsBuilding(true);
    try {
      const resp = await fetch("/api/ai-dj/build-setlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks, vibe: currentVibe }),
      });
      const data = await resp.json();

      const tracksWithFiles = data.tracks.map((t: AnalyzedTrack) => {
        const original = tracks.find(f => f.name === t.name);
        return { ...t, file: original?.file };
      });

      const newSetlist = { ...data, tracks: tracksWithFiles };
      setlistRef.current = newSetlist;
      setSetlist(newSetlist);
      setScreen("setlist");
      setDjMessage(data.vibeMessage || "Your set is READY! Let's GO! 🔥");
    } catch (err) {
      console.error(err);
      setScanError("Couldn't build setlist. Please try again.");
    } finally {
      setIsBuilding(false);
    }
  }, []);

  const loadAndPlayTrack = useCallback(async (track: AnalyzedTrack, startAtFireZone = true) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();

    if (sourceRef.current) {
      sourceRef.current.onended = null;
      try { sourceRef.current.stop(); } catch (_) {}
      sourceRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null; }

    if (!track.file) {
      setAiStatus("Track not available");
      return;
    }

    try {
      const arrayBuffer = await track.file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainRef.current!);

      const startOffset = startAtFireZone ? Math.min(track.fireZoneStart, audioBuffer.duration * 0.9) : 0;
      const segmentEnd = (track.fireZoneEnd && track.fireZoneEnd > startOffset)
        ? Math.min(track.fireZoneEnd, audioBuffer.duration)
        : audioBuffer.duration;
      const segmentDuration = Math.max(10, segmentEnd - startOffset);

      startTimeRef.current = ctx.currentTime;
      offsetRef.current = startOffset;

      source.start(0, startOffset, segmentDuration);
      sourceRef.current = source;
      isPlayingRef.current = true;

      timerRef.current = window.setInterval(() => {
        const c = audioCtxRef.current;
        if (!c) return;
        const elapsed = c.currentTime - startTimeRef.current;
        setCurrentTime(offsetRef.current + elapsed);
      }, 100);

      const executeOutgoingFade = (blendSecs: number, mixType: string, fxOnOut: string[]) => {
        const c = audioCtxRef.current;
        const g = gainRef.current;
        const f = filterRef.current;
        if (!c) return;
        const now = c.currentTime;

        if (mixType === "cut" || fxOnOut.includes("scratch")) {
          const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
          const noiseSource = c.createBufferSource();
          noiseSource.buffer = buf;
          const scratchFilter = c.createBiquadFilter();
          scratchFilter.type = "bandpass";
          scratchFilter.frequency.setValueAtTime(3000, now);
          scratchFilter.frequency.linearRampToValueAtTime(400, now + 0.25);
          scratchFilter.Q.value = 4;
          const scratchGain = c.createGain();
          scratchGain.gain.setValueAtTime(0.35, now);
          scratchGain.gain.linearRampToValueAtTime(0, now + 0.25);
          noiseSource.connect(scratchFilter);
          scratchFilter.connect(scratchGain);
          scratchGain.connect(c.destination);
          noiseSource.start(now);
        }

        if (fxOnOut.includes("reverb") && mixType !== "cut") {
          const riserOsc = c.createOscillator();
          riserOsc.type = "sawtooth";
          riserOsc.frequency.setValueAtTime(80, now);
          riserOsc.frequency.exponentialRampToValueAtTime(220, now + blendSecs * 0.5);
          const riserGain = c.createGain();
          riserGain.gain.setValueAtTime(0.05, now);
          riserGain.gain.linearRampToValueAtTime(0.15, now + blendSecs * 0.4);
          riserGain.gain.linearRampToValueAtTime(0, now + blendSecs * 0.6);
          riserOsc.connect(riserGain);
          riserGain.connect(c.destination);
          riserOsc.start(now);
          riserOsc.stop(now + blendSecs * 0.7);
        }

        if (g) {
          if (mixType === "cut") {
            g.gain.setValueAtTime(0, now);
          } else if (mixType === "echo-out" && f) {
            f.type = "highpass";
            f.frequency.setValueAtTime(20, now);
            f.frequency.exponentialRampToValueAtTime(800, now + blendSecs * 0.7);
            g.gain.setValueAtTime(0.8, now);
            g.gain.linearRampToValueAtTime(0, now + blendSecs);
          } else if (mixType === "long-blend") {
            g.gain.setValueAtTime(0.8, now);
            g.gain.linearRampToValueAtTime(0, now + blendSecs);
          } else {
            g.gain.setValueAtTime(0.8, now);
            g.gain.linearRampToValueAtTime(0, now + Math.min(1.5, blendSecs));
          }
        }
      };

      const advanceToNext = (nextIdx: number, nextTrack: AnalyzedTrack) => {
        const c2 = audioCtxRef.current;
        const g2 = gainRef.current;
        const f2 = filterRef.current;
        if (g2 && c2) {
          g2.gain.cancelScheduledValues(c2.currentTime);
          g2.gain.setValueAtTime(0.8, c2.currentTime);
        }
        if (f2) {
          f2.type = "lowpass";
          f2.frequency.cancelScheduledValues(c2?.currentTime || 0);
          f2.frequency.setValueAtTime(20000, c2?.currentTime || 0);
        }
        currentTrackIndexRef.current = nextIdx;
        setCurrentTrackIndex(nextIdx);
        setCurrentTime(0);
        setIsTransitioning(false);
        setAiStatus(`Fire Zone: ${nextTrack.fireZoneLabel}`);
        loadAndPlayTrack(nextTrack, true);
      };

      const sl = setlistRef.current;
      if (sl && sl.tracks.length > 1) {
        const curIdxAtLoad = currentTrackIndexRef.current;
        const nextIdxAtLoad = curIdxAtLoad + 1;
        const hasNextAtLoad = nextIdxAtLoad < sl.tracks.length;

        if (hasNextAtLoad) {
          const transitionAtLoad = sl.transitions[curIdxAtLoad];
          const blendSecsAtLoad = Math.min(4, Math.max(0.8, (transitionAtLoad?.blendDuration || 2)));
          const cueMs = Math.max(100, (segmentDuration - blendSecsAtLoad) * 1000);

          const transitionMessages: Record<string, string> = {
            "long-blend": "Smooth blend dropping in... 🌊",
            "quick-blend": "Quick cut, new vibe incoming! ⚡",
            "echo-out": "Echo fading out... reverb washing in 🌀",
            "cut": "Hard cut! 🔪 Drop incoming!",
          };

          cueTimerRef.current = window.setTimeout(() => {
            if (!isPlayingRef.current) return;
            cueTimerRef.current = null;
            const sl2 = setlistRef.current;
            if (!sl2) return;
            const curIdxNow = currentTrackIndexRef.current;
            const nextIdxNow = curIdxNow + 1;
            if (nextIdxNow >= sl2.tracks.length) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              setAiStatus("Set complete! What a night! 🎉");
              setDjMessage("That's a wrap! The crowd loved every second! 🎉");
              return;
            }
            const nextTrack = sl2.tracks[nextIdxNow];
            if (!nextTrack) return;
            const transition2 = sl2.transitions[curIdxNow];
            const mixType2 = transition2?.mixType || "quick-blend";
            const blendSecs2 = Math.min(4, Math.max(0.8, (transition2?.blendDuration || 2)));
            const fxOnOut2 = transition2?.fxOnOut || [];
            setIsTransitioning(true);
            setAiStatus(`Transitioning to: ${nextTrack.name}`);
            setDjMessage(transitionMessages[mixType2] || "Smooth transition incoming! ⚡");
            executeOutgoingFade(blendSecs2, mixType2, fxOnOut2);
            const advanceDelay = mixType2 === "cut" ? 100 : blendSecs2 * 1000;
            setTimeout(() => {
              if (!isPlayingRef.current) return;
              advanceToNext(nextIdxNow, nextTrack);
            }, advanceDelay);
          }, cueMs);
        }
      }

      source.onended = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (cueTimerRef.current) {
          clearTimeout(cueTimerRef.current);
          cueTimerRef.current = null;
        }
        if (!isPlayingRef.current) return;
        const sl2 = setlistRef.current;
        if (!sl2) return;
        const curIdx = currentTrackIndexRef.current;
        const nextIdx = curIdx + 1;
        if (nextIdx >= sl2.tracks.length) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setAiStatus("Set complete! What a night! 🎉");
          setDjMessage("That's a wrap! The crowd loved every second! 🎉");
          return;
        }
        const nextTrack = sl2.tracks[nextIdx];
        const transition = sl2.transitions[curIdx];
        const mixType = transition?.mixType || "quick-blend";
        const blendSecs = Math.min(4, Math.max(0.8, (transition?.blendDuration || 2)));
        const fxOnOut = transition?.fxOnOut || [];
        setIsTransitioning(true);
        executeOutgoingFade(blendSecs, mixType, fxOnOut);
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          advanceToNext(nextIdx, nextTrack);
        }, mixType === "cut" ? 100 : blendSecs * 1000);
      };

      setIsPlaying(true);
    } catch (err) {
      console.error("Audio decode error:", err);
      setAiStatus("Couldn't load audio file");
    }
  }, [getCtx]);

  const startDJSet = useCallback(async (fromIndex: number = 0) => {
    const sl = setlistRef.current || setlist;
    if (!sl) return;
    setlistRef.current = sl;
    const safeIndex = Number.isFinite(fromIndex) ? fromIndex : 0;
    const startIdx = Math.max(0, Math.min(safeIndex, sl.tracks.length - 1));
    if (!sl.tracks[startIdx]) return;
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; sourceRef.current.stop(); } catch (_) {}
      sourceRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null; }
    setScreen("playing");
    currentTrackIndexRef.current = startIdx;
    setCurrentTrackIndex(startIdx);
    setCurrentTime(0);
    rotateDJMessage();

    const track = sl.tracks[startIdx];
    setAiStatus(`Starting from Fire Zone: ${track.fireZoneLabel}`);
    await loadAndPlayTrack(track, true);
    setDjMessage(`Starting from the ${track.fireZoneLabel} — crowd approved! 🔥`);
  }, [setlist, loadAndPlayTrack, rotateDJMessage]);

  const skipTrack = useCallback(async () => {
    const sl = setlistRef.current;
    if (!sl) return;
    const nextIndex = currentTrackIndexRef.current + 1;
    if (nextIndex >= sl.tracks.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setAiStatus("Set complete! What a night! 🎉");
      setDjMessage("That's a wrap! The crowd wants more — hit Surprise Me!");
      return;
    }

    setIsTransitioning(true);
    setAiStatus("Skipping...");
    setDjMessage("Smooth transition incoming! ⚡");

    if (sourceRef.current) {
      try { sourceRef.current.onended = null; sourceRef.current.stop(); } catch (_) {}
      sourceRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null; }

    const ctx = getCtx();
    if (gainRef.current) {
      gainRef.current.gain.setValueAtTime(0.8, ctx.currentTime);
      gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    }

    setTimeout(async () => {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setValueAtTime(0.8, audioCtxRef.current.currentTime);
      }
      currentTrackIndexRef.current = nextIndex;
      setCurrentTrackIndex(nextIndex);
      setCurrentTime(0);
      setIsTransitioning(false);
      const next = sl.tracks[nextIndex];
      setAiStatus(`Fire Zone: ${next.fireZoneLabel}`);
      await loadAndPlayTrack(next, true);
    }, 1300);
  }, [getCtx, loadAndPlayTrack]);

  const pauseResume = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (isPlaying) {
      offsetRef.current += ctx.currentTime - startTimeRef.current;
      if (timerRef.current) clearInterval(timerRef.current);
      isPlayingRef.current = false;
      await ctx.suspend();
      setIsPlaying(false);
      setAiStatus("Paused ⏸");
      if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    } else {
      isPlayingRef.current = true;
      await ctx.resume();
      startTimeRef.current = ctx.currentTime;
      timerRef.current = window.setInterval(() => {
        const elapsed = ctx.currentTime - startTimeRef.current;
        setCurrentTime(offsetRef.current + elapsed);
      }, 100);
      setIsPlaying(true);
      setAiStatus("Back in action! 🔥");
      rotateDJMessage();
    }
  }, [isPlaying, rotateDJMessage]);

  const shuffleSet = useCallback(async () => {
    if (!scannedTracks.length) return;
    setScreen("scanning");
    setDjMessage("Reshuffling the vibe... 🎲");
    await buildSetlist(scannedTracks, vibe);
  }, [scannedTracks, vibe, buildSetlist]);

  const handleVibeDial = useCallback(async (newVibe: VibeDial) => {
    setVibe(newVibe);
    if (scannedTracks.length > 0 && screen === "setlist") {
      await buildSetlist(scannedTracks, newVibe);
    }
  }, [scannedTracks, screen, buildSetlist]);

  const currentTrack = setlist?.tracks[currentTrackIndex];
  const currentColor = currentTrack ? (GENRE_COLORS[currentTrack.genre] || "#bf5af2") : "#bf5af2";

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#0a0519] relative overflow-hidden">
      <ParticleBackground />

      <div className="fixed inset-0 z-0 opacity-20" style={{
        background: "radial-gradient(ellipse at 30% 30%, rgba(191,90,242,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(0,170,255,0.15) 0%, transparent 50%)"
      }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
            <div className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-[#bf5af2] animate-vinyl-spin" />
              <span className="text-sm font-black tracking-wider neon-text-purple">AI DJ</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffd60a]" />
            <span className="text-[11px] text-white/40 hidden sm:block">Powered by AI</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">

          {screen === "upload" && (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
              <div className="text-center max-w-lg mb-10 animate-slide-in-up">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #bf5af2, #0af)", boxShadow: "0 0 40px rgba(191,90,242,0.4)" }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-3 text-white">
                  Your AI DJ <span className="neon-text-purple">is Ready</span>
                </h1>
                <p className="text-white/50 text-base mb-2">Upload your music library and the AI handles everything —</p>
                <p className="text-white/40 text-sm">analyzing songs, finding the best moments, planning the perfect set, and mixing automatically.</p>
              </div>

              <div
                className={`w-full max-w-lg rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${dragOver ? "border-[#bf5af2] bg-[#bf5af2]/10 scale-[1.02]" : "border-white/15 hover:border-[#bf5af2]/50 hover:bg-white/3"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-dropzone"
              >
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all ${dragOver ? "scale-110" : ""}`}
                    style={{ background: dragOver ? "rgba(191,90,242,0.3)" : "rgba(191,90,242,0.1)", border: "1px solid rgba(191,90,242,0.3)" }}>
                    <Upload className="w-9 h-9" style={{ color: dragOver ? "#bf5af2" : "rgba(255,255,255,0.3)" }} />
                  </div>
                  <p className="text-lg font-bold text-white mb-1">{dragOver ? "Drop it like it's hot! 🔥" : "Drag & Drop Your Songs"}</p>
                  <button
                    className="text-sm px-5 py-2 rounded-full font-bold mb-4 transition-all hover:scale-105"
                    style={{ background: "rgba(191,90,242,0.15)", border: "1px solid rgba(191,90,242,0.4)", color: "#bf5af2" }}
                    data-testid="button-upload-files"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Browse Files
                  </button>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {["MP3", "WAV", "FLAC", "AAC", "OGG"].map(fmt => (
                      <span key={fmt} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/30 font-mono">{fmt}</span>
                    ))}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a"
                  multiple
                  onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg w-full">
                {[
                  { icon: Flame, label: "Fire Zone", desc: "AI finds the best part", color: "#ff9500" },
                  { icon: TrendingUp, label: "Trending", desc: "Spots hot songs", color: "#ffd60a" },
                  { icon: Zap, label: "Auto Mix", desc: "Seamless transitions", color: "#bf5af2" },
                ].map(({ icon: Icon, label, desc, color }) => (
                  <div key={label} className="rounded-2xl p-3 border border-white/6 bg-white/3 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
                    <div className="text-xs font-bold text-white mb-0.5">{label}</div>
                    <div className="text-[10px] text-white/35">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {screen === "scanning" && (
            <div className="max-w-lg mx-auto px-4 py-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#bf5af2] animate-pulse" />
                  <span className="text-sm font-black uppercase tracking-widest text-[#bf5af2]">AI Scanning Library</span>
                  <div className="w-2 h-2 rounded-full bg-[#bf5af2] animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-white mb-1">Analyzing Your Music</h2>
                <p className="text-white/40 text-sm">
                  {isBuilding ? "Building your perfect setlist..." : `${Math.min(scanningIndex + 1, uploadedFiles.length)} of ${uploadedFiles.length} tracks scanned`}
                </p>
              </div>

              {scanError && (
                <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center mb-4">
                  {scanError}
                  <button className="ml-2 underline" onClick={() => setScreen("upload")}>Try again</button>
                </div>
              )}

              <div className="space-y-3">
                {uploadedFiles.map((file, idx) => {
                  const analyzed = scannedTracks[idx];
                  const isDone = idx <= scanningIndex && analyzed;
                  const placeholder: AnalyzedTrack = analyzed || {
                    id: `placeholder-${idx}`,
                    name: file.name.replace(/\.(mp3|wav|flac|ogg|aac|m4a)$/i, ""),
                    bpm: 120,
                    key: "C Major",
                    duration: 210,
                    energy: 0.7,
                    genre: "Pop",
                    mood: "Energetic",
                    fireZoneStart: 60,
                    fireZoneLabel: "The Hook",
                    isTrending: false,
                    bestMomentReason: "Best moment",
                  };
                  return (
                    <ScanningAnimation
                      key={idx}
                      track={placeholder}
                      index={idx}
                      total={uploadedFiles.length}
                      done={!!isDone}
                    />
                  );
                })}
              </div>

              {isBuilding && (
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-[#bf5af2]">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI is building your perfect setlist...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {screen === "setlist" && setlist && (
            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3" style={{ background: "rgba(191,90,242,0.15)", border: "1px solid rgba(191,90,242,0.3)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#bf5af2]" />
                  <span className="text-xs font-black text-[#bf5af2] uppercase tracking-wider">Set Ready</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Your AI Set 🔥</h2>
                <p className="text-white/50 text-sm max-w-xs mx-auto">{setlist.aiComment}</p>
              </div>

              <div className="rounded-2xl p-4 border border-white/6 bg-white/3 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#ffd60a] mt-0.5 shrink-0" />
                <p className="text-sm text-white/70 italic">"{djMessage}"</p>
              </div>

              <div className="rounded-2xl p-3 border border-white/6 bg-white/3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/40">Vibe Dial</span>
                  <span className="text-[10px] text-white/30">Affects set order & energy</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([["chill", "🌊 Chill", "#0af"], ["party", "🎉 Party", "#bf5af2"], ["hype", "🔥 Hype", "#ff453a"]] as const).map(([v, label, color]) => (
                    <button
                      key={v}
                      onClick={() => handleVibeDial(v)}
                      className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: vibe === v ? `${color}25` : "rgba(255,255,255,0.04)",
                        color: vibe === v ? color : "rgba(255,255,255,0.4)",
                        border: `1px solid ${vibe === v ? color + "50" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: vibe === v ? `0 0 12px ${color}30` : "none",
                      }}
                      data-testid={`vibe-${v}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  [`${setlist.tracks.length}`, "Tracks"],
                  [`${Math.floor(setlist.totalDuration / 60)}m`, "Duration"],
                  [`${setlist.avgBpm}`, "Avg BPM"],
                  [`${setlist.tracks.filter(t => t.isTrending).length}`, "Trending"],
                ].map(([val, label]) => (
                  <div key={label} className="rounded-xl p-3 bg-white/3 border border-white/6">
                    <div className="text-lg font-black text-white">{val}</div>
                    <div className="text-[10px] text-white/30">{label}</div>
                  </div>
                ))}
              </div>

              <GenreJourneyMap genres={setlist.genreJourney} />
              <EnergyArcChart energyArc={setlist.energyArc} currentIndex={-1} />

              <div className="space-y-0">
                {setlist.tracks.map((track, i) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={i}
                    transition={setlist.transitions[i]}
                    nextTrackGenre={setlist.tracks[i + 1]?.genre}
                    isCurrentlyPlaying={false}
                    onPlay={() => startDJSet(i)}
                  />
                ))}
              </div>

              <div className="sticky bottom-4 flex gap-3 pt-2">
                <button
                  onClick={shuffleSet}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  data-testid="button-surprise-me"
                >
                  <Shuffle className="w-4 h-4" />
                  Surprise Me
                </button>
                <button
                  onClick={() => startDJSet(0)}
                  className="flex-[2] py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #bf5af2, #0af)",
                    boxShadow: "0 0 30px rgba(191,90,242,0.4), 0 0 60px rgba(0,170,255,0.1)",
                  }}
                  data-testid="button-let-ai-dj"
                >
                  <Sparkles className="w-5 h-5" />
                  Let AI DJ
                </button>
              </div>

              <div className="pb-8">
                <button
                  onClick={() => { setScreen("upload"); setUploadedFiles([]); setScannedTracks([]); setSetlist(null); }}
                  className="w-full py-2 text-xs text-white/25 hover:text-white/40 transition-colors"
                  data-testid="button-upload-new"
                >
                  Upload different songs
                </button>
              </div>
            </div>
          )}

          {screen === "playing" && setlist && currentTrack && (
            <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
              <div className="text-center py-4">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-black animate-pulse"
                  style={{ background: `${currentColor}20`, color: currentColor, border: `1px solid ${currentColor}40` }}
                  data-testid="ai-status-ticker"
                >
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: currentColor }} />
                  {aiStatus}
                </div>

                <div className="flex justify-center mb-5">
                  <SpinningRecord isPlaying={isPlaying && !isTransitioning} color={currentColor} size={160} />
                </div>

                <div className="mb-1">
                  <h2 className="text-xl font-black text-white truncate" data-testid="now-playing-title">{currentTrack.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${currentColor}20`, color: currentColor, border: `1px solid ${currentColor}30` }}>
                      {currentTrack.genre}
                    </span>
                    {currentTrack.isTrending && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5" style={{ background: "#ffd60a20", color: "#ffd60a", border: "1px solid #ffd60a40" }} data-testid="badge-now-playing-trending">
                        <TrendingUp className="w-2.5 h-2.5" />Trending
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-white/40 mt-1 font-mono">{formatTime(currentTime)} · Fire Zone: {currentTrack.fireZoneLabel}</div>
              </div>

              <div className="rounded-2xl p-4 border bg-white/3" style={{ borderColor: `${currentColor}20` }}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Live Waveform</span>
                  <span className="text-[10px] text-white/30">{Math.round(currentTrack.energy * 100)}% Energy</span>
                </div>
                <WaveformBars energy={isPlaying ? currentTrack.energy : 0.1} color={currentColor} count={24} />
              </div>

              <div className="rounded-2xl p-3 border border-white/6 bg-white/3 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-[#ffd60a] shrink-0" />
                <p className="text-sm text-white/60 italic" data-testid="dj-persona-message">"{djMessage}"</p>
              </div>

              <div className="rounded-2xl p-3 border border-white/6 bg-white/3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Live Vibe</span>
                  <span className="text-[10px] text-white/20">Rebuilds remaining set</span>
                </div>
                <div className="flex gap-2">
                  {([["chill", "🌊", "#0af"], ["party", "🎉", "#bf5af2"], ["hype", "🔥", "#ff453a"]] as const).map(([v, emoji, color]) => (
                    <button
                      key={v}
                      onClick={async () => {
                        if (vibe === v) return;
                        setVibe(v);
                        setDjMessage(`Shifting vibe to ${v}... rebuilding the rest of your set! 🎛️`);
                        const sl = setlistRef.current;
                        const curIdx = currentTrackIndexRef.current;
                        const allTracks = sl ? sl.tracks : scannedTracks;
                        const remaining = allTracks.slice(curIdx + 1);
                        const tracksToRebuild = remaining.length >= 2 ? remaining : allTracks;
                        try {
                          const resp = await fetch("/api/ai-dj/build-setlist", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tracks: tracksToRebuild, vibe: v }),
                          });
                          const data = await resp.json();
                          const tracksWithFiles = data.tracks.map((t: AnalyzedTrack) => {
                            const original = tracksToRebuild.find((f: AnalyzedTrack) => f.name === t.name);
                            return { ...t, file: original?.file };
                          });
                          if (sl) {
                            const currentTrackEntry = sl.tracks[curIdx];
                            const newSetlist = {
                              ...data,
                              tracks: [currentTrackEntry, ...tracksWithFiles],
                              transitions: [sl.transitions[curIdx], ...data.transitions],
                            };
                            setlistRef.current = newSetlist;
                            setSetlist(newSetlist);
                            currentTrackIndexRef.current = 0;
                            setCurrentTrackIndex(0);
                            setDjMessage(data.vibeMessage || `Vibe shifted to ${v}! New set queued! 🎛️`);
                          }
                        } catch (_) {
                          setDjMessage("Couldn't rebuild set right now — keep the current vibe!");
                        }
                      }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: vibe === v ? `${color}25` : "rgba(255,255,255,0.04)",
                        color: vibe === v ? color : "rgba(255,255,255,0.35)",
                        border: `1px solid ${vibe === v ? color + "50" : "rgba(255,255,255,0.08)"}`,
                        boxShadow: vibe === v ? `0 0 10px ${color}25` : "none",
                      }}
                      data-testid={`live-vibe-${v}`}
                    >
                      {emoji} {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                    if (sourceRef.current) {
                      try { sourceRef.current.onended = null; sourceRef.current.stop(); } catch (_) {}
                      sourceRef.current = null;
                    }
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null; }
                    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
                    setScreen("setlist");
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all"
                  data-testid="button-stop-return"
                >
                  <ArrowLeft className="w-4 h-4 text-white/50" />
                </button>

                <button
                  onClick={pauseResume}
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105"
                  style={{
                    background: isPlaying ? `${currentColor}30` : `linear-gradient(135deg, ${currentColor}, ${currentColor}aa)`,
                    boxShadow: isPlaying ? `0 0 20px ${currentColor}30` : `0 0 30px ${currentColor}60`,
                  }}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                </button>

                <button
                  onClick={skipTrack}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all"
                  data-testid="button-skip"
                >
                  <SkipForward className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <EnergyArcChart energyArc={setlist.energyArc} currentIndex={currentTrackIndex} />
              <GenreJourneyMap genres={setlist.genreJourney} />

              <div>
                <div className="text-xs font-black uppercase tracking-widest text-white/30 mb-3">Up Next</div>
                <div className="space-y-0">
                  {setlist.tracks.slice(currentTrackIndex).map((track, i) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      index={currentTrackIndex + i}
                      transition={setlist.transitions[currentTrackIndex + i]}
                      nextTrackGenre={setlist.tracks[currentTrackIndex + i + 1]?.genre}
                      isCurrentlyPlaying={i === 0}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
