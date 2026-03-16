import { useRef, useEffect } from "react";

interface TurntableProps {
  isPlaying: boolean;
  color: string;
  size?: number;
  deckLabel?: string;
}

export function Turntable({ isPlaying, color, size = 180, deckLabel }: TurntableProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    const expandHex = (hex: string) => {
      if (hex.startsWith("#") && hex.length === 4) {
        return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex;
    };

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      const glowColor = expandHex(color);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRef.current);

      const vinylGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      vinylGrad.addColorStop(0, "#1a0a30");
      vinylGrad.addColorStop(0.2, "#120820");
      vinylGrad.addColorStop(0.21, "#0d0618");
      vinylGrad.addColorStop(0.95, "#0a0414");
      vinylGrad.addColorStop(1, "#1a0a30");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = vinylGrad;
      ctx.fill();

      const grooveCount = 18;
      for (let i = 1; i <= grooveCount; i++) {
        const gr = (r * 0.25) + (r * 0.65) * (i / grooveCount);
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + (i / grooveCount) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const labelR = r * 0.28;
      const labelGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, labelR);
      labelGrad.addColorStop(0, glowColor + "ff");
      labelGrad.addColorStop(0.4, glowColor + "cc");
      labelGrad.addColorStop(0.7, glowColor + "88");
      labelGrad.addColorStop(1, glowColor + "44");
      ctx.beginPath();
      ctx.arc(0, 0, labelR, 0, Math.PI * 2);
      ctx.fillStyle = labelGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      const highlight = ctx.createLinearGradient(-r * 0.3, -r * 0.3, r * 0.1, r * 0.1);
      highlight.addColorStop(0, "rgba(255,255,255,0.08)");
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
      ctx.fill();

      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isPlaying ? 20 : 6;
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = glowColor + (isPlaying ? "cc" : "40");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (deckLabel) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `bold ${size * 0.1}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.fillText(deckLabel, 0, 0);
        ctx.restore();
      }

      if (isPlaying) {
        angleRef.current += 0.025;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color, size, deckLabel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, borderRadius: "50%" }}
      data-testid="canvas-turntable"
    />
  );
}
