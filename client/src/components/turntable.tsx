import { useRef, useEffect } from "react";

interface TurntableProps {
  isPlaying: boolean;
  color: string;
  size?: number;
  deckLabel?: string;
  bpm?: number;
}

export function Turntable({ isPlaying, color, size = 200, deckLabel, bpm }: TurntableProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const animRef = useRef<number>(0);
  const beatRef = useRef(0);
  const beatPhaseRef = useRef(0);
  const frameRef = useRef(0);

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
    const r = size / 2 - 6;

    const parseColor = (hex: string): [number, number, number] => {
      const c = hex.replace("#", "");
      if (c.length === 3) return [parseInt(c[0]+c[0],16), parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16)];
      return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
    };

    const [cr, cg, cb] = parseColor(color.startsWith("#") ? color : "#bf5af2");
    const rgba = (a: number) => `rgba(${cr},${cg},${cb},${a})`;
    const complementHue = `rgba(${Math.round(cb * 0.6)},${Math.round(cr * 0.3)},${Math.round(cg * 0.8)},`;

    const beatPeriod = bpm ? (60 / bpm) * 60 : 90;

    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, size, size);

      // Beat pulse tracking
      beatRef.current++;
      if (beatRef.current >= beatPeriod) beatRef.current = 0;
      beatPhaseRef.current = beatRef.current / beatPeriod;
      const beatPulse = isPlaying ? Math.pow(Math.max(0, 1 - (beatPhaseRef.current * 4)), 2) : 0;

      // ── Outer halo rings (LED style) ──
      const haloRings = [
        { r: r + 16, w: 1.5, alpha: 0.08 + beatPulse * 0.12 },
        { r: r + 10, w: 1.5, alpha: 0.12 + beatPulse * 0.18 },
        { r: r + 5,  w: 2,   alpha: 0.2  + beatPulse * 0.3  },
        { r: r + 1,  w: 3,   alpha: 0.4  + beatPulse * 0.4  },
      ];
      haloRings.forEach(ring => {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(ring.alpha);
        ctx.lineWidth = ring.w;
        ctx.stroke();
      });

      // ── Outer LED dot ring ──
      const dotCount = 36;
      for (let i = 0; i < dotCount; i++) {
        const ang = (i / dotCount) * Math.PI * 2;
        const active = isPlaying && i === Math.floor((angleRef.current / (Math.PI * 2)) * dotCount + i) % dotCount;
        const phase = (i / dotCount + angleRef.current / (Math.PI * 2)) % 1;
        const ledBright = isPlaying ? 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 3) : 0.08;
        const dx = cx + (r + 22) * Math.cos(ang);
        const dy = cy + (r + 22) * Math.sin(ang);
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(ledBright);
        ctx.fill();
      }

      // ── Main platter body ──
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRef.current);

      // Deep vinyl base
      const vinylGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      vinylGrad.addColorStop(0,    `rgba(${cr},${cg},${cb},0.15)`);
      vinylGrad.addColorStop(0.08, "rgba(5,2,15,0.97)");
      vinylGrad.addColorStop(0.15, "rgba(8,4,20,0.98)");
      vinylGrad.addColorStop(0.95, "rgba(12,6,28,0.99)");
      vinylGrad.addColorStop(1,    `rgba(${cr},${cg},${cb},0.05)`);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = vinylGrad;
      ctx.fill();

      // ── Prismatic grooves ──
      const grooveCount = 28;
      for (let i = 1; i <= grooveCount; i++) {
        const gr = (r * 0.26) + (r * 0.68) * (i / grooveCount);
        const t = frameRef.current * 0.01 + i * 0.3;
        const shimmer = 0.02 + 0.04 * Math.abs(Math.sin(t));
        // Iridescent shimmer — alternate between color tones
        const hue = (i * 13 + frameRef.current * 0.5) % 360;
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.strokeStyle = i % 4 === 0
          ? `hsla(${hue},80%,70%,${shimmer * 2})`
          : `rgba(255,255,255,${shimmer})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ── Holographic label center ──
      const labelR = r * 0.30;

      // Label shimmer background
      const labelGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, labelR);
      const t2 = frameRef.current * 0.02;
      const pulseH = (Math.sin(t2) * 0.5 + 0.5);
      labelGrad.addColorStop(0,   `rgba(${cr + 40},${cg},${cb + 20},0.95)`);
      labelGrad.addColorStop(0.3, `rgba(${cr},${cg},${cb},0.85)`);
      labelGrad.addColorStop(0.7, `rgba(${Math.round(cr*0.6)},${Math.round(cg*0.4)},${Math.round(cb*0.9)},0.8)`);
      labelGrad.addColorStop(1,   `rgba(${cr},${cg},${cb},0.3)`);
      ctx.beginPath();
      ctx.arc(0, 0, labelR, 0, Math.PI * 2);
      ctx.fillStyle = labelGrad;
      ctx.fill();

      // Label shimmer overlay (rotating prismatic)
      const shGrad = ctx.createLinearGradient(
        -labelR * Math.cos(t2), -labelR * Math.sin(t2),
        labelR * Math.cos(t2 + 1), labelR * Math.sin(t2 + 1)
      );
      shGrad.addColorStop(0, `rgba(255,255,255,0)`);
      shGrad.addColorStop(0.4, `rgba(255,255,255,${0.05 + 0.08 * pulseH})`);
      shGrad.addColorStop(0.5, `rgba(255,255,255,${0.12 + 0.12 * pulseH})`);
      shGrad.addColorStop(0.6, `rgba(255,255,255,${0.05 + 0.08 * pulseH})`);
      shGrad.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.beginPath();
      ctx.arc(0, 0, labelR, 0, Math.PI * 2);
      ctx.fillStyle = shGrad;
      ctx.fill();

      // Concentric label rings
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, labelR * (i / 5), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.06 + (i/5)*0.04})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Spindle center
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#e0e0e8";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();

      // Specular highlight (non-rotating)
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      const specGrad = ctx.createRadialGradient(-r*0.25, -r*0.25, 0, 0, 0, r);
      specGrad.addColorStop(0, "rgba(255,255,255,0.10)");
      specGrad.addColorStop(0.5, "rgba(255,255,255,0.02)");
      specGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // ── Beat burst ring ──
      if (beatPulse > 0.05) {
        ctx.save();
        ctx.translate(cx, cy);
        const burstR = r * (0.3 + beatPulse * 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, burstR, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(beatPulse * 0.7);
        ctx.lineWidth = beatPulse * 4;
        ctx.stroke();
        ctx.restore();
      }

      // ── Needle arm (static, outside platter) ──
      const needleStartX = cx + r * 0.75;
      const needleStartY = cy - r * 1.1;
      const needleTipX = cx + r * 0.55;
      const needleTipY = cy - r * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(needleStartX, needleStartY);
      ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 0.5, needleTipX, needleTipY);
      ctx.strokeStyle = isPlaying ? rgba(0.9) : "rgba(180,160,220,0.5)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.shadowColor = rgba(0.6);
      ctx.shadowBlur = isPlaying ? 8 : 3;
      ctx.stroke();
      // Needle pivot
      ctx.beginPath();
      ctx.arc(needleStartX, needleStartY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isPlaying ? rgba(1) : "rgba(160,140,200,0.6)";
      ctx.fill();
      // Needle tip cartridge
      ctx.beginPath();
      ctx.arc(needleTipX, needleTipY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.shadowColor = rgba(1);
      ctx.fill();
      ctx.restore();

      // ── Deck label text ──
      if (deckLabel) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `bold ${size * 0.095}px 'Oxanium', 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = rgba(1);
        ctx.shadowBlur = 14;
        ctx.fillText(deckLabel, 0, 0);
        ctx.restore();
      }

      if (isPlaying) {
        angleRef.current += 0.022;
      } else {
        // Slow deceleration when stopped
        angleRef.current += 0.001;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color, size, deckLabel, bpm]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        filter: isPlaying ? `drop-shadow(0 0 18px ${color}80) drop-shadow(0 0 6px ${color}40)` : `drop-shadow(0 0 6px ${color}30)`,
        transition: "filter 0.4s ease",
      }}
      data-testid="canvas-turntable"
    />
  );
}
