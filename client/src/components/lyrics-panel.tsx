import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Search, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LyricsPanelProps {
  nowPlaying?: string | null;
  onCrowdSing?: (line: string) => void;
  onLineChange?: (lineIndex: number) => void;
  isDJ?: boolean;
  crowdSingLine?: string | null;
  remoteLineIndex?: number | null;
}

async function fetchLyrics(title: string, artist: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.lyrics) return data.lyrics;
    }
  } catch {}

  if (artist.trim() && title.trim()) {
    try {
      const resp = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist.trim())}/${encodeURIComponent(title.trim())}`, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.lyrics) return data.lyrics;
      }
    } catch {}
  }

  return null;
}

function parseLyrics(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

export function LyricsPanel({ nowPlaying, onCrowdSing, onLineChange, isDJ = false, crowdSingLine, remoteLineIndex }: LyricsPanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [activeLine, setActiveLine] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [artistInput, setArtistInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [pulsingCrowd, setPulsingCrowd] = useState(false);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const prevNowPlaying = useRef<string | null>(null);
  const prevActiveLineRef = useRef<number>(-1);

  const autoScrollToActive = useCallback(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  useEffect(() => {
    autoScrollToActive();
    if (isDJ && onLineChange && activeLine !== prevActiveLineRef.current) {
      prevActiveLineRef.current = activeLine;
      onLineChange(activeLine);
    }
  }, [activeLine, autoScrollToActive, isDJ, onLineChange]);

  useEffect(() => {
    if (!isDJ && remoteLineIndex != null && remoteLineIndex !== activeLine) {
      setActiveLine(remoteLineIndex);
      if (!open) setOpen(true);
    }
  }, [remoteLineIndex, isDJ]);

  useEffect(() => {
    if (crowdSingLine) {
      setPulsingCrowd(true);
      const t = setTimeout(() => setPulsingCrowd(false), 4000);
      return () => clearTimeout(t);
    }
  }, [crowdSingLine]);

  useEffect(() => {
    if (!nowPlaying || nowPlaying === prevNowPlaying.current) return;
    prevNowPlaying.current = nowPlaying;
    setLines([]);
    setActiveLine(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const parts = nowPlaying.split(/[-–—]/);
    let title = nowPlaying;
    let artist = "";
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }
    setTitleInput(title);
    setArtistInput(artist);

    setLoading(true);
    fetchLyrics(title, artist).then(raw => {
      if (raw) {
        const parsed = parseLyrics(raw);
        setLines(parsed);
        setActiveLine(0);
        toast({ title: "Lyrics loaded!", description: `${parsed.length} lines` });
      } else {
        toast({ title: "Lyrics not found", description: "Paste them manually below." });
        setShowManual(true);
      }
      setLoading(false);
    });
  }, [nowPlaying, toast]);

  const handleSearch = useCallback(() => {
    if (!titleInput.trim()) return;
    setLines([]);
    setActiveLine(0);
    setLoading(true);
    fetchLyrics(titleInput, artistInput).then(raw => {
      if (raw) {
        const parsed = parseLyrics(raw);
        setLines(parsed);
        setActiveLine(0);
        setShowManual(false);
        toast({ title: "Lyrics loaded!" });
      } else {
        toast({ title: "Lyrics not found", description: "Try pasting manually." });
        setShowManual(true);
      }
      setLoading(false);
    });
  }, [titleInput, artistInput, toast]);

  const applyManual = useCallback(() => {
    if (!manualInput.trim()) return;
    const parsed = parseLyrics(manualInput);
    setLines(parsed);
    setActiveLine(0);
    setShowManual(false);
    setManualInput("");
    toast({ title: `Lyrics set! ${parsed.length} lines.` });
  }, [manualInput, toast]);

  const handleCrowdSing = useCallback((line: string) => {
    if (onCrowdSing) onCrowdSing(line);
    toast({ title: "🎤 Crowd Sing triggered!", description: line.slice(0, 40) });
  }, [onCrowdSing, toast]);

  const startAutoScroll = useCallback((msPerLine = 3000) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setActiveLine(prev => {
        if (prev >= lines.length - 1) {
          clearInterval(intervalRef.current!);
          return prev;
        }
        return prev + 1;
      });
    }, msPerLine);
  }, [lines.length]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all"
        style={{ background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.2)", color: "rgba(255,214,10,0.7)" }}
        data-testid="button-lyrics-open"
      >
        <span>🎤 Lyrics Teleprompter</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,214,10,0.2)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(255,214,10,0.08)" }}>
        <span className="text-xs font-black text-[#ffd60a]">🎤 Lyrics Teleprompter</span>
        <div className="flex items-center gap-1">
          {lines.length > 0 && isDJ && (
            <>
              <button onClick={() => startAutoScroll(3000)} className="text-[9px] text-[#ffd60a]/60 hover:text-[#ffd60a] px-1.5 py-1 border border-[#ffd60a]/20 rounded" data-testid="button-lyrics-autoscroll">Auto</button>
              <button onClick={stopAutoScroll} className="text-[9px] text-white/40 hover:text-white/60 px-1.5 py-1 border border-white/10 rounded" data-testid="button-lyrics-stop-autoscroll">Stop</button>
            </>
          )}
          <button onClick={() => setOpen(false)} className="p-1 text-white/30 hover:text-white/60" data-testid="button-lyrics-close">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isDJ && (
        <div className="px-3 py-2 border-b border-white/5 space-y-2">
          <div className="flex gap-1">
            <input
              value={artistInput}
              onChange={e => setArtistInput(e.target.value)}
              placeholder="Artist..."
              className="flex-1 px-2 py-1.5 rounded-lg text-[10px] bg-white/8 border border-white/15 text-white placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a]"
              data-testid="input-lyrics-artist"
            />
            <input
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              placeholder="Track title..."
              className="flex-1 px-2 py-1.5 rounded-lg text-[10px] bg-white/8 border border-white/15 text-white placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a]"
              data-testid="input-lyrics-title"
              onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !titleInput.trim()}
              className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
              style={{ background: "rgba(255,214,10,0.25)", border: "1px solid rgba(255,214,10,0.3)" }}
              data-testid="button-lyrics-search"
            >
              {loading ? "..." : <Search className="w-3 h-3" />}
            </button>
          </div>
          <button
            onClick={() => setShowManual(v => !v)}
            className="text-[9px] text-white/30 hover:text-white/50"
            data-testid="button-lyrics-manual"
          >
            {showManual ? "Hide manual" : "Paste manually"}
          </button>
          {showManual && (
            <div className="space-y-1">
              <textarea
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Paste lyrics here, one line per line..."
                rows={4}
                className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-white/8 border border-white/15 text-white placeholder:text-white/20 focus:outline-none resize-none"
                data-testid="textarea-lyrics-manual"
              />
              <button
                onClick={applyManual}
                disabled={!manualInput.trim()}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
                style={{ background: "rgba(255,214,10,0.2)", border: "1px solid rgba(255,214,10,0.3)" }}
                data-testid="button-lyrics-apply"
              >Apply Lyrics</button>
            </div>
          )}
        </div>
      )}

      {lines.length === 0 && !loading && (
        <div className="py-8 text-center text-white/25 text-xs">
          {isDJ ? "Load a track or search for lyrics above." : "Lyrics will appear when the DJ loads a track."}
        </div>
      )}
      {loading && (
        <div className="py-8 text-center text-[#ffd60a]/50 text-xs animate-pulse">Fetching lyrics...</div>
      )}

      {lines.length > 0 && (
        <div ref={containerRef} className="max-h-48 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin">
          {lines.map((line, i) => {
            const isActive = i === activeLine;
            return (
              <div
                key={i}
                ref={isActive ? activeLineRef : null}
                className="flex items-center gap-1.5 group"
                onClick={() => { if (isDJ) setActiveLine(i); }}
              >
                <div
                  className="flex-1 px-2 py-1 rounded-lg text-xs transition-all cursor-pointer"
                  style={{
                    background: isActive ? "rgba(255,214,10,0.15)" : "transparent",
                    color: isActive ? "#ffd60a" : "rgba(255,255,255,0.4)",
                    fontWeight: isActive ? 700 : 400,
                    fontSize: isActive ? "13px" : "11px",
                    transform: isActive ? "scale(1.02)" : "scale(1)",
                    borderLeft: isActive ? "2px solid #ffd60a" : "2px solid transparent",
                  }}
                  data-testid={`lyrics-line-${i}`}
                >
                  {line}
                </div>
                {isDJ && (
                  <button
                    onClick={e => { e.stopPropagation(); handleCrowdSing(line); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#ffd60a]/50 hover:text-[#ffd60a] transition-all"
                    title="Crowd Sing moment"
                    data-testid={`button-crowd-sing-${i}`}
                  >
                    <Star className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lines.length > 0 && isDJ && (
        <div className="flex gap-2 px-3 py-2 border-t border-white/5">
          <button onClick={() => setActiveLine(p => Math.max(0, p - 1))} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white/50 border border-white/10 hover:bg-white/5" data-testid="button-lyrics-prev">← Prev</button>
          <button onClick={() => setActiveLine(p => Math.min(lines.length - 1, p + 1))} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white/50 border border-white/10 hover:bg-white/5" data-testid="button-lyrics-next">Next →</button>
        </div>
      )}

      {crowdSingLine && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ animation: pulsingCrowd ? "pulse-fade 4s ease-out forwards" : "none" }}
        >
          <div
            className="text-center px-8 py-6 rounded-3xl"
            style={{
              background: "rgba(255,214,10,0.15)",
              border: "2px solid rgba(255,214,10,0.5)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="text-xs font-black text-[#ffd60a] uppercase tracking-widest mb-2">🎤 SING ALONG!</div>
            <div className="text-2xl font-black text-white" style={{ textShadow: "0 0 30px #ffd60a" }}>{crowdSingLine}</div>
          </div>
        </div>
      )}
    </div>
  );
}
