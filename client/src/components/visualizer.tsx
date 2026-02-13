import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, X } from "lucide-react";

interface VisualizerProps {
  analyzerDataA: Float32Array | null;
  analyzerDataB: Float32Array | null;
  isPlayingA: boolean;
  isPlayingB: boolean;
  colorA: string;
  colorB: string;
  vuA: number;
  vuB: number;
}

type VisualizerMode = "bars" | "circular" | "particles" | "wave";

export function Visualizer({
  analyzerDataA, analyzerDataB,
  isPlayingA, isPlayingB,
  colorA, colorB,
  vuA, vuB,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<VisualizerMode>("bars");
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const animRef = useRef<number>(0);
  const dataRefA = useRef<Float32Array | null>(null);
  const dataRefB = useRef<Float32Array | null>(null);

  dataRefA.current = analyzerDataA;
  dataRefB.current = analyzerDataB;

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const drawBars = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dataA: Float32Array | null, dataB: Float32Array | null) => {
    const barCount = 64;
    const barWidth = w / (barCount * 2 + 2);
    const gap = 2;

    for (let i = 0; i < barCount; i++) {
      const valA = dataA ? Math.abs(dataA[Math.floor(i * dataA.length / barCount)]) : 0;
      const valB = dataB ? Math.abs(dataB[Math.floor(i * dataB.length / barCount)]) : 0;
      const hA = valA * h * 0.9;
      const hB = valB * h * 0.9;

      const gradA = ctx.createLinearGradient(0, h, 0, h - hA);
      gradA.addColorStop(0, colorA);
      gradA.addColorStop(1, colorA + "33");
      ctx.fillStyle = gradA;
      ctx.fillRect(i * (barWidth + gap), h - hA, barWidth, hA);

      const gradB = ctx.createLinearGradient(0, h, 0, h - hB);
      gradB.addColorStop(0, colorB);
      gradB.addColorStop(1, colorB + "33");
      ctx.fillStyle = gradB;
      ctx.fillRect(w - (i + 1) * (barWidth + gap), h - hB, barWidth, hB);
    }
  }, [colorA, colorB]);

  const drawCircular = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dataA: Float32Array | null, dataB: Float32Array | null) => {
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.2;
    const maxRadius = Math.min(w, h) * 0.42;

    [{ data: dataA, color: colorA, offset: 0 }, { data: dataB, color: colorB, offset: Math.PI }].forEach(({ data, color, offset }) => {
      if (!data) return;
      const points = 128;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + offset;
        const val = Math.abs(data[Math.floor(i * data.length / points)]);
        const r = baseRadius + val * (maxRadius - baseRadius);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
  }, [colorA, colorB]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, energy: number) => {
    const particles = particlesRef.current;

    if (energy > 0.1 && Math.random() < energy * 2) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + energy * 4;
      particles.push({
        x: w / 2,
        y: h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: Math.random() > 0.5 ? colorA : colorB,
        size: 2 + energy * 6,
      });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.012;
      p.size *= 0.995;

      if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    if (particles.length > 500) particles.splice(0, 100);
  }, [colorA, colorB]);

  const drawWave = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, dataA: Float32Array | null, dataB: Float32Array | null) => {
    [{ data: dataA, color: colorA, yOff: h * 0.35 }, { data: dataB, color: colorB, yOff: h * 0.65 }].forEach(({ data, color, yOff }) => {
      if (!data) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      const step = Math.max(1, Math.floor(data.length / 300));
      const sliceW = w / (data.length / step);
      let x = 0;
      for (let i = 0; i < data.length; i += step) {
        const y = yOff + data[i] * h * 0.25;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }, [colorA, colorB]);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(draw); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { animRef.current = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, w, h);

      const dA = dataRefA.current;
      const dB = dataRefB.current;
      const energy = (vuA + vuB) / 2;

      switch (mode) {
        case "bars": drawBars(ctx, w, h, dA, dB); break;
        case "circular": drawCircular(ctx, w, h, dA, dB); break;
        case "particles": drawParticles(ctx, w, h, energy); drawWave(ctx, w, h, dA, dB); break;
        case "wave": drawWave(ctx, w, h, dA, dB); break;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode, drawBars, drawCircular, drawParticles, drawWave, vuA, vuB]);

  const MODES: { id: VisualizerMode; label: string }[] = [
    { id: "bars", label: "Bars" },
    { id: "circular", label: "Circular" },
    { id: "particles", label: "Particles" },
    { id: "wave", label: "Wave" },
  ];

  return (
    <div ref={containerRef} className="relative rounded-md overflow-hidden" data-testid="visualizer-panel">
      <canvas
        ref={canvasRef}
        className="w-full rounded-md"
        style={{ height: isFullscreen ? "100vh" : "200px", background: "#000" }}
        data-testid="visualizer-canvas"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {MODES.map(m => (
          <Button
            key={m.id}
            size="sm"
            variant={mode === m.id ? "default" : "ghost"}
            className="text-xs bg-background/40 backdrop-blur-sm"
            onClick={() => setMode(m.id)}
            data-testid={`button-viz-${m.id}`}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className="absolute top-2 right-2">
        <Button
          size="icon"
          variant="ghost"
          className="bg-background/40 backdrop-blur-sm"
          onClick={toggleFullscreen}
          data-testid="button-viz-fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
