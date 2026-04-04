import { useState, useEffect, useRef } from "react";

interface Listener {
  name: string;
  joinedAt: number;
}

interface PartyRoomListenerProps {
  listenerCount: number;
  listeners: Listener[];
  nowPlaying?: string | null;
  analyzerData?: Uint8Array | null;
}

const AVATAR_EMOJIS = ["🎉", "🎶", "🔥", "💃", "🕺", "🌟", "🎵", "🚀", "🎊", "✨", "🎸", "🎤"];
const AVATAR_COLORS = ["#ff2d78", "#ff9500", "#ffd60a", "#30d158", "#0af", "#bf5af2", "#64d2ff", "#ff453a"];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function ListenerAvatar({ listener, index }: { listener: Listener; index: number }) {
  const h = hashName(listener.name);
  const emoji = AVATAR_EMOJIS[h % AVATAR_EMOJIS.length];
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), index * 80);
    const t2 = setTimeout(() => setPulse(false), index * 80 + 600);
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 3000 + (h % 4000));
    return () => { clearTimeout(t); clearTimeout(t2); clearInterval(interval); };
  }, [index, h]);
  return (
    <div className="flex flex-col items-center gap-0.5" title={listener.name}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all"
        style={{
          background: `${color}20`,
          border: `2px solid ${color}${pulse ? "aa" : "40"}`,
          boxShadow: pulse ? `0 0 12px ${color}60` : "none",
          transform: pulse ? "scale(1.1)" : "scale(1)",
        }}
      >
        {emoji}
      </div>
      <span className="text-[7px] text-white/40 truncate max-w-[36px]">{listener.name.split(" ")[0]}</span>
    </div>
  );
}

function PulsingVisualizer({ analyzerData }: { analyzerData?: Uint8Array | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fakeDataRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!fakeDataRef.current.length) {
      fakeDataRef.current = Array.from({ length: 32 }, () => Math.random() * 60 + 20);
    }

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 32;
      const data = analyzerData
        ? Array.from({ length: bars }, (_, i) => analyzerData[Math.floor(i * analyzerData.length / bars)] / 255)
        : fakeDataRef.current.map((v, i) => {
          fakeDataRef.current[i] = Math.max(0.1, Math.min(0.95, v + (Math.random() - 0.48) * 0.15));
          return fakeDataRef.current[i];
        });

      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const val = data[i];
        const barH = val * h * 0.9;
        const hue = 280 + (i / bars) * 120;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.4 + val * 0.5})`;
        ctx.shadowColor = `hsla(${hue}, 80%, 70%, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fillRect(i * barW + 1, h - barH, barW - 2, barH);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [analyzerData]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={48}
      className="w-full rounded-xl"
      style={{ display: "block" }}
    />
  );
}

export function PartyRoomListener({ listenerCount, listeners, nowPlaying, analyzerData }: PartyRoomListenerProps) {
  const visibleListeners = listeners.slice(0, 12);
  const overflow = listenerCount - visibleListeners.length;

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
          <span className="text-xs font-black text-white">LIVE PARTY ROOM</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.3)" }}>
          <span className="text-[10px] font-black text-[#30d158]">{listenerCount}</span>
          <span className="text-[9px] text-white/40">listening</span>
        </div>
      </div>

      {nowPlaying && (
        <div className="flex items-center gap-2">
          <span className="text-sm animate-spin" style={{ animationDuration: "3s" }}>🎵</span>
          <span className="text-xs text-white/60 truncate font-semibold">{nowPlaying}</span>
        </div>
      )}

      <PulsingVisualizer analyzerData={analyzerData} />

      {visibleListeners.length > 0 && (
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">In the room</div>
          <div className="flex flex-wrap gap-2">
            {visibleListeners.map((l, i) => (
              <ListenerAvatar key={`${l.name}-${l.joinedAt}`} listener={l} index={i} />
            ))}
            {overflow > 0 && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
                <span className="text-[8px] text-white/40 font-bold">+{overflow}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {listenerCount === 0 && (
        <div className="text-center text-xs text-white/25 py-2">
          Be the first in the room! 🎉
        </div>
      )}
    </div>
  );
}
