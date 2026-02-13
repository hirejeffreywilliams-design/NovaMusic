import { useRef, useEffect } from "react";

interface VUMeterProps {
  level: number;
  color: string;
  orientation?: "vertical" | "horizontal";
}

export function VUMeter({ level, color, orientation = "vertical" }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const segments = 16;
    const gap = 1;

    if (orientation === "vertical") {
      const segH = (h - (segments - 1) * gap) / segments;
      for (let i = 0; i < segments; i++) {
        const segIndex = segments - 1 - i;
        const y = i * (segH + gap);
        const threshold = segIndex / segments;
        const active = level >= threshold;

        if (active) {
          if (segIndex >= segments * 0.85) {
            ctx.fillStyle = "#ef4444";
          } else if (segIndex >= segments * 0.7) {
            ctx.fillStyle = "#f59e0b";
          } else {
            ctx.fillStyle = color;
          }
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
        }
        ctx.fillRect(0, y, w, segH);
      }
    } else {
      const segW = (w - (segments - 1) * gap) / segments;
      for (let i = 0; i < segments; i++) {
        const x = i * (segW + gap);
        const threshold = i / segments;
        const active = level >= threshold;

        if (active) {
          if (i >= segments * 0.85) {
            ctx.fillStyle = "#ef4444";
          } else if (i >= segments * 0.7) {
            ctx.fillStyle = "#f59e0b";
          } else {
            ctx.fillStyle = color;
          }
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
        }
        ctx.fillRect(x, 0, segW, h);
      }
    }
  }, [level, color, orientation]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-sm"
      style={orientation === "vertical" ? { width: "8px", height: "100%" } : { width: "100%", height: "6px" }}
      data-testid="vu-meter"
    />
  );
}
