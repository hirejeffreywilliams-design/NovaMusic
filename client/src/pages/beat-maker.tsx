import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Disc3,
  Play,
  Square,
  Trash2,
  Save,
  ChevronDown,
} from "lucide-react";

const STEPS = 16;
const ROW_LABELS = ["Kick", "Snare", "Hi-Hat", "Open Hat", "Clap", "Tom", "Rim", "Crash"] as const;
const ROWS = ROW_LABELS.length;

const KEYS = ["C", "D", "E", "F", "G", "A", "B"];
const SCALES = ["Major", "Minor"];
const GENRES = ["Electronic", "Hip-Hop", "Lo-fi", "Trap", "House", "Drum & Bass", "Ambient", "Pop"];

const ROW_COLORS: Record<string, string> = {
  Kick: "#0EA5E9",
  Snare: "#06B6D4",
  "Hi-Hat": "#0EA5E9",
  "Open Hat": "#06B6D4",
  Clap: "#0EA5E9",
  Tom: "#06B6D4",
  Rim: "#0EA5E9",
  Crash: "#06B6D4",
};

type Grid = boolean[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(STEPS).fill(false));
}

export default function BeatMakerPage() {
  const [, navigate] = useLocation();

  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [bpm, setBpm] = useState(120);
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedScale, setSelectedScale] = useState("Major");
  const [selectedGenre, setSelectedGenre] = useState("Electronic");
  const [beatName, setBeatName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toggle a cell in the grid
  const toggleCell = useCallback((row: number, step: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][step] = !next[row][step];
      return next;
    });
  }, []);

  // Clear entire grid
  const clearAll = useCallback(() => {
    setGrid(createEmptyGrid());
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  // Play/Stop sequencer (visual only)
  useEffect(() => {
    if (isPlaying) {
      const stepDuration = (60 / bpm / 4) * 1000; // 16th notes
      setCurrentStep(0);
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % STEPS);
      }, stepDuration);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentStep(-1);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, bpm]);

  // Save beat
  const saveBeat = useCallback(async () => {
    if (!beatName.trim()) {
      setSaveMessage("Please enter a beat name.");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: beatName.trim(),
          pattern: grid,
          bpm,
          key: `${selectedKey} ${selectedScale}`,
          genre: selectedGenre,
          steps: STEPS,
          rows: ROW_LABELS,
        }),
      });
      if (!res.ok) throw new Error("Failed to save beat");
      setSaveMessage("Beat saved successfully!");
    } catch {
      setSaveMessage("Could not save beat. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [beatName, grid, bpm, selectedKey, selectedScale, selectedGenre]);

  // Count active cells
  const activeCount = grid.reduce((sum, row) => sum + row.filter(Boolean).length, 0);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(16px)",
          borderColor: "#1e1e1e",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#0EA5E9" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-5" style={{ background: "#1e1e1e" }} />
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5" style={{ color: "#0EA5E9" }} />
            <h1 className="text-lg font-bold tracking-tight">Beat Maker</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>{activeCount} hits</span>
          <span className="mx-1">|</span>
          <span>{bpm} BPM</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Controls Panel */}
        <section
          className="rounded-2xl border p-5"
          style={{
            background: "rgba(17, 17, 17, 0.6)",
            backdropFilter: "blur(12px)",
            borderColor: "#1e1e1e",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Beat Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                Beat Name
              </label>
              <input
                type="text"
                value={beatName}
                onChange={(e) => setBeatName(e.target.value)}
                placeholder="Untitled Beat"
                className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-1"
                style={{
                  background: "#0a0a0a",
                  borderColor: "#1e1e1e",
                  color: "#ffffff",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0EA5E9")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>

            {/* BPM Slider */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                BPM: {bpm}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>60</span>
                <input
                  type="range"
                  min={60}
                  max={200}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #0EA5E9 ${((bpm - 60) / 140) * 100}%, #1e1e1e ${((bpm - 60) / 140) * 100}%)`,
                  }}
                />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>200</span>
              </div>
            </div>

            {/* Key Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                    style={{ background: "#0a0a0a", borderColor: "#1e1e1e", color: "#ffffff" }}
                  >
                    {KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="relative flex-1">
                  <select
                    value={selectedScale}
                    onChange={(e) => setSelectedScale(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                    style={{ background: "#0a0a0a", borderColor: "#1e1e1e", color: "#ffffff" }}
                  >
                    {SCALES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
              </div>
            </div>

            {/* Genre Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                Genre
              </label>
              <div className="relative">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                  style={{ background: "#0a0a0a", borderColor: "#1e1e1e", color: "#ffffff" }}
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t" style={{ borderColor: "#1e1e1e" }}>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                background: isPlaying
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #0EA5E9, #06B6D4)",
                color: "#ffffff",
                boxShadow: isPlaying
                  ? "0 0 20px rgba(239,68,68,0.3)"
                  : "0 0 20px rgba(14,165,233,0.3)",
              }}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? "Stop" : "Play"}
            </button>

            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:scale-105 active:scale-95"
              style={{ borderColor: "#1e1e1e", color: "rgba(255,255,255,0.6)", background: "transparent" }}
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>

            <button
              onClick={saveBeat}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "#0EA5E9",
                color: "#0EA5E9",
                background: "rgba(14, 165, 233, 0.08)",
              }}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Beat"}
            </button>

            {saveMessage && (
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  color: saveMessage.includes("success") ? "#30d158" : "#ff453a",
                  background: saveMessage.includes("success") ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)",
                }}
              >
                {saveMessage}
              </span>
            )}
          </div>
        </section>

        {/* Step Indicator */}
        <div className="flex gap-1 px-1">
          <div className="w-20 shrink-0" />
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center"
            >
              <div
                className="w-2 h-2 rounded-full transition-all duration-100"
                style={{
                  background: currentStep === i ? "#0EA5E9" : "rgba(255,255,255,0.08)",
                  boxShadow: currentStep === i ? "0 0 8px #0EA5E9, 0 0 16px rgba(14,165,233,0.3)" : "none",
                  transform: currentStep === i ? "scale(1.5)" : "scale(1)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Step Numbers */}
        <div className="flex gap-1 px-1 -mt-4">
          <div className="w-20 shrink-0" />
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[9px] font-mono"
              style={{ color: currentStep === i ? "#0EA5E9" : "rgba(255,255,255,0.15)" }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Drum Machine Grid */}
        <section
          className="rounded-2xl border overflow-x-auto"
          style={{
            background: "rgba(17, 17, 17, 0.6)",
            backdropFilter: "blur(12px)",
            borderColor: "#1e1e1e",
          }}
        >
          <div className="min-w-[640px] p-4">
            {ROW_LABELS.map((label, rowIdx) => {
              const accentColor = ROW_COLORS[label] || "#0EA5E9";
              return (
                <div
                  key={label}
                  className="flex items-center gap-1 mb-1 last:mb-0"
                >
                  {/* Row Label */}
                  <div
                    className="w-20 shrink-0 text-xs font-bold tracking-wide text-right pr-3 py-2"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {label}
                  </div>

                  {/* Step Cells */}
                  {Array.from({ length: STEPS }, (_, stepIdx) => {
                    const active = grid[rowIdx][stepIdx];
                    const isCurrent = currentStep === stepIdx;
                    const isDownbeat = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => toggleCell(rowIdx, stepIdx)}
                        className="flex-1 aspect-square rounded-md transition-all duration-100 hover:scale-110 active:scale-95 border"
                        style={{
                          background: active
                            ? accentColor
                            : isCurrent
                              ? "rgba(255,255,255,0.06)"
                              : isDownbeat
                                ? "rgba(255,255,255,0.03)"
                                : "#0a0a0a",
                          borderColor: active
                            ? accentColor
                            : isCurrent
                              ? "rgba(14,165,233,0.3)"
                              : "#1e1e1e",
                          boxShadow: active
                            ? `0 0 10px ${accentColor}50, inset 0 1px 0 rgba(255,255,255,0.2)`
                            : "none",
                          opacity: active ? 1 : isCurrent ? 0.9 : 0.7,
                        }}
                        title={`${label} - Step ${stepIdx + 1}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Grid Legend */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t text-[10px]"
            style={{ borderColor: "#1e1e1e", color: "rgba(255,255,255,0.25)" }}
          >
            <span>Click cells to toggle hits</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: "#0EA5E9", boxShadow: "0 0 6px rgba(14,165,233,0.4)" }}
                />
                Active
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm border"
                  style={{ background: "#0a0a0a", borderColor: "#1e1e1e" }}
                />
                Inactive
              </span>
            </div>
          </div>
        </section>

        {/* Pattern Summary */}
        <section
          className="rounded-2xl border p-5"
          style={{
            background: "rgba(17, 17, 17, 0.6)",
            backdropFilter: "blur(12px)",
            borderColor: "#1e1e1e",
          }}
        >
          <h3
            className="text-[11px] font-semibold tracking-wider uppercase mb-3"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Pattern Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ROW_LABELS.map((label, rowIdx) => {
              const count = grid[rowIdx].filter(Boolean).length;
              const pct = (count / STEPS) * 100;
              return (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {label}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {count}/{STEPS}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: ROW_COLORS[label] || "#0EA5E9",
                        boxShadow: count > 0 ? `0 0 6px ${ROW_COLORS[label] || "#0EA5E9"}40` : "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
