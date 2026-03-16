import { useState } from "react";
import { Circle, Mic, Radio } from "lucide-react";

interface MixerPanelProps {
  engine: any;
  deckLayout: 2 | 4;
}

export function MixerPanel({ engine, deckLayout }: MixerPanelProps) {
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
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => engine.isRecording ? engine.stopRecording() : engine.startRecording()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              engine.isRecording
                ? "bg-[#ff453a] animate-neon-pulse"
                : "bg-white/5 hover:bg-white/10 border border-white/10"
            }`}
            style={engine.isRecording ? { boxShadow: "0 0 20px rgba(255,69,58,0.5)" } : {}}
            data-testid="button-record"
          >
            <Circle className={`w-4 h-4 ${engine.isRecording ? "text-white" : "text-[#ff453a]"}`} fill={engine.isRecording ? "white" : "none"} />
          </button>

          {engine.recordingUrl && (
            <a
              href={engine.recordingUrl}
              download="dj-hybrid-mix.webm"
              className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 hover:bg-[#30d158]/25 transition-all"
              data-testid="link-download-recording"
            >
              Download Mix
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

      <div className="flex gap-2">
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
    </div>
  );
}
