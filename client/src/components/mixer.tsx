import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Disc3, Circle, Download, Wand2, Loader2,
} from "lucide-react";

interface MixerProps {
  crossfade: number;
  onCrossfadeChange: (val: number) => void;
  isRecording: boolean;
  recordingUrl: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  autoMixing: boolean;
  onAutoMix: () => void;
  hasBothDecks: boolean;
  vuA: number;
  vuB: number;
}

export function Mixer({
  crossfade, onCrossfadeChange,
  isRecording, recordingUrl,
  onStartRecording, onStopRecording,
  autoMixing, onAutoMix,
  hasBothDecks, vuA, vuB,
}: MixerProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="mixer-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Disc3 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Mixer</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isRecording && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-recording">
              <Circle className="w-2 h-2 mr-1 fill-current animate-pulse" />
              REC
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">A</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{ width: `${vuA * 100}%`, backgroundColor: "hsl(262, 83%, 58%)" }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Crossfade</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75 ml-auto"
                  style={{ width: `${vuB * 100}%`, backgroundColor: "hsl(340, 75%, 55%)" }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">B</span>
            </div>
          </div>
          <Slider
            value={[crossfade]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([v]) => onCrossfadeChange(v)}
            data-testid="slider-crossfade"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={autoMixing ? "default" : "outline"}
            size="sm"
            onClick={onAutoMix}
            disabled={!hasBothDecks || autoMixing}
            data-testid="button-automix"
          >
            {autoMixing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Auto-Mix
          </Button>

          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={isRecording ? onStopRecording : onStartRecording}
            data-testid="button-record"
          >
            <Circle className={`w-3.5 h-3.5 mr-1.5 ${isRecording ? "fill-current animate-pulse" : ""}`} />
            {isRecording ? "Stop Rec" : "Record"}
          </Button>

          {recordingUrl && (
            <Button variant="ghost" size="sm" asChild data-testid="button-download-mix">
              <a href={recordingUrl} download="dj-mix.webm">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Mix
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
