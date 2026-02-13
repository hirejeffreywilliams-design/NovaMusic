import { useRef, useEffect, useCallback } from "react";

interface WaveformProps {
  waveformData: number[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  analyzerData: Float32Array | null;
  color: string;
  onSeek: (time: number) => void;
}

export function Waveform({ waveformData, currentTime, duration, isPlaying, analyzerData, color, onSeek }: WaveformProps) {
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

    waveformData.forEach((val, i) => {
      const barHeight = val * h * 0.8;
      const x = i * barWidth;
      const isPlayed = i / waveformData.length < progress;

      if (isPlayed) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      }

      ctx.fillRect(x, (h - barHeight) / 2, Math.max(barWidth - 1, 1), barHeight);
    });

    if (progress > 0 && progress < 1) {
      const playheadX = progress * w;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration, color]);

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
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const sliceWidth = w / analyzerData.length;
    let x = 0;
    for (let i = 0; i < analyzerData.length; i++) {
      const v = analyzerData[i] * 0.5 + 0.5;
      const y = v * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }, [analyzerData, isPlaying, color]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    drawLive();
  }, [drawLive]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return;
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <div className="relative w-full" data-testid="waveform-container">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-md"
        style={{ height: "64px" }}
        onClick={handleClick}
        data-testid="waveform-static"
      />
      {isPlaying && (
        <canvas
          ref={liveCanvasRef}
          className="absolute inset-0 w-full pointer-events-none rounded-md"
          style={{ height: "32px", top: "64px" }}
          data-testid="waveform-live"
        />
      )}
    </div>
  );
}
