import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SamplePad } from "@/hooks/use-audio-engine";
import { Music } from "lucide-react";

interface SamplerProps {
  pads: SamplePad[];
  onPlaySample: (index: number) => void;
  onLoadSample: (index: number, file: File) => void;
}

export function Sampler({ pads, onPlaySample, onLoadSample }: SamplerProps) {
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="sampler-panel">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sampler Pads</span>
          <span className="text-[10px] text-muted-foreground">(right-click to load custom)</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5" data-testid="sampler-grid">
          {pads.map((pad, i) => (
            <div key={i}>
              <input
                ref={el => { fileRefs.current[i] = el; }}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onLoadSample(i, f);
                }}
                data-testid={`input-sample-${i}`}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full text-[10px] font-mono leading-tight py-3"
                style={{ borderColor: pad.color + "44", color: pad.buffer ? pad.color : undefined }}
                onClick={() => onPlaySample(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  fileRefs.current[i]?.click();
                }}
                disabled={!pad.buffer}
                data-testid={`button-sample-${i}`}
              >
                {pad.name}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
