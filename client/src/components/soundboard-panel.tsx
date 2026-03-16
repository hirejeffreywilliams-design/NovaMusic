import { useState, useRef, useCallback } from "react";
import { Upload, Music } from "lucide-react";

const PAD_COLORS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#f97316",
];

interface SoundboardPanelProps {
  engine: any;
}

export function SoundboardPanel({ engine }: SoundboardPanelProps) {
  const [activePad, setActivePad] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePadClick = useCallback((index: number) => {
    engine.playSample(index);
    setActivePad(index);
    setTimeout(() => setActivePad(null), 200);
  }, [engine]);

  const handleFileUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadSampleFile(index, file);
  }, [engine]);

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Music className="w-5 h-5 text-[#bf5af2]" />
        <h2 className="text-lg font-bold neon-text-purple" data-testid="text-soundboard-title">Sound Pads</h2>
        <span className="text-xs text-white/30">Tap to trigger &middot; Drop files to load custom sounds</span>
      </div>

      <div className="grid grid-cols-4 grid-rows-2 gap-3 flex-1">
        {engine.samplePads.map((pad: any, i: number) => {
          const color = PAD_COLORS[i % PAD_COLORS.length];
          const isActive = activePad === i;
          return (
            <div key={i} className="relative group">
              <button
                onClick={() => handlePadClick(i)}
                className={`pad-button w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                  isActive ? "scale-95" : "hover:scale-[1.02]"
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${color}60, ${color}30)`
                    : `linear-gradient(135deg, ${color}20, ${color}08)`,
                  border: `2px solid ${color}${isActive ? "80" : "30"}`,
                  boxShadow: isActive ? `0 0 30px ${color}40, inset 0 0 30px ${color}10` : "none",
                  minHeight: "120px",
                }}
                data-testid={`button-pad-${i}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
                  <Music className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-sm font-bold text-white/80">{pad.name}</span>
                <span className="text-[9px] text-white/30">{pad.buffer ? "Ready" : "Empty"}</span>
              </button>

              <button
                onClick={() => fileInputRefs.current[i]?.click()}
                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                data-testid={`button-upload-pad-${i}`}
              >
                <Upload className="w-3 h-3 text-white/60" />
              </button>
              <input
                ref={(el) => { fileInputRefs.current[i] = el; }}
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileUpload(i, e)}
                className="hidden"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
