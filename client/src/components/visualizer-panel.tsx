import { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, Palette } from "lucide-react";

const VISUALIZER_MODES = ["bars", "circular", "particles", "wave", "spectrum", "matrix"] as const;
type VisualizerMode = typeof VISUALIZER_MODES[number];

const MODE_COLORS: Record<VisualizerMode, string[]> = {
  bars: ["#bf5af2", "#0af", "#ff2d78"],
  circular: ["#ff2d78", "#ff9500", "#ffd60a"],
  particles: ["#0af", "#30d158", "#64d2ff"],
  wave: ["#bf5af2", "#ff2d78", "#ffd60a"],
  spectrum: ["#30d158", "#0af", "#bf5af2", "#ff2d78"],
  matrix: ["#30d158", "#22c55e", "#16a34a"],
};

interface VisualizerPanelProps {
  engine: any;
}

export function VisualizerPanel({ engine }: VisualizerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<VisualizerMode>("bars");
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = MODE_COLORS[mode];

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.fillStyle = "rgba(10, 5, 25, 0.2)";
      ctx.fillRect(0, 0, w, h);

      const eng = engineRef.current;
      const dataA = eng.decks.A.analyzerData;
      const dataB = eng.decks.B.analyzerData;

      const combined = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        const a = dataA ? Math.abs(dataA[i] || 0) : 0;
        const b = dataB ? Math.abs(dataB[i] || 0) : 0;
        combined[i] = (a + b) / 2;
      }

      switch (mode) {
        case "bars": {
          const barCount = 64;
          const barW = w / barCount - 2;
          for (let i = 0; i < barCount; i++) {
            const val = combined[i * 2] || 0;
            const barH = val * h * 3;
            const x = i * (barW + 2);
            const grad = ctx.createLinearGradient(x, h, x, h - barH);
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(0.5, colors[1]);
            grad.addColorStop(1, colors[2] || colors[0]);
            ctx.fillStyle = grad;
            ctx.shadowColor = colors[0];
            ctx.shadowBlur = 8;
            ctx.fillRect(x, h - barH, barW, barH);

            ctx.fillStyle = `${colors[1]}40`;
            ctx.fillRect(x, h - barH - 4, barW, 2);
          }
          ctx.shadowBlur = 0;
          break;
        }
        case "circular": {
          const cx = w / 2;
          const cy = h / 2;
          const baseRadius = Math.min(w, h) * 0.25;

          for (let i = 0; i < 128; i++) {
            const angle = (i / 128) * Math.PI * 2 - Math.PI / 2;
            const val = (combined[i] || 0) * 3;
            const r1 = baseRadius;
            const r2 = baseRadius + val * baseRadius * 2;

            const colorIdx = Math.floor((i / 128) * colors.length);
            ctx.strokeStyle = colors[colorIdx % colors.length];
            ctx.lineWidth = 2;
            ctx.shadowColor = colors[colorIdx % colors.length];
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle));
            ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
            ctx.stroke();
          }

          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(cx, cy, baseRadius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `${colors[0]}30`;
          ctx.fill();
          ctx.strokeStyle = `${colors[0]}60`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case "particles": {
          const maxParticles = 200;
          const energy = combined.reduce((s, v) => s + v, 0) / combined.length;

          if (energy > 0.01) {
            for (let i = 0; i < Math.floor(energy * 20); i++) {
              if (particlesRef.current.length < maxParticles) {
                particlesRef.current.push({
                  x: w / 2,
                  y: h / 2,
                  vx: (Math.random() - 0.5) * energy * 30,
                  vy: (Math.random() - 0.5) * energy * 30,
                  life: 1,
                  color: colors[Math.floor(Math.random() * colors.length)],
                });
              }
            }
          }

          particlesRef.current = particlesRef.current.filter((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01;
            p.vx *= 0.99;
            p.vy *= 0.99;

            if (p.life <= 0) return false;

            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 + p.life * 4, 0, Math.PI * 2);
            ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, "0");
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            return true;
          });
          ctx.shadowBlur = 0;
          break;
        }
        case "wave": {
          ctx.beginPath();
          for (let i = 0; i < 128; i++) {
            const x = (i / 128) * w;
            const y = h / 2 + (combined[i] || 0) * h * 1.5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0, colors[0]);
          grad.addColorStop(0.5, colors[1]);
          grad.addColorStop(1, colors[2] || colors[0]);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.shadowColor = colors[0];
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          for (let i = 0; i < 128; i++) {
            const x = (i / 128) * w;
            const y = h / 2 - (combined[i] || 0) * h * 1.5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `${colors[1]}80`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case "spectrum": {
          for (let i = 0; i < 128; i++) {
            const x = (i / 128) * w;
            const val = (combined[i] || 0) * 4;
            const colorIdx = Math.floor((i / 128) * colors.length);

            for (let row = 0; row < Math.floor(val * 20); row++) {
              const y = h - row * 6;
              ctx.fillStyle = row > val * 15 ? "#ff453a" : colors[colorIdx % colors.length];
              ctx.globalAlpha = 0.8;
              ctx.fillRect(x, y, w / 128 - 1, 4);
            }
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "matrix": {
          const cols = 40;
          const fontSize = Math.floor(w / cols);
          ctx.font = `${fontSize}px monospace`;

          for (let i = 0; i < cols; i++) {
            const val = combined[Math.floor(i * 128 / cols)] || 0;
            if (val > 0.02) {
              const rows = Math.floor(val * 15);
              for (let j = 0; j < rows; j++) {
                const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                const alpha = (1 - j / rows) * val * 5;
                ctx.fillStyle = `rgba(48, 209, 88, ${Math.min(alpha, 1)})`;
                ctx.shadowColor = "#30d158";
                ctx.shadowBlur = 4;
                ctx.fillText(char, i * fontSize, (j + 1) * fontSize);
              }
            }
          }
          ctx.shadowBlur = 0;
          break;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <div className="h-full flex flex-col gap-3 p-2">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#bf5af2]" />
          <span className="text-sm font-bold neon-text-purple" data-testid="text-visualizer-title">Visualizer</span>
        </div>
        <div className="flex gap-1">
          {VISUALIZER_MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all ${
                mode === m
                  ? "bg-[#bf5af2]/30 text-[#bf5af2] border border-[#bf5af2]/40"
                  : "bg-white/5 text-white/30 hover:text-white/60"
              }`}
              data-testid={`button-viz-mode-${m}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: "rgba(10,5,25,0.8)", border: "1px solid rgba(191,90,242,0.1)" }}>
        <canvas ref={canvasRef} className="w-full h-full" data-testid="canvas-visualizer" />
      </div>
    </div>
  );
}
