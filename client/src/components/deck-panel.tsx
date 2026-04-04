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

/* ── Plasma Mirrored Waveform ── */
function WaveformDisplay({ waveformData, currentTime, duration, color, onSeek }: {
  waveformData: number[];
  currentTime: number;
  duration: number;
  color: string;
  onSeek: (time: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const animRef = useRef<number>(0);

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

    const parseHex = (hex: string): [number, number, number] => {
      const c = hex.replace("#", "");
      if (c.length === 3) return [parseInt(c[0]+c[0],16), parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16)];
      return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
    };
    const [cr, cg, cb] = parseHex(color.startsWith("#") ? color : "#bf5af2");

    const render = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, w, h);

      // Dark glass background
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.04)`;
      ctx.fillRect(0, 0, w, h);

      if (waveformData.length === 0) {
        // Idle animation — sine wave placeholder
        const t = frameRef.current * 0.03;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.05 + t) * h * 0.1 * Math.sin(x * 0.01 + t * 0.3);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.35)`;
        ctx.font = "11px 'Oxanium', Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DROP A TRACK", w / 2, h / 2 + 4);
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const progress = duration > 0 ? currentTime / duration : 0;
      const playedWidth = progress * w;
      const barCount = Math.min(waveformData.length, Math.floor(w / 2));
      const step = Math.floor(waveformData.length / barCount);
      const barW = Math.max(1.5, (w / barCount) - 0.8);

      // Center line
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.08)`;
      ctx.fillRect(0, h/2 - 0.5, w, 1);

      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(i * step, waveformData.length - 1);
        const val = waveformData[idx];
        const x = (i / barCount) * w;
        const barH = val * (h * 0.44);

        const played = x < playedWidth;
        const isNear = Math.abs(x - playedWidth) < w * 0.08;

        // Plasma color shift based on position and amplitude
        const heatVal = val > 0.7 ? 1 : val > 0.5 ? 0.6 : 0.3;
        const plasmaR = played ? Math.round(cr + heatVal * (255 - cr) * 0.4) : cr;
        const plasmaG = played ? Math.round(cg * (1 - heatVal * 0.3)) : Math.round(cg * 0.5);
        const plasmaB = played ? Math.round(cb * (1 - heatVal * 0.5)) : cb;
        const alpha = played ? 0.9 : 0.22;
        const glow = played && val > 0.6;

        if (glow) {
          ctx.shadowColor = `rgba(${plasmaR},${plasmaG},${plasmaB},0.8)`;
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }

        // Top half
        ctx.fillStyle = `rgba(${plasmaR},${plasmaG},${plasmaB},${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, h / 2 - barH, barW, barH, 1);
        ctx.fill();

        // Bottom half (mirror) — slightly dimmer
        ctx.fillStyle = `rgba(${plasmaR},${plasmaG},${plasmaB},${alpha * 0.55})`;
        ctx.beginPath();
        ctx.roundRect(x, h / 2, barW, barH, 1);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Glowing playhead
      ctx.save();
      const pgGrad = ctx.createLinearGradient(playedWidth - 2, 0, playedWidth + 2, 0);
      pgGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
      pgGrad.addColorStop(0.5, `rgba(255,255,255,0.95)`);
      pgGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = pgGrad;
      ctx.fillRect(playedWidth - 2, 0, 4, h);
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(playedWidth - 1, 0, 2, h);
      ctx.restore();

      // Beat grid lines (subtle)
      const beatCount = 16;
      for (let b = 1; b < beatCount; b++) {
        const bx = (b / beatCount) * w;
        ctx.fillStyle = b % 4 === 0 ? `rgba(${cr},${cg},${cb},0.2)` : `rgba(255,255,255,0.05)`;
        ctx.fillRect(bx, 0, 1, h);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
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
      className="w-full h-full rounded-lg cursor-crosshair"
      style={{ background: "rgba(0,0,0,0.3)" }}
      data-testid="canvas-waveform"
    />
  );
}

