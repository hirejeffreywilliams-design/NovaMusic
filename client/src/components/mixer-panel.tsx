import { useState } from "react";
import { Circle, Download } from "lucide-react";
import { CrossfaderCurve } from "@/hooks/use-audio-engine";

interface MixerPanelProps {
  engine: any;
  deckLayout: 2 | 4;
}

const HYPE_LEVELS = [
  { label: "Chill", min: 0, color: "#30d158" },
  { label: "Building", min: 0.15, color: "#ffd60a" },
  { label: "Lit", min: 0.3, color: "#ff9500" },
  { label: "PEAK 🔥", min: 0.5, color: "#ff453a" },
];

function getHypeInfo(level: number) {
  let hype = HYPE_LEVELS[0];
  for (const h of HYPE_LEVELS) {
    if (level >= h.min) hype = h;
  }
  return hype;
}

function CrossfaderCurveSelector({ pair, curve, onChange }: {
  pair: string;
  curve: CrossfaderCurve;
  onChange: (c: CrossfaderCurve) => void;
}) {
  const options: { label: string; value: CrossfaderCurve }[] = [
    { label: "Smooth", value: "smooth" },
    { label: "Club", value: "club" },
    { label: "Cut", value: "cut" },
  ];
  return (
    <div className="flex items-center gap-1 mt-1">
      {options.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-1 py-0.5 rounded text-[8px] font-bold transition-all ${
            curve === value ? "bg-white/20 text-white" : "bg-white/5 text-white/25 hover:text-white/50"
          }`}
          data-testid={`button-xfade-curve-${pair.toLowerCase()}-${value}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function formatRecordingTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MixerPanel({ engine, deckLayout }: MixerPanelProps) {
  const hype = getHypeInfo(engine.hypeLevel || 0);
  const hypePercent = Math.min((engine.hypeLevel || 0) / 0.6 * 100, 100);

  return (
    <div className="mixer-surface p-3 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: "#bf5af2" }}>A</span>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">Crossfade A/B</span>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: "#0af" }}>B</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={engine.crossfadeAB}
            onChange={(e) => engine.updateCrossfadeAB(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: "linear-gradient(to right, #bf5af2, #1a0a30, #0af)" }}
            data-testid="slider-crossfade-ab"
          />
          <CrossfaderCurveSelector
            pair="AB"
            curve={engine.crossfaderCurveAB || "smooth"}
            onChange={(c) => engine.setCrossfaderCurve("AB", c)}
          />
        </div>

        {deckLayout === 4 && (
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: "#ff2d78" }}>C</span>
              <span className="text-[9px] text-white/30 uppercase tracking-wider">Crossfade C/D</span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: "#30d158" }}>D</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={engine.crossfadeCD}
              onChange={(e) => engine.updateCrossfadeCD(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ background: "linear-gradient(to right, #ff2d78, #1a0a30, #30d158)" }}
              data-testid="slider-crossfade-cd"
            />
            <CrossfaderCurveSelector
              pair="CD"
              curve={engine.crossfaderCurveCD || "smooth"}
              onChange={(c) => engine.setCrossfaderCurve("CD", c)}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => engine.isRecording ? engine.stopRecording() : engine.startRecording()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                engine.isRecording
                  ? "bg-[#ff453a] animate-neon-pulse"
                  : "bg-white/5 hover:bg-white/10 border border-white/10"
              }`}
              style={engine.isRecording ? { boxShadow: "0 0 20px rgba(255,69,58,0.5)" } : {}}
              data-testid="button-record"
            >
              <Circle className={`w-4 h-4 ${engine.isRecording ? "text-white" : "text-[#ff453a]"}`} fill={engine.isRecording ? "white" : "none"} />
            </button>
            {engine.isRecording && (
              <div className="flex flex-col items-start">
                <span className="text-[8px] text-[#ff453a] font-bold uppercase tracking-wider animate-pulse">REC</span>
                <span className="text-[10px] text-white/70 font-mono">{formatRecordingTime(engine.recordingElapsed || 0)}</span>
              </div>
            )}
          </div>

          {engine.recordingUrl && (
            <a
              href={engine.recordingUrl}
              download="dj-hybrid-mix.webm"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 hover:bg-[#30d158]/25 transition-all"
              data-testid="link-download-recording"
            >
              <Download className="w-3 h-3" />Download
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[9px] text-white/30 uppercase">Master</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={engine.mastering.masterGain}
            onChange={(e) => engine.setMasterGain(parseFloat(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
            data-testid="slider-master-gain"
          />
          <span className="text-[9px] text-white/40 font-mono w-8 text-right">
            {Math.round(engine.mastering.masterGain * 100)}%
          </span>
        </div>

        <div className="flex gap-1">
          {["Clean", "Club", "Radio"].map((preset) => (
            <button
              key={preset}
              onClick={() => engine.setMasterPreset(preset)}
              className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${
                engine.mastering.preset === preset
                  ? "bg-[#bf5af2]/30 text-[#bf5af2] border border-[#bf5af2]/40"
                  : "bg-white/5 text-white/30 border border-white/5 hover:text-white/60"
              }`}
              data-testid={`button-preset-${preset.toLowerCase()}`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex gap-2 flex-1">
          {(["A", "B", ...(deckLayout === 4 ? ["C", "D"] : [])] as const).map((id) => {
            const level = engine.decks[id].vuLevel;
            return (
              <div key={id} className="flex-1 flex items-center gap-2">
                <span className="text-[9px] font-bold" style={{
                  color: id === "A" ? "#bf5af2" : id === "B" ? "#0af" : id === "C" ? "#ff2d78" : "#30d158"
                }}>
                  {id}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${Math.min(level * 100, 100)}%`,
                      background: level > 0.8
                        ? "linear-gradient(to right, #30d158, #ffd60a, #ff453a)"
                        : level > 0.5
                        ? "linear-gradient(to right, #30d158, #ffd60a)"
                        : "#30d158",
                    }}
                    data-testid={`meter-vu-${id}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <span className="text-[8px] text-white/30 uppercase tracking-wider">Crowd Hype</span>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hypePercent}%`,
                background: hype.color,
                boxShadow: `0 0 8px ${hype.color}80`,
              }}
              data-testid="meter-hype"
            />
          </div>
          <span
            className="text-[9px] font-bold transition-all"
            style={{ color: hype.color }}
            data-testid="text-hype-label"
          >
            {hype.label}
          </span>
        </div>
      </div>
    </div>
  );
}
