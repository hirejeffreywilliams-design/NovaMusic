import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Waveform } from "./waveform";
import { VUMeter } from "./vu-meter";
import { EQKnob } from "./eq-knob";
import { FXRack } from "./fx-rack";
import type { DeckState } from "@/hooks/use-audio-engine";
import {
  Play, Pause, Upload, Disc3, Gauge, Navigation, SkipBack,
  Activity, Loader2, Volume2, Repeat,
} from "lucide-react";

interface DeckProps {
  which: "A" | "B";
  state: DeckState;
  color: string;
  proMode: boolean;
  bpm: number | null;
  onLoadFile: (file: File, which: "A" | "B") => void;
  onPlay: (which: "A" | "B") => void;
  onPause: (which: "A" | "B") => void;
  onSetRate: (which: "A" | "B", rate: number) => void;
  onSetVolume: (which: "A" | "B", vol: number) => void;
  onSetCue: (which: "A" | "B") => void;
  onJumpCue: (which: "A" | "B") => void;
  onSeek: (which: "A" | "B", time: number) => void;
  onSetEQ: (which: "A" | "B", band: "low" | "mid" | "high", value: number) => void;
  onSetHotCue: (which: "A" | "B", index: number) => void;
  onJumpHotCue: (which: "A" | "B", index: number) => void;
  onToggleLoop: (which: "A" | "B", beats: number, bpm: number) => void;
  onToggleFilter: (which: "A" | "B", enabled: boolean) => void;
  onSetFilter: (which: "A" | "B", freq: number, type: "lowpass" | "highpass") => void;
  onSetReverb: (which: "A" | "B", mix: number, enabled: boolean) => void;
  onSetDelay: (which: "A" | "B", time: number, feedback: number, enabled: boolean) => void;
  analysis: { bpm: number; key: string } | null;
  analyzing: boolean;
  onAnalyze: (which: "A" | "B") => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const HOTCUE_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
const LOOP_BEATS = [0.5, 1, 2, 4, 8, 16];

function formatLoopLabel(beats: number): string {
  if (beats === 0.5) return "1/2";
  return String(beats);
}

export function Deck({
  which, state, color, proMode, bpm,
  onLoadFile, onPlay, onPause, onSetRate, onSetVolume,
  onSetCue, onJumpCue, onSeek,
  onSetEQ, onSetHotCue, onJumpHotCue, onToggleLoop,
  onToggleFilter, onSetFilter, onSetReverb, onSetDelay,
  analysis, analyzing, onAnalyze,
}: DeckProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onLoadFile(f, which);
  };

  const ratePercent = Math.round((state.playbackRate - 1) * 100);
  const effectiveBpm = bpm ? Math.round(bpm * state.playbackRate) : null;

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
          {state.loop.active && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-loop-${which}`}>
              <Repeat className="w-3 h-3 mr-1" />
              {formatLoopLabel(state.loop.beats)}
            </Badge>
          )}
          {analysis && (
            <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-bpm-${which}`}>
              {effectiveBpm || Math.round(analysis.bpm)} BPM
            </Badge>
          )}
          {analysis && (
            <Badge variant="secondary" className="text-xs font-mono" data-testid={`badge-key-${which}`}>
              {analysis.key}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
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

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Waveform
              waveformData={state.waveformData}
              currentTime={state.currentTime}
              duration={state.duration}
              isPlaying={state.isPlaying}
              analyzerData={state.analyzerData}
              color={color}
              hotCues={state.hotCues}
              loopStart={state.loop.start}
              loopEnd={state.loop.end}
              loopActive={state.loop.active}
              cuePoint={state.cuePoint}
              beatGrid={state.beatGrid}
              proMode={proMode}
              onSeek={(t) => onSeek(which, t)}
            />
          </div>
          {proMode && (
            <div className="h-[80px] flex-shrink-0">
              <VUMeter level={state.vuLevel} color={color} orientation="vertical" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground" data-testid={`text-time-${which}`}>
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>
          {proMode && (
            <VUMeter level={state.vuLevel} color={color} orientation="horizontal" />
          )}
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

        {proMode && (
          <div className="flex items-center gap-1 flex-wrap" data-testid={`hotcues-${which}`}>
            {[0, 1, 2, 3].map((i) => {
              const cue = state.hotCues[i];
              return (
                <Button
                  key={i}
                  size="sm"
                  variant={cue ? "secondary" : "ghost"}
                  className="text-xs font-mono w-auto min-w-[2rem]"
                  style={cue ? { borderColor: HOTCUE_COLORS[i], borderWidth: "2px" } : {}}
                  onClick={() => cue ? onJumpHotCue(which, i) : onSetHotCue(which, i)}
                  onContextMenu={(e) => { e.preventDefault(); onSetHotCue(which, i); }}
                  disabled={!state.buffer}
                  data-testid={`button-hotcue-${which}-${i}`}
                >
                  {cue?.label || String(i + 1)}
                </Button>
              );
            })}
          </div>
        )}

        {proMode && (
          <div className="flex items-center gap-1 flex-wrap" data-testid={`loops-${which}`}>
            <Repeat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {LOOP_BEATS.map((beats) => (
              <Button
                key={beats}
                size="sm"
                variant={state.loop.active && state.loop.beats === beats ? "default" : "ghost"}
                className="text-xs font-mono"
                onClick={() => onToggleLoop(which, beats, analysis?.bpm || 120)}
                disabled={!state.buffer}
                data-testid={`button-loop-${which}-${beats}`}
              >
                {formatLoopLabel(beats)}
              </Button>
            ))}
          </div>
        )}

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

        {proMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {Math.round(state.volume * 100)}%
              </span>
            </div>
            <Slider
              value={[state.volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([v]) => onSetVolume(which, v)}
              data-testid={`slider-volume-${which}`}
            />
          </div>
        )}

        {proMode && (
          <div className="flex items-center justify-center gap-4 py-1" data-testid={`eq-${which}`}>
            <EQKnob
              value={state.eq.low}
              onChange={(v) => onSetEQ(which, "low", v)}
              label="Low"
              color="#ef4444"
            />
            <EQKnob
              value={state.eq.mid}
              onChange={(v) => onSetEQ(which, "mid", v)}
              label="Mid"
              color="#f59e0b"
            />
            <EQKnob
              value={state.eq.high}
              onChange={(v) => onSetEQ(which, "high", v)}
              label="High"
              color="#22c55e"
            />
          </div>
        )}

        {proMode && (
          <FXRack
            which={which}
            fx={state.fx}
            onToggleFilter={onToggleFilter}
            onSetFilter={onSetFilter}
            onSetReverb={onSetReverb}
            onSetDelay={onSetDelay}
          />
        )}

        {!proMode && state.cuePoint > 0 && (
          <div className="text-xs text-muted-foreground">
            Cue: {formatTime(state.cuePoint)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
