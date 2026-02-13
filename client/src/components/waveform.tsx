import { useRef, useEffect, useCallback, useState } from "react";
import type { HotCue } from "@/hooks/use-audio-engine";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

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
  beatGrid: number[];
  proMode: boolean;
  onSeek: (time: number) => void;
}

export function Waveform({
  waveformData, currentTime, duration, isPlaying, analyzerData,
  color, hotCues, loopStart, loopEnd, loopActive, cuePoint, beatGrid,
  proMode, onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const zoomIn = useCallback(() => setZoomLevel(z => Math.min(z * 2, 16)), []);
  const zoomOut = useCallback(() => setZoomLevel(z => Math.max(z / 2, 1)), []);
  const zoomReset = useCallback(() => setZoomLevel(1), []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const progress = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, w, h);

    let viewStart = 0;
    let viewEnd = 1;
    if (zoomLevel > 1) {
      const viewWidth = 1 / zoomLevel;
      viewStart = Math.max(0, progress - viewWidth / 2);
      viewEnd = Math.min(1, viewStart + viewWidth);
      if (viewEnd === 1) viewStart = 1 - viewWidth;
      if (viewStart === 0) viewEnd = viewWidth;
    }

    const viewRange = viewEnd - viewStart;

    if (loopActive && duration > 0) {
      const ls = ((loopStart / duration) - viewStart) / viewRange * w;
      const le = ((loopEnd / duration) - viewStart) / viewRange * w;
      if (le > 0 && ls < w) {
        ctx.fillStyle = color + "15";
        ctx.fillRect(Math.max(0, ls), 0, Math.min(w, le) - Math.max(0, ls), h);
        ctx.strokeStyle = color + "66";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(Math.max(0, ls), 0, Math.min(w, le) - Math.max(0, ls), h);
        ctx.setLineDash([]);
      }
    }

    if (proMode && beatGrid.length > 0 && duration > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < beatGrid.length; i++) {
        const beatPos = beatGrid[i] / duration;
        if (beatPos < viewStart || beatPos > viewEnd) continue;
        const x = ((beatPos - viewStart) / viewRange) * w;
        const isDownbeat = i % 4 === 0;
        if (isDownbeat) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 0.5;
        }
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    const startIdx = Math.floor(viewStart * waveformData.length);
    const endIdx = Math.ceil(viewEnd * waveformData.length);
    const visibleData = waveformData.slice(startIdx, endIdx);
    const barWidth = w / visibleData.length;

    visibleData.forEach((val, i) => {
      const barH = val * h * 0.85;
      const x = i * barWidth;
      const globalPos = (startIdx + i) / waveformData.length;
      const isPlayed = globalPos < progress;

      if (isPlayed) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      }
      const bw = Math.max(barWidth - 0.5, 0.5);
      ctx.fillRect(x, (h - barH) / 2, bw, barH);
    });

    if (cuePoint > 0 && duration > 0) {
      const cuePos = cuePoint / duration;
      if (cuePos >= viewStart && cuePos <= viewEnd) {
        const cx = ((cuePos - viewStart) / viewRange) * w;
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
      }
    }

    hotCues.forEach((cue) => {
      if (!cue || duration === 0) return;
      const cuePos = cue.position / duration;
      if (cuePos < viewStart || cuePos > viewEnd) return;
      const cx = ((cuePos - viewStart) / viewRange) * w;

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

      if (cue.label && zoomLevel >= 2) {
        ctx.font = "9px monospace";
        ctx.fillStyle = cue.color;
        ctx.fillText(cue.label, cx + 3, h - 3);
      }
    });

    if (progress >= viewStart && progress <= viewEnd) {
      const playheadX = ((progress - viewStart) / viewRange) * w;
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
  }, [waveformData, currentTime, duration, color, hotCues, loopStart, loopEnd, loopActive, cuePoint, beatGrid, zoomLevel, proMode]);

  const drawLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !analyzerData || !isPlaying) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    const ratio = x / rect.width;

    if (zoomLevel > 1) {
      const progress = duration > 0 ? currentTime / duration : 0;
      const viewWidth = 1 / zoomLevel;
      let viewStart = Math.max(0, progress - viewWidth / 2);
      const viewEnd = Math.min(1, viewStart + viewWidth);
      if (viewEnd === 1) viewStart = 1 - viewWidth;

      const globalRatio = viewStart + ratio * (viewEnd - viewStart);
      onSeek(globalRatio * duration);
    } else {
      onSeek(ratio * duration);
    }
  };

  return (
    <div className="relative w-full" data-testid="waveform-container">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer rounded-md bg-muted/30"
        style={{ height: proMode ? "80px" : "72px" }}
        onClick={handleClick}
        data-testid="waveform-static"
      />
      <canvas
        ref={liveCanvasRef}
        className="w-full pointer-events-none rounded-md"
        style={{ height: "28px", visibility: isPlaying ? "visible" : "hidden" }}
        data-testid="waveform-live"
      />
      {proMode && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5" data-testid="waveform-zoom-controls">
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 bg-background/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 bg-background/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          {zoomLevel > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 bg-background/60 backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); zoomReset(); }}
              data-testid="button-zoom-reset"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
          {zoomLevel > 1 && (
            <span className="text-[9px] font-mono text-muted-foreground bg-background/60 px-1 rounded">
              {zoomLevel}x
            </span>
          )}
        </div>
      )}
    </div>
  );
}
