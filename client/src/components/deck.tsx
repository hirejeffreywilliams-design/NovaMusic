import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Waveform } from "./waveform";
import { DeckState } from "@/hooks/use-audio-engine";
import {
  Play,
  Pause,
  Upload,
  Disc3,
  Gauge,
  Navigation,
  SkipBack,
  Activity,
  Loader2,
} from "lucide-react";

interface DeckProps {
  which: "A" | "B";
  state: DeckState;
  color: string;
  onLoadFile: (file: File, which: "A" | "B") => void;
  onPlay: (which: "A" | "B") => void;
  onPause: (which: "A" | "B") => void;
  onSetRate: (which: "A" | "B", rate: number) => void;
  onSetCue: (which: "A" | "B") => void;
  onJumpCue: (which: "A" | "B") => void;
  onSeek: (which: "A" | "B", time: number) => void;
  analysis: { bpm: number; key: string } | null;
  analyzing: boolean;
  onAnalyze: (which: "A" | "B") => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Deck({
  which,
  state,
  color,
  onLoadFile,
  onPlay,
  onPause,
  onSetRate,
  onSetCue,
  onJumpCue,
  onSeek,
  analysis,
  analyzing,
  onAnalyze,
}: DeckProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onLoadFile(f, which);
  };

  const ratePercent = Math.round((state.playbackRate - 1) * 100);

  return (
    <Card className="flex-1 min-w-0 bg-card/80 backdrop-blur-sm" data-testid={`deck-${which}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md font-bold text-sm"
            style={{ backgroundColor: color, color: "#fff" }}
          >
            {which}
          </div>
          <CardTitle className="text-base">Deck {which}</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {state.isPlaying && (
            <Badge variant="outline" className="text-xs">
              <Disc3 className="w-3 h-3 mr-1 animate-spin" />
              Live
            </Badge>
          )}
          {analysis && (
            <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-bpm-${which}`}>
              {Math.round(analysis.bpm)} BPM
            </Badge>
          )}
          {analysis && (
            <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-key-${which}`}>
              {analysis.key}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid={`input-file-${which}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="flex-1 min-w-0"
            data-testid={`button-load-${which}`}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            <span className="truncate">{state.fileName || "Load Track"}</span>
          </Button>
        </div>

        <Waveform
          waveformData={state.waveformData}
          currentTime={state.currentTime}
          duration={state.duration}
          isPlaying={state.isPlaying}
          analyzerData={state.analyzerData}
          color={color}
          onSeek={(t) => onSeek(which, t)}
        />

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground" data-testid={`text-time-${which}`}>
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="icon"
            variant={state.isPlaying ? "default" : "outline"}
            onClick={() => (state.isPlaying ? onPause(which) : onPlay(which))}
            disabled={!state.buffer}
            data-testid={`button-play-${which}`}
          >
            {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onSetCue(which)}
            disabled={!state.buffer}
            data-testid={`button-cue-${which}`}
          >
            <Navigation className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onJumpCue(which)}
            disabled={!state.buffer}
            data-testid={`button-jump-cue-${which}`}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAnalyze(which)}
            disabled={!state.buffer || analyzing}
            data-testid={`button-analyze-${which}`}
          >
            {analyzing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5 mr-1" />
            )}
            Analyze
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>Tempo</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground" data-testid={`text-rate-${which}`}>
              {ratePercent >= 0 ? "+" : ""}{ratePercent}%
            </span>
          </div>
          <Slider
            value={[state.playbackRate]}
            min={0.5}
            max={1.5}
            step={0.01}
            onValueChange={([v]) => onSetRate(which, v)}
            data-testid={`slider-rate-${which}`}
          />
        </div>

        {state.cuePoint > 0 && (
          <div className="text-xs text-muted-foreground">
            Cue: {formatTime(state.cuePoint)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
