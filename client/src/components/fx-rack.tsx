import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { FXState } from "@/hooks/use-audio-engine";
import { Waves, Timer, SlidersHorizontal } from "lucide-react";

interface FXRackProps {
  which: "A" | "B";
  fx: FXState;
  onToggleFilter: (which: "A" | "B", enabled: boolean) => void;
  onSetFilter: (which: "A" | "B", freq: number, type: "lowpass" | "highpass") => void;
  onSetReverb: (which: "A" | "B", mix: number, enabled: boolean) => void;
  onSetDelay: (which: "A" | "B", time: number, feedback: number, enabled: boolean) => void;
}

export function FXRack({ which, fx, onToggleFilter, onSetFilter, onSetReverb, onSetDelay }: FXRackProps) {
  return (
    <Card className="bg-muted/30 border-border/50" data-testid={`fx-rack-${which}`}>
      <CardContent className="p-3 space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">FX</div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={fx.filterEnabled ? "default" : "ghost"}
              className="text-xs toggle-elevate"
              onClick={() => {
                if (fx.filterEnabled) {
                  onToggleFilter(which, false);
                } else {
                  onSetFilter(which, fx.filterFreq, fx.filterType);
                }
              }}
              data-testid={`button-filter-${which}`}
            >
              <SlidersHorizontal className="w-3 h-3 mr-1" />
              Filter
            </Button>
            {fx.filterEnabled && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  size="sm"
                  variant={fx.filterType === "lowpass" ? "secondary" : "ghost"}
                  className="text-xs"
                  onClick={() => onSetFilter(which, fx.filterFreq, "lowpass")}
                  data-testid={`button-lpf-${which}`}
                >
                  LPF
                </Button>
                <Button
                  size="sm"
                  variant={fx.filterType === "highpass" ? "secondary" : "ghost"}
                  className="text-xs"
                  onClick={() => onSetFilter(which, fx.filterFreq, "highpass")}
                  data-testid={`button-hpf-${which}`}
                >
                  HPF
                </Button>
                <Slider
                  value={[fx.filterFreq]}
                  min={20}
                  max={20000}
                  step={10}
                  onValueChange={([v]) => onSetFilter(which, v, fx.filterType)}
                  className="flex-1"
                  data-testid={`slider-filter-freq-${which}`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={fx.reverbEnabled ? "default" : "ghost"}
              className="text-xs toggle-elevate"
              onClick={() => onSetReverb(which, fx.reverbMix, !fx.reverbEnabled)}
              data-testid={`button-reverb-${which}`}
            >
              <Waves className="w-3 h-3 mr-1" />
              Reverb
            </Button>
            {fx.reverbEnabled && (
              <Slider
                value={[fx.reverbMix]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => onSetReverb(which, v, true)}
                className="flex-1"
                data-testid={`slider-reverb-${which}`}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={fx.delayEnabled ? "default" : "ghost"}
              className="text-xs toggle-elevate"
              onClick={() => onSetDelay(which, fx.delayTime, fx.delayFeedback, !fx.delayEnabled)}
              data-testid={`button-delay-${which}`}
            >
              <Timer className="w-3 h-3 mr-1" />
              Delay
            </Button>
            {fx.delayEnabled && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Slider
                  value={[fx.delayTime]}
                  min={0.05}
                  max={1}
                  step={0.01}
                  onValueChange={([v]) => onSetDelay(which, v, fx.delayFeedback, true)}
                  className="flex-1"
                  data-testid={`slider-delay-time-${which}`}
                />
                <Slider
                  value={[fx.delayFeedback]}
                  min={0}
                  max={0.9}
                  step={0.01}
                  onValueChange={([v]) => onSetDelay(which, fx.delayTime, v, true)}
                  className="flex-1"
                  data-testid={`slider-delay-fb-${which}`}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
