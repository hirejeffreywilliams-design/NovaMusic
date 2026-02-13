import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disc3, Radio, Heart, PartyPopper, Mic, Headphones } from "lucide-react";

interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof Disc3;
  bpmRange: [number, number];
  defaultCrossfade: number;
  masterPreset: string;
  tips: string[];
}

const TEMPLATES: SessionTemplate[] = [
  {
    id: "club",
    name: "Club Set",
    description: "High-energy dance floor set with punchy mastering",
    icon: PartyPopper,
    bpmRange: [124, 132],
    defaultCrossfade: 0.5,
    masterPreset: "Club",
    tips: [
      "Keep energy high with gradual BPM increases",
      "Use filter sweeps for dramatic transitions",
      "Drop the bass EQ before big moments",
    ],
  },
  {
    id: "radio",
    name: "Radio Mix",
    description: "Broadcast-ready mix with smooth transitions",
    icon: Radio,
    bpmRange: [100, 128],
    defaultCrossfade: 0.5,
    masterPreset: "Radio",
    tips: [
      "Use longer crossfade transitions (8-16 bars)",
      "Keep volumes consistent between tracks",
      "Avoid hard cuts - smooth blends work best",
    ],
  },
  {
    id: "wedding",
    name: "Wedding",
    description: "Mixed tempo set for all ages and tastes",
    icon: Heart,
    bpmRange: [90, 130],
    defaultCrossfade: 0.5,
    masterPreset: "Clean",
    tips: [
      "Start slow, build energy through the night",
      "Mix genres to keep everyone happy",
      "Watch the crowd and adjust energy accordingly",
    ],
  },
  {
    id: "hiphop",
    name: "Hip-Hop/R&B",
    description: "Laid-back vibes with heavy bass emphasis",
    icon: Mic,
    bpmRange: [80, 110],
    defaultCrossfade: 0.5,
    masterPreset: "Club",
    tips: [
      "Use echo/delay effects on transitions",
      "Cut the highs before blending tracks",
      "Drop cues on vocal hooks for quick mixing",
    ],
  },
  {
    id: "lounge",
    name: "Lounge",
    description: "Ambient background music with gentle mixing",
    icon: Headphones,
    bpmRange: [90, 120],
    defaultCrossfade: 0.5,
    masterPreset: "Clean",
    tips: [
      "Keep volume moderate and consistent",
      "Use reverb effects for atmosphere",
      "Long, slow crossfades work perfectly here",
    ],
  },
  {
    id: "warmup",
    name: "Warm Up",
    description: "Progressive opener building energy gradually",
    icon: Disc3,
    bpmRange: [118, 126],
    defaultCrossfade: 0.5,
    masterPreset: "Clean",
    tips: [
      "Start at lower BPMs and gradually increase",
      "Use stems to bring in elements slowly",
      "Build anticipation with risers and FX",
    ],
  },
];

interface SessionTemplatesProps {
  onApply: (template: {
    masterPreset: string;
    crossfade: number;
    tips: string[];
    name: string;
    bpmRange: [number, number];
  }) => void;
  activeTemplate: string | null;
}

export function SessionTemplates({ onApply, activeTemplate }: SessionTemplatesProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="session-templates">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session Templates</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isActive = activeTemplate === t.id;
            return (
              <Button
                key={t.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2 gap-1"
                onClick={() => onApply({
                  masterPreset: t.masterPreset,
                  crossfade: t.defaultCrossfade,
                  tips: t.tips,
                  name: t.name,
                  bpmRange: t.bpmRange,
                })}
                data-testid={`button-template-${t.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{t.name}</span>
                <span className="text-[8px] text-muted-foreground">{t.bpmRange[0]}-{t.bpmRange[1]}</span>
              </Button>
            );
          })}
        </div>
        {activeTemplate && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              Active: {TEMPLATES.find(t => t.id === activeTemplate)?.name}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {TEMPLATES.find(t => t.id === activeTemplate)?.bpmRange.join("-")} BPM
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
