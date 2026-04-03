import { useState, useRef, useCallback, useEffect } from "react";
import { DeckId, useAudioEngine } from "@/hooks/use-audio-engine";
import { Play, Pause, SkipBack, Upload, RotateCcw, ChevronUp, ChevronDown, Music2 } from "lucide-react";
import { Turntable } from "@/components/turntable";

type AudioEngine = ReturnType<typeof useAudioEngine>;

interface DeckPanelProps {
  deckId: DeckId;
  engine: AudioEngine;
  color: string;
}

function WaveformDisplay({ waveformData, currentTime, duration, color, onSeek }: {
  waveformData: number[];
  currentTime: number;
  duration: number;
  color: string;
  onSeek: (time: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (waveformData.length === 0) {
      ctx.fillStyle = `${color}10`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `${color}40`;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Load a track", w / 2, h / 2 + 4);
      return;
    }

    const progress = duration > 0 ? currentTime / duration : 0;
    const playedWidth = progress * w;
    const barWidth = Math.max(1, w / waveformData.length - 0.5);

    waveformData.forEach((val, i) => {
      const x = (i / waveformData.length) * w;
      const barH = val * h * 0.8;
      const y = (h - barH) / 2;

      if (x < playedWidth) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = `${color}30`;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(playedWidth - 1, 0, 2, h);
  }, [waveformData, currentTime, duration, color]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onSeek(x * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="w-full h-full rounded-lg cursor-pointer"
      style={{ background: `${color}08` }}
      data-testid="canvas-waveform"
    />
  );
}

function getCamelotNum(code: string): number {
  return parseInt(code) || 0;
}

function isCompatibleKey(codeA: string, codeB: string): "compatible" | "partial" | "incompatible" {
  if (!codeA || !codeB) return "incompatible";
  if (codeA === codeB) return "compatible";
  const numA = getCamelotNum(codeA);
  const numB = getCamelotNum(codeB);
  const letterA = codeA.replace(/\d/g, "");
  const letterB = codeB.replace(/\d/g, "");
  const adj = ((numA - numB + 12) % 12 === 1 || (numB - numA + 12) % 12 === 1);
  if (adj) return "compatible";
  if (letterA !== letterB && numA === numB) return "partial";
  return "incompatible";
}

function VirtualScratchPad({ deckId, engine, color }: { deckId: DeckId; engine: AudioEngine; color: string }) {
  const platRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const savedRateRef = useRef(1);
  const animRef = useRef<number>(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    savedRateRef.current = engine.decks[deckId]?.playbackRate ?? 1;
  }, [engine, deckId]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    lastX.current = e.clientX;
    lastY.current = e.clientY;

    const delta = dx - dy * 0.3;
    rotationRef.current += delta * 1.5;
    setRotation(rotationRef.current);

    const deckState = engine.decks[deckId];
    if (!deckState?.isPlaying) return;

    if (delta > 0) {
      const forwardRate = Math.min(3.0, 1.0 + Math.abs(delta) * 0.08);
      engine.setRate(deckId, forwardRate);
    } else if (delta < 0) {
      const rewindAmount = Math.abs(delta) * 0.008;
      const newTime = Math.max(0, deckState.currentTime - rewindAmount);
      engine.seekDeck(deckId, newTime);
      engine.setRate(deckId, 0.05);
    } else {
      engine.setRate(deckId, 0.01);
    }
  }, [engine, deckId]);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    engine.setRate(deckId, savedRateRef.current);
  }, [engine, deckId]);

  return (
    <div
      ref={platRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="w-16 h-16 rounded-full cursor-grab active:cursor-grabbing select-none flex items-center justify-center relative overflow-hidden"
      style={{
        background: `radial-gradient(circle, ${color}30 0%, ${color}10 60%, transparent 100%)`,
        border: `2px solid ${color}40`,
        boxShadow: `0 0 12px ${color}30`,
        transform: `rotate(${rotation}deg)`,
        touchAction: "none",
      }}
      data-testid={`scratch-pad-${deckId}`}
    >
      <div className="absolute inset-0 rounded-full" style={{
        background: `conic-gradient(from 0deg, ${color}50, transparent 45deg, ${color}30 90deg, transparent 135deg, ${color}50 180deg, transparent 225deg, ${color}30 270deg, transparent 315deg, ${color}50 360deg)`
      }} />
      <div className="w-4 h-4 rounded-full z-10" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

export function DeckPanel({ deckId, engine, color }: DeckPanelProps) {
  const deck = engine.decks[deckId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loopRollActive, setLoopRollActive] = useState<number | null>(null);
  const loopRollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) engine.loadFile(file, deckId);
  }, [engine, deckId]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startLoopRoll = useCallback((beats: number) => {
    setLoopRollActive(beats);
    engine.toggleLoop(deckId, beats, deck.bpm || 120);
  }, [engine, deckId, deck.bpm]);

  const stopLoopRoll = useCallback(() => {
    setLoopRollActive(null);
    engine.toggleLoop(deckId, loopRollActive ?? 0.25, deck.bpm || 120);
  }, [engine, deckId, loopRollActive, deck.bpm]);

  const otherDeckIds = (["A", "B", "C", "D"] as DeckId[]).filter(id => id !== deckId && engine.decks[id]?.detectedKey);
  const compatibilityColors = otherDeckIds.map(id => {
    const compat = isCompatibleKey(deck.camelotCode, engine.decks[id].camelotCode);
    return { id, compat };
  });

  const keyBadgeColor = (() => {
    if (!deck.detectedKey) return null;
    const worst = compatibilityColors.some(c => c.compat === "incompatible");
    const best = compatibilityColors.some(c => c.compat === "compatible") || compatibilityColors.length === 0;
    if (best) return "#30d158";
    if (worst) return "#ff453a";
    return "#ffd60a";
  })();

  return (
    <div className="deck-surface p-3 flex flex-col gap-2 h-full overflow-hidden" style={{ borderColor: `${color}20` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ background: color, boxShadow: `0 0 10px ${color}60` }}
            data-testid={`badge-deck-${deckId}`}
          >
            {deckId}
          </div>
          <span className="text-[10px] text-white/40 truncate max-w-[100px]" data-testid={`text-deck-filename-${deckId}`}>
            {deck.fileName || "No Track Loaded"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="flex flex-col items-end gap-0.5"
            data-testid={`badge-key-${deckId}`}
          >
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
              style={deck.detectedKey && keyBadgeColor ? { background: `${keyBadgeColor}20`, border: `1px solid ${keyBadgeColor}50`, color: keyBadgeColor } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.25)" }}
              title={deck.detectedKey ? `Key: ${deck.detectedKey} (Camelot: ${deck.camelotCode})` : "Key: load a track to detect"}
            >
              <Music2 className="w-2.5 h-2.5" />
              {deck.detectedKey ? (
                <>
                  <span>{deck.camelotCode}</span>
                  <span className="opacity-70">{deck.detectedKey}</span>
                </>
              ) : (
                <span>—</span>
              )}
            </div>
            {deck.detectedKey && compatibilityColors.length > 0 && (
              <div className="flex items-center gap-1 px-1.5">
                {compatibilityColors.map(({ id, compat }) => {
                  const dotColor = compat === "compatible" ? "#30d158" : compat === "partial" ? "#ffd60a" : "#ff453a";
                  return (
                    <div
                      key={id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }}
                      title={`Deck ${id}: ${compat}`}
                      data-testid={`badge-compat-${deckId}-${id}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 rounded-md text-[10px] font-medium hover:bg-white/10 transition-colors"
            style={{ color, border: `1px solid ${color}30` }}
            data-testid={`button-load-${deckId}`}
          >
            <Upload className="w-3 h-3 inline mr-1" />Load
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
      </div>

      <div className="flex justify-center items-center gap-3 py-1">
        <Turntable isPlaying={deck.isPlaying} color={color} size={90} deckLabel={deckId} />
        <VirtualScratchPad deckId={deckId} engine={engine} color={color} />
      </div>

      <div className="flex-1 min-h-[60px] max-h-[80px]">
        <WaveformDisplay
          waveformData={deck.waveformData}
          currentTime={deck.currentTime}
          duration={deck.duration}
          color={color}
          onSeek={(t) => engine.seekDeck(deckId, t)}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
        <span data-testid={`text-current-time-${deckId}`}>{formatTime(deck.currentTime)}</span>
        {deck.bpm > 0 && (
          <span className="text-[9px] font-bold" style={{ color }}>
            {deck.bpm} BPM
          </span>
        )}
        <span data-testid={`text-duration-${deckId}`}>{formatTime(deck.duration)}</span>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => engine.setCue(deckId)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          title="Set Cue"
          data-testid={`button-cue-${deckId}`}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => deck.isPlaying ? engine.pauseDeck(deckId) : engine.playDeck(deckId)}
          disabled={!deck.buffer}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-30"
          style={{
            background: deck.isPlaying ? `${color}30` : color,
            boxShadow: deck.isPlaying ? "none" : `0 0 20px ${color}50`,
          }}
          data-testid={`button-play-${deckId}`}
        >
          {deck.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button
          onClick={() => engine.jumpCue(deckId)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          title="Go to Cue"
          data-testid={`button-goto-cue-${deckId}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => engine.tapBpm(deckId)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-white/5 hover:bg-white/10 transition-all"
          style={{ color }}
          title="Tap to detect BPM"
          data-testid={`button-tap-bpm-${deckId}`}
        >
          TAP
        </button>
      </div>

      <div className="flex gap-1">
        {([1/8, 1/4, 1/2] as const).map((beats) => (
          <button
            key={beats}
            onPointerDown={() => startLoopRoll(beats)}
            onPointerUp={stopLoopRoll}
            onPointerLeave={stopLoopRoll}
            className={`flex-1 py-1 rounded text-[9px] font-bold transition-all select-none ${
              loopRollActive === beats ? "text-white" : "text-white/30 hover:text-white/60"
            }`}
            style={
              loopRollActive === beats
                ? { background: `${color}50`, boxShadow: `0 0 10px ${color}40` }
                : { background: "rgba(255,255,255,0.04)" }
            }
            data-testid={`button-loop-roll-${beats}-${deckId}`}
          >
            {beats === 1/8 ? "1/8" : beats === 1/4 ? "1/4" : "1/2"}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
        data-testid={`button-advanced-${deckId}`}
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showAdvanced ? "Less" : "More Controls"}
      </button>

      {showAdvanced && (
        <div className="space-y-2 animate-slide-in-up">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-12">Speed</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.01}
              value={deck.playbackRate}
              onChange={(e) => engine.setRate(deckId, parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
              data-testid={`slider-speed-${deckId}`}
            />
            <span className="text-[10px] text-white/50 font-mono w-10 text-right">{deck.playbackRate.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 w-12">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={deck.volume}
              onChange={(e) => engine.setVolume(deckId, parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
              data-testid={`slider-volume-${deckId}`}
            />
            <span className="text-[10px] text-white/50 font-mono w-10 text-right">{Math.round(deck.volume * 100)}%</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["low", "mid", "high"] as const).map((band) => (
              <div key={band} className="flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/30 uppercase">{band}</span>
                <input
                  type="range" min={-12} max={12} step={0.5} value={deck.eq[band]}
                  onChange={(e) => engine.setEQ(deckId, band, parseFloat(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer slider-neon"
                  data-testid={`slider-eq-${band}-${deckId}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4, 8, 16].map((beats) => (
              <button
                key={beats}
                onClick={() => engine.toggleLoop(deckId, beats, deck.bpm || 120)}
                className={`flex-1 py-1 rounded text-[9px] font-bold transition-all ${
                  deck.loop.active && deck.loop.beats === beats
                    ? "text-white"
                    : "text-white/30 hover:text-white/60"
                }`}
                style={
                  deck.loop.active && deck.loop.beats === beats
                    ? { background: `${color}40`, boxShadow: `0 0 10px ${color}30` }
                    : { background: "rgba(255,255,255,0.05)" }
                }
                data-testid={`button-loop-${beats}-${deckId}`}
              >
                {beats}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {deck.hotCues.map((cue: any, i: number) => (
              <button
                key={i}
                onClick={() => cue ? engine.jumpHotCue(deckId, i) : engine.setHotCue(deckId, i)}
                className="flex-1 py-1.5 rounded text-[9px] font-bold transition-all"
                style={{
                  background: cue ? `${cue.color}30` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${cue ? cue.color + "50" : "rgba(255,255,255,0.1)"}`,
                  color: cue ? cue.color : "rgba(255,255,255,0.3)",
                }}
                data-testid={`button-hotcue-${i}-${deckId}`}
              >
                {cue ? cue.label : `H${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
