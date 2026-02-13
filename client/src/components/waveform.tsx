import { useRef, useEffect, useCallback } from "react";
import type { HotCue } from "@/hooks/use-audio-engine";

interface WaveformProps {
  waveformData: number[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  analyzerData: Float32Array | null;
  color: string;
  hotCues: (HotCue | null)[];
  loopStart: number;
  loopEnd: number;
  loopActive: boolean;
  cuePoint: number;
  onSeek: (time: number) => void;
}

export function Waveform({
  waveformData, currentTime, duration, isPlaying, analyzerData,
  color, hotCues, loopStart, loopEnd, loopActive, cuePoint, onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barWidth = w / waveformData.length;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, w, h);

    if (loopActive && duration > 0) {
      const ls = (loopStart / duration) * w;
      const le = (loopEnd / duration) * w;
      ctx.fillStyle = color + "15";
      ctx.fillRect(ls, 0, le - ls, h);
      ctx.strokeStyle = color + "66";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(ls, 0, le - ls, h);
      ctx.setLineDash([]);
    }

    waveformData.forEach((val, i) => {
      const barH = val * h * 0.85;
      const x = i * barWidth;
      const pos = i / waveformData.length;
      const isPlayed = pos < progress;

      if (isPlayed) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      }
      const bw = Math.max(barWidth - 0.5, 0.5);
      ctx.fillRect(x, (h - barH) / 2, bw, barH);
    });

    if (cuePoint > 0 && duration > 0) {
      const cx = (cuePoint / duration) * w;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    }

    hotCues.forEach((cue) => {
      if (!cue || duration === 0) return;
      const cx = (cue.position / duration) * w;
      ctx.fillStyle = cue.color;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx + 5, 0);
      ctx.lineTo(cx, 8);
      ctx.lineTo(cx - 5, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cue.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    });

    if (progress > 0 && progress <= 1) {
      const playheadX = progress * w;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [waveformData, currentTime, duration, color, hotCues, loopStart, loopEnd, loopActive, cuePoint]);

  const drawLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !analyzerData || !isPlaying) return;

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

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, color + "88");
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, color + "88");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const step = Math.max(1, Math.floor(analyzerData.length / 200));
    const sliceWidth = w / (analyzerData.length / step);
    let x = 0;
    for (let i = 0; i < analyzerData.length; i += step) {
      const v = analyzerData[i] * 0.5 + 0.5;
      const y = v * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }, [analyzerData, isPlaying, color]);

  useEffect(() => { drawWaveform(); }, [drawWaveform]);
  useEffect(() => { drawLive(); }, [drawLive]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return;
    const x = e.clientX - rect.left;
    onSeek((x / rect.width) * duration);
  };

  return (
    <div className="relative w-full" data-testid="waveform-container">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-md bg-muted/30"
        style={{ height: "72px" }}
        onClick={handleClick}
        data-testid="waveform-static"
      />
      <canvas
        ref={liveCanvasRef}
        className="w-full pointer-events-none rounded-md"
        style={{ height: "28px", visibility: isPlaying ? "visible" : "hidden" }}
        data-testid="waveform-live"
      />
    </div>
  );
}