/* ── LED Canvas Jog Wheel ── */
function JogWheel({ deckId, engine, color }: { deckId: DeckId; engine: AudioEngine; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const rotationRef = useRef(0);
  const savedRateRef = useRef(1);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const size = 110;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 4;

    const parseHex = (hex: string): [number, number, number] => {
      const c = hex.replace("#", "");
      if (c.length === 3) return [parseInt(c[0]+c[0],16), parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16)];
      return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
    };
    const [cr, cg, cb] = parseHex(color.startsWith("#") ? color : "#bf5af2");
    const rgba = (a: number) => `rgba(${cr},${cg},${cb},${a})`;

    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, size, size);
      const isPlaying = engine.decks[deckId]?.isPlaying;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(isPlaying ? 0.35 : 0.12);
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── LED dot ring (chasing when playing) ──
      const ledCount = 24;
      for (let i = 0; i < ledCount; i++) {
        const ang = (i / ledCount) * Math.PI * 2 + rotationRef.current;
        const phase = (rotationRef.current * 3 / (Math.PI * 2) + i / ledCount) % 1;
        const ledBright = isPlaying
          ? 0.1 + 0.9 * Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 2.5)
          : 0.07 + (i % 6 === 0 ? 0.15 : 0);
        const dx = cx + (r + 1) * Math.cos(ang);
        const dy = cy + (r + 1) * Math.sin(ang);
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(ledBright);
        ctx.fill();
      }

      // Jog wheel body
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotationRef.current);

      // Dark rubber texture base
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r - 2);
      bodyGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0.12)`);
      bodyGrad.addColorStop(0.35, "rgba(18,10,35,0.95)");
      bodyGrad.addColorStop(0.85, "rgba(10,6,22,0.97)");
      bodyGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0.08)`);
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Rubber grip bumps (raised ridges)
      const ridgeCount = 16;
      for (let i = 0; i < ridgeCount; i++) {
        const ang = (i / ridgeCount) * Math.PI * 2;
        const ridgeR1 = r * 0.62;
        const ridgeR2 = r * 0.88;
        ctx.beginPath();
        ctx.moveTo(ridgeR1 * Math.cos(ang), ridgeR1 * Math.sin(ang));
        ctx.lineTo(ridgeR2 * Math.cos(ang), ridgeR2 * Math.sin(ang));
        ctx.strokeStyle = `rgba(255,255,255,0.06)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Inner metal hub
      const hubGrad = ctx.createRadialGradient(-4, -4, 0, 0, 0, r * 0.32);
      hubGrad.addColorStop(0, "rgba(200,190,230,0.9)");
      hubGrad.addColorStop(0.5, "rgba(120,100,160,0.8)");
      hubGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0.5)`);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();

      // Hub ring
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hub DECK label
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = `bold ${size * 0.11}px 'Oxanium', Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = rgba(0.8);
      ctx.shadowBlur = 8;
      ctx.fillText(deckId, 0, 0);
      ctx.shadowBlur = 0;

      // Position marker stripe
      ctx.beginPath();
      ctx.moveTo(0, -(r * 0.32 + 2));
      ctx.lineTo(0, -(r * 0.60));
      ctx.strokeStyle = rgba(0.9);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      if (isPlaying) {
        rotationRef.current += 0.018;
      }
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [engine, deckId, color, size]);

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
    rotationRef.current += delta * 0.04;

    const deckState = engine.decks[deckId];
    if (!deckState?.isPlaying) return;

    if (delta > 0) {
      engine.setRate(deckId, Math.min(3.0, 1.0 + Math.abs(delta) * 0.08));
    } else if (delta < 0) {
      const newTime = Math.max(0, deckState.currentTime - Math.abs(delta) * 0.008);
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
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        cursor: "grab",
        touchAction: "none",
        filter: engine.decks[deckId]?.isPlaying
          ? `drop-shadow(0 0 12px ${color}60)`
          : `drop-shadow(0 0 4px ${color}25)`,
        transition: "filter 0.3s ease",
      }}
      data-testid={`scratch-pad-${deckId}`}
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

export function DeckPanel({ deckId, engine, color }: DeckPanelProps) {
  const deck = engine.decks[deckId];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loopRollActive, setLoopRollActive] = useState<number | null>(null);

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
    <div
      className="flex flex-col gap-2 h-full overflow-hidden rounded-2xl p-3"
      style={{
        background: `linear-gradient(145deg, ${color}10 0%, rgba(8,4,20,0.95) 30%, rgba(5,2,15,0.98) 70%, ${color}08 100%)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 30px ${color}15, inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}
    >
      {/* ── Header: Deck badge + track name + key + load ── */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}aa)`,
              boxShadow: `0 0 12px ${color}70`,
              fontFamily: "'Oxanium', sans-serif",
            }}
            data-testid={`badge-deck-${deckId}`}
          >
            {deckId}
          </div>
          <span className="text-[9px] text-white/50 truncate" data-testid={`text-deck-filename-${deckId}`}>
            {deck.fileName ? deck.fileName.replace(/\.[^.]+$/, "") : "No Track Loaded"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div data-testid={`badge-key-${deckId}`}>
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
              style={deck.detectedKey && keyBadgeColor
                ? { background: `${keyBadgeColor}20`, border: `1px solid ${keyBadgeColor}50`, color: keyBadgeColor }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }
              }
            >
              <Music2 className="w-2.5 h-2.5" />
              {deck.detectedKey ? <span>{deck.camelotCode} {deck.detectedKey}</span> : <span>—</span>}
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 rounded-lg text-[9px] font-bold hover:opacity-80 transition-all"
            style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}
            data-testid={`button-load-${deckId}`}
          >
            <Upload className="w-3 h-3 inline mr-0.5" />Load
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFile} className="hidden" />
      </div>

      {/* ── Turntable + Jog Wheel ── */}
      <div className="flex justify-center items-center gap-3 py-1">
        <Turntable isPlaying={deck.isPlaying} color={color} size={100} bpm={deck.bpm} />
        <JogWheel deckId={deckId} engine={engine} color={color} />
      </div>

      {/* ── Plasma Waveform ── */}
      <div className="flex-1 min-h-[56px] max-h-[76px] rounded-xl overflow-hidden" style={{ border: `1px solid ${color}15` }}>
        <WaveformDisplay
          waveformData={deck.waveformData}
          currentTime={deck.currentTime}
          duration={deck.duration}
          color={color}
          onSeek={(t) => engine.seekDeck(deckId, t)}
        />
      </div>

      {/* ── Time + BPM bar ── */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 font-mono tabular-nums" data-testid={`text-current-time-${deckId}`}>
          {formatTime(deck.currentTime)}
        </span>
        {deck.bpm > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
            <span className="text-[10px] font-black" style={{ color, fontFamily: "'Oxanium', sans-serif" }}>
              {deck.bpm} BPM
            </span>
          </div>
        )}
        <span className="text-[10px] text-white/40 font-mono tabular-nums" data-testid={`text-duration-${deckId}`}>
          {formatTime(deck.duration)}
        </span>
      </div>

      {/* ── Transport controls ── */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => engine.setCue(deckId)}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          title="Set Cue"
          data-testid={`button-cue-${deckId}`}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => deck.isPlaying ? engine.pauseDeck(deckId) : engine.playDeck(deckId)}
          disabled={!deck.buffer}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
          style={{
            background: deck.isPlaying
              ? `linear-gradient(135deg, ${color}50, ${color}30)`
              : `linear-gradient(135deg, ${color}, ${color}cc)`,
            boxShadow: deck.isPlaying
              ? `0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.2)`
              : `0 0 30px ${color}70, 0 0 60px ${color}30, inset 0 1px 0 rgba(255,255,255,0.25)`,
            border: `1px solid ${color}50`,
          }}
          data-testid={`button-play-${deckId}`}
        >
          {deck.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={() => engine.jumpCue(deckId)}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
          title="Go to Cue"
          data-testid={`button-goto-cue-${deckId}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => engine.tapBpm(deckId)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-black transition-all hover:scale-110"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
          title="Tap BPM"
          data-testid={`button-tap-bpm-${deckId}`}
        >
          TAP
        </button>
      </div>

      {/* ── Loop roll buttons ── */}
      <div className="flex gap-1">
        {([1/8, 1/4, 1/2] as const).map((beats) => (
          <button
            key={beats}
            onPointerDown={() => startLoopRoll(beats)}
            onPointerUp={stopLoopRoll}
            onPointerLeave={stopLoopRoll}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all select-none"
            style={
              loopRollActive === beats
                ? { background: `${color}45`, color: "white", boxShadow: `0 0 12px ${color}50`, border: `1px solid ${color}60` }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }
            }
            data-testid={`button-loop-roll-${beats}-${deckId}`}
          >
            {beats === 1/8 ? "⅛" : beats === 1/4 ? "¼" : "½"}
          </button>
        ))}
      </div>

      {/* ── Advanced toggle ── */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
        data-testid={`button-advanced-${deckId}`}
      >
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showAdvanced ? "Less" : "More Controls"}
      </button>

      {showAdvanced && (
        <div className="space-y-2 animate-slide-in-up">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/35 w-12">Speed</span>
            <input type="range" min={0.5} max={2} step={0.01} value={deck.playbackRate}
              onChange={(e) => engine.setRate(deckId, parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
              data-testid={`slider-speed-${deckId}`} />
            <span className="text-[9px] text-white/40 font-mono w-10 text-right">{deck.playbackRate.toFixed(2)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/35 w-12">Volume</span>
            <input type="range" min={0} max={1} step={0.01} value={deck.volume}
              onChange={(e) => engine.setVolume(deckId, parseFloat(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
              data-testid={`slider-volume-${deckId}`} />
            <span className="text-[9px] text-white/40 font-mono w-10 text-right">{Math.round(deck.volume * 100)}%</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["low", "mid", "high"] as const).map((band) => (
              <div key={band} className="flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/25 uppercase tracking-widest">{band}</span>
                <input type="range" min={-12} max={12} step={0.5} value={deck.eq[band]}
                  onChange={(e) => engine.setEQ(deckId, band, parseFloat(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer slider-neon"
                  data-testid={`slider-eq-${band}-${deckId}`} />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4, 8, 16].map((beats) => (
              <button key={beats}
                onClick={() => engine.toggleLoop(deckId, beats, deck.bpm || 120)}
                className="flex-1 py-1 rounded-lg text-[9px] font-bold transition-all"
                style={
                  deck.loop.active && deck.loop.beats === beats
                    ? { background: `${color}40`, color: "white", boxShadow: `0 0 8px ${color}30` }
                    : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }
                }
                data-testid={`button-loop-${beats}-${deckId}`}
              >{beats}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {deck.hotCues.map((cue: any, i: number) => (
              <button key={i}
                onClick={() => cue ? engine.jumpHotCue(deckId, i) : engine.setHotCue(deckId, i)}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                style={{
                  background: cue ? `${cue.color}25` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${cue ? cue.color + "45" : "rgba(255,255,255,0.08)"}`,
                  color: cue ? cue.color : "rgba(255,255,255,0.3)",
                }}
                data-testid={`button-hotcue-${i}-${deckId}`}
              >{cue ? cue.label : `H${i + 1}`}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
