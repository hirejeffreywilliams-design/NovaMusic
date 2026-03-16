import { DeckId } from "@/hooks/use-audio-engine";
import { Sliders, Waves, Clock, Volume2 } from "lucide-react";

interface FXPanelProps {
  engine: any;
}

const DECK_COLORS: Record<string, string> = {
  A: "#bf5af2",
  B: "#0af",
  C: "#ff2d78",
  D: "#30d158",
};

function FXKnob({ label, value, min, max, step, onChange, color, unit }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  color: string;
  unit?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[9px] text-white/40 uppercase tracking-wider">{label}</span>
      <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${color}10`, border: `2px solid ${color}30` }}>
        <div className="absolute inset-1 rounded-full" style={{
          background: `conic-gradient(from 225deg, ${color}60 ${pct * 2.7}deg, transparent ${pct * 2.7}deg)`,
        }} />
        <span className="relative text-[10px] font-bold text-white/80 z-10">
          {typeof value === "number" ? (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value < 1 ? value.toFixed(2) : Math.round(value)) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-16 h-0.5 rounded-full appearance-none cursor-pointer slider-neon opacity-60"
      />
      {unit && <span className="text-[8px] text-white/20">{unit}</span>}
    </div>
  );
}

function DeckFX({ deckId, engine }: { deckId: DeckId; engine: any }) {
  const deck = engine.decks[deckId];
  const color = DECK_COLORS[deckId];

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4" style={{ borderColor: `${color}20` }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: color }}>
          {deckId}
        </div>
        <span className="text-sm font-bold" style={{ color }}>Deck {deckId} Effects</span>
        <span className="text-[10px] text-white/30 ml-auto truncate max-w-[120px]">{deck.fileName || "No Track"}</span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5" style={{ color }} />
            <span className="text-xs font-medium text-white/70">Filter</span>
          </div>
          <button
            onClick={() => engine.toggleFilter(deckId, !deck.fx.filterEnabled)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              deck.fx.filterEnabled
                ? "text-white"
                : "text-white/30 bg-white/5"
            }`}
            style={deck.fx.filterEnabled ? { background: `${color}40`, boxShadow: `0 0 10px ${color}30` } : {}}
            data-testid={`button-filter-toggle-${deckId}`}
          >
            {deck.fx.filterEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            <button
              onClick={() => engine.setFilter(deckId, deck.fx.filterFreq, "lowpass")}
              className={`px-2 py-1 rounded text-[9px] font-medium ${deck.fx.filterType === "lowpass" ? "bg-white/10 text-white" : "text-white/30"}`}
              data-testid={`button-filter-lpf-${deckId}`}
            >
              LPF
            </button>
            <button
              onClick={() => engine.setFilter(deckId, deck.fx.filterFreq, "highpass")}
              className={`px-2 py-1 rounded text-[9px] font-medium ${deck.fx.filterType === "highpass" ? "bg-white/10 text-white" : "text-white/30"}`}
              data-testid={`button-filter-hpf-${deckId}`}
            >
              HPF
            </button>
          </div>
          <FXKnob label="Freq" value={deck.fx.filterFreq} min={20} max={20000} step={10} onChange={(v) => engine.setFilter(deckId, v, deck.fx.filterType)} color={color} unit="Hz" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" style={{ color }} />
            <span className="text-xs font-medium text-white/70">Reverb</span>
          </div>
          <button
            onClick={() => engine.setReverb(deckId, deck.fx.reverbMix, !deck.fx.reverbEnabled)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              deck.fx.reverbEnabled ? "text-white" : "text-white/30 bg-white/5"
            }`}
            style={deck.fx.reverbEnabled ? { background: `${color}40`, boxShadow: `0 0 10px ${color}30` } : {}}
            data-testid={`button-reverb-toggle-${deckId}`}
          >
            {deck.fx.reverbEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex justify-center">
          <FXKnob label="Mix" value={deck.fx.reverbMix} min={0} max={1} step={0.01} onChange={(v) => engine.setReverb(deckId, v, deck.fx.reverbEnabled)} color={color} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color }} />
            <span className="text-xs font-medium text-white/70">Delay</span>
          </div>
          <button
            onClick={() => engine.setDelay(deckId, deck.fx.delayTime, deck.fx.delayFeedback, !deck.fx.delayEnabled)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
              deck.fx.delayEnabled ? "text-white" : "text-white/30 bg-white/5"
            }`}
            style={deck.fx.delayEnabled ? { background: `${color}40`, boxShadow: `0 0 10px ${color}30` } : {}}
            data-testid={`button-delay-toggle-${deckId}`}
          >
            {deck.fx.delayEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center justify-center gap-4">
          <FXKnob label="Time" value={deck.fx.delayTime} min={0.01} max={1} step={0.01} onChange={(v) => engine.setDelay(deckId, v, deck.fx.delayFeedback, deck.fx.delayEnabled)} color={color} unit="sec" />
          <FXKnob label="Feedback" value={deck.fx.delayFeedback} min={0} max={0.9} step={0.01} onChange={(v) => engine.setDelay(deckId, deck.fx.delayTime, v, deck.fx.delayEnabled)} color={color} />
        </div>
      </div>

      <div>
        <span className="text-xs font-medium text-white/70 block mb-2">3-Band EQ</span>
        <div className="flex items-center justify-center gap-6">
          <FXKnob label="Low" value={deck.eq.low} min={-12} max={12} step={0.5} onChange={(v) => engine.setEQ(deckId, "low", v)} color={color} unit="dB" />
          <FXKnob label="Mid" value={deck.eq.mid} min={-12} max={12} step={0.5} onChange={(v) => engine.setEQ(deckId, "mid", v)} color={color} unit="dB" />
          <FXKnob label="High" value={deck.eq.high} min={-12} max={12} step={0.5} onChange={(v) => engine.setEQ(deckId, "high", v)} color={color} unit="dB" />
        </div>
      </div>
    </div>
  );
}

export function FXPanel({ engine }: FXPanelProps) {
  return (
    <div className="h-full overflow-auto p-2">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Sliders className="w-5 h-5 text-[#bf5af2]" />
        <h2 className="text-lg font-bold neon-text-purple" data-testid="text-fx-title">FX Rack</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DeckFX deckId="A" engine={engine} />
        <DeckFX deckId="B" engine={engine} />
      </div>
    </div>
  );
}
