import { useRef, useCallback, useEffect } from "react";

interface JogWheelProps {
  isPlaying: boolean;
  color: string;
  currentTime: number;
  bpm: number | null;
  onScrub: (delta: number) => void;
  onNudge: (direction: number) => void;
  "data-testid"?: string;
}

export function JogWheel({ isPlaying, color, currentTime, bpm, onScrub, onNudge, ...props }: JogWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const animRef = useRef(0);

  const getAngle = useCallback((e: React.MouseEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    return Math.atan2(y, x);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDragging.current = true;
    lastAngle.current = getAngle(e, canvas);
  }, [getAngle]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !canvasRef.current) return;
      const angle = getAngle(e, canvasRef.current);
      let delta = angle - lastAngle.current;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      lastAngle.current = angle;
      const scrubAmount = delta * 0.5;
      onScrub(scrubAmount);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getAngle, onScrub]);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = 80;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const outerR = 38;
      const innerR = 14;

      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
      ctx.strokeStyle = color + "66";
      ctx.lineWidth = 2;
      ctx.stroke();

      const beatDuration = bpm && bpm > 0 ? 60 / bpm : 1;
      const rotation = isPlaying ? (currentTime / beatDuration) * Math.PI * 2 : currentTime * 2;

      for (let i = 0; i < 8; i++) {
        const angle = rotation + (i * Math.PI * 2) / 8;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (outerR - 4);
        const y2 = cy + Math.sin(angle) * (outerR - 4);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i === 0 ? color : "rgba(255,255,255,0.15)";
        ctx.lineWidth = i === 0 ? 2.5 : 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();
      ctx.strokeStyle = color + "88";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isDragging.current) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR + 2, 0, Math.PI * 2);
        ctx.strokeStyle = color + "88";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color, currentTime, bpm]);

  return (
    <canvas
      ref={canvasRef}
      className="cursor-grab active:cursor-grabbing flex-shrink-0"
      onMouseDown={handleMouseDown}
      data-testid={props["data-testid"]}
    />
  );
}
