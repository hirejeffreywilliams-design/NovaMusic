import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Play, Square, Disc3, Music2, Loader2, ChevronDown, Heart,
  ListPlus, Sparkles, X, GripVertical, Clock, Star,
  Flame, SlidersHorizontal, type LucideIcon
} from "lucide-react";
import type { DeckId } from "@/hooks/use-audio-engine";
import { useToast } from "@/hooks/use-toast";

export interface JamendoTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  duration: number;
  genre: string;
  mood: string;
  license: string;
  bpm?: number;
  key?: string;
  energy?: string;
  popularityTotal?: number;
  popularityWeek?: number;
}

interface JamendoMusicLibraryProps {
  onLoadToDeck: (track: JamendoTrack, deck: DeckId) => Promise<void>;
  loadingTrackId: string | null;
  activeDeckBpm?: number;
  activeDeckKey?: string;
  /** Called when queue wants to auto-load a track to a deck */
  onQueueAutoLoad?: (track: JamendoTrack, deck: DeckId) => Promise<void>;
  /** Expose queue state so parent can trigger auto-load when deck ends */
  onQueueRef?: (ref: { popNext: (deck: DeckId) => JamendoTrack | undefined }) => void;
}

type LibraryTab = "featured" | "trending" | "genre" | "search" | "favorites";

const ALL_GENRES = [
  "electronic", "hiphop", "house", "pop", "dance", "techno", "rnb",
  "rock", "jazz", "classical", "ambient", "funk", "soul", "reggae",
  "metal", "folk", "lounge", "blues", "country", "latin",
];

const MUSICAL_KEYS = [
  "C Major", "C Minor", "C# Major", "C# Minor",
  "D Major", "D Minor", "D# Major", "D# Minor",
  "E Major", "E Minor", "F Major", "F Minor",
  "F# Major", "F# Minor", "G Major", "G Minor",
  "G# Major", "G# Minor", "A Major", "A Minor",
  "A# Major", "A# Minor", "B Major", "B Minor",
];

const ENERGY_LEVELS = ["low", "medium", "high", "veryHigh"] as const;
type EnergyLevel = typeof ENERGY_LEVELS[number];

function getGenreColor(genre: string): { bg: string; text: string } {
  const g = genre.toLowerCase();
  if (["pop", "rnb", "soul", "funk", "r&b"].some(x => g.includes(x))) {
    return { bg: "rgba(255,45,120,0.15)", text: "#ff2d78" };
  }
  if (["house", "techno", "electronic", "ambient", "trance", "edm"].some(x => g.includes(x))) {
    return { bg: "rgba(0,170,255,0.15)", text: "#0af" };
  }
  if (["hiphop", "hip-hop", "rap", "trap"].some(x => g.includes(x))) {
    return { bg: "rgba(255,214,10,0.15)", text: "#ffd60a" };
  }
  if (["dance"].some(x => g.includes(x))) {
    return { bg: "rgba(48,209,88,0.15)", text: "#30d158" };
  }
  if (["rock", "metal", "punk"].some(x => g.includes(x))) {
    return { bg: "rgba(255,69,58,0.15)", text: "#ff453a" };
  }
  if (["jazz", "blues", "soul"].some(x => g.includes(x))) {
    return { bg: "rgba(191,90,242,0.15)", text: "#bf5af2" };
  }
  return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PREVIEW_LIMIT_SECS = 30;

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-white/10 shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 bg-white/10 rounded w-3/4" />
        <div className="h-2.5 bg-white/8 rounded w-1/2" />
        <div className="h-2 bg-white/6 rounded w-1/3" />
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="w-8 h-7 bg-white/8 rounded-lg" />
        <div className="w-20 h-7 bg-white/8 rounded-lg" />
      </div>
    </div>
  );
}

interface TrackCardProps {
  track: JamendoTrack;
  isLoadingThis: boolean;
  isPreviewing: boolean;
  isFavorite: boolean;
  inQueue: boolean;
  onPreview: (t: JamendoTrack) => void;
  onFavorite: (t: JamendoTrack) => void;
  onAddToQueue: (t: JamendoTrack) => void;
  onLoadToDeck: (t: JamendoTrack, deck: DeckId) => void;
}

function TrackCard({
  track, isLoadingThis, isPreviewing, isFavorite, inQueue,
  onPreview, onFavorite, onAddToQueue, onLoadToDeck
}: TrackCardProps) {
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const deckPickerRef = useRef<HTMLDivElement | null>(null);
  const genreLabel = track.genre?.split(",")[0]?.trim();
  const moodLabel = track.mood?.split(",")[0]?.trim();
  const genreColor = genreLabel ? getGenreColor(genreLabel) : null;

  useEffect(() => {
    if (!showDeckPicker) return;
    const handler = (e: MouseEvent) => {
      if (deckPickerRef.current && !deckPickerRef.current.contains(e.target as Node)) {
        setShowDeckPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDeckPicker]);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all group"
      data-testid={`card-jamendo-track-${track.id}`}
    >
      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/8 shrink-0">
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-5 h-5 text-white/30" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate" data-testid={`text-track-name-${track.id}`}>{track.name}</p>
        <p className="text-[11px] text-white/50 truncate" data-testid={`text-track-artist-${track.id}`}>{track.artist}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-white/30">{formatDuration(track.duration)}</span>
          {track.bpm && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ffd60a]/10 text-[#ffd60a] font-medium">{track.bpm} BPM</span>
          )}
          {track.key && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158] font-medium">{track.key}</span>
          )}
          {genreLabel && genreColor && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: genreColor.bg, color: genreColor.text }}>{genreLabel}</span>
          )}
          {moodLabel && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ff2d78]/10 text-[#ff2d78]">{moodLabel}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onPreview(track)}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${isPreviewing ? "bg-[#ff453a] text-white" : "bg-white/8 text-white/40 hover:bg-white/15 hover:text-white"}`}
          title={isPreviewing ? "Stop" : "Preview"}
          data-testid={`button-preview-${track.id}`}
        >
          {isPreviewing ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
        </button>

        <button
          onClick={() => onFavorite(track)}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${isFavorite ? "text-[#ff2d78]" : "text-white/30 hover:text-[#ff2d78]"} bg-transparent hover:bg-white/8`}
          title={isFavorite ? "Remove favorite" : "Add to favorites"}
          data-testid={`button-favorite-${track.id}`}
        >
          <Heart className="w-3.5 h-3.5" fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <button
          onClick={() => onAddToQueue(track)}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${inQueue ? "text-[#30d158] bg-[#30d158]/10" : "text-white/30 hover:text-white bg-transparent hover:bg-white/8"}`}
          title="Add to queue"
          data-testid={`button-queue-${track.id}`}
        >
          <ListPlus className="w-3.5 h-3.5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDeckPicker(v => !v)}
            disabled={isLoadingThis}
            className="flex items-center gap-1 px-2 h-7 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
            style={{ background: isLoadingThis ? "rgba(191,90,242,0.3)" : "rgba(191,90,242,0.2)", color: "#bf5af2", border: "1px solid rgba(191,90,242,0.3)" }}
            data-testid={`button-load-deck-${track.id}`}
          >
            {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <><span>Load</span><ChevronDown className="w-3 h-3" /></>}
          </button>

          {showDeckPicker && (
            <div
              ref={deckPickerRef}
              className="absolute right-0 top-full mt-1 z-50 bg-[#1a0a2e] border border-white/15 rounded-xl overflow-hidden shadow-xl"
              data-testid={`deck-picker-${track.id}`}
            >
              {(["A", "B", "C", "D"] as DeckId[]).map(deck => (
                <button
                  key={deck}
                  onClick={() => { setShowDeckPicker(false); onLoadToDeck(track, deck); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                  data-testid={`button-load-to-deck-${deck}-${track.id}`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#bf5af2]/30 flex items-center justify-center text-[10px] font-black text-[#bf5af2]">{deck}</span>
                  Deck {deck}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface QueueDrawerProps {
  queue: JamendoTrack[];
  targetDeck: DeckId;
  onDeckChange: (d: DeckId) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onClose: () => void;
}

function QueueDrawer({ queue, targetDeck, onDeckChange, onRemove, onReorder, onClose }: QueueDrawerProps) {
  const dragIdx = useRef<number | null>(null);

  return (
    <div className="border-t border-white/10 bg-[#0d0520] flex flex-col" style={{ maxHeight: "220px" }} data-testid="queue-drawer">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          <ListPlus className="w-3.5 h-3.5 text-[#30d158]" />
          <span className="text-xs font-bold text-white" data-testid="queue-heading">Queue ({queue.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Feed to:</span>
          <div className="flex gap-1">
            {(["A", "B", "C", "D"] as DeckId[]).map(d => (
              <button
                key={d}
                onClick={() => onDeckChange(d)}
                className={`w-5 h-5 rounded-full text-[9px] font-black transition-all ${targetDeck === d ? "bg-[#30d158] text-white" : "bg-white/10 text-white/40 hover:bg-white/20"}`}
                data-testid={`button-queue-deck-${d}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors" data-testid="button-close-queue">
            <X className="w-3 h-3 text-white/40" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
        {queue.length === 0 && (
          <div className="text-center py-4 text-white/30 text-xs">Queue is empty — add tracks with the + button</div>
        )}
        {queue.map((t, i) => (
          <div
            key={t.id}
            draggable
            onDragStart={() => { dragIdx.current = i; }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragIdx.current !== null && dragIdx.current !== i) {
                onReorder(dragIdx.current, i);
              }
              dragIdx.current = null;
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/4 border border-white/8 hover:border-white/15 cursor-grab active:cursor-grabbing"
            data-testid={`queue-item-${t.id}`}
          >
            <GripVertical className="w-3 h-3 text-white/20 shrink-0" />
            <span className="text-[10px] text-white/40 w-4 shrink-0">{i + 1}</span>
            {t.albumArt && <img src={t.albumArt} alt="" className="w-6 h-6 rounded shrink-0 object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white truncate font-medium">{t.name}</p>
              <p className="text-[9px] text-white/40 truncate">{t.artist}</p>
            </div>
            {t.bpm && <span className="text-[9px] text-[#ffd60a]/60 shrink-0">{t.bpm}</span>}
            <button
              onClick={() => onRemove(t.id)}
              className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
              data-testid={`button-queue-remove-${t.id}`}
            >
              <X className="w-2.5 h-2.5 text-white/30 hover:text-white/60" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SmartSuggestModalProps {
  tracks: JamendoTrack[];
  isLoading: boolean;
  onClose: () => void;
  onLoadToDeck: (t: JamendoTrack, deck: DeckId) => void;
  onAddToQueue: (t: JamendoTrack) => void;
  loadingTrackId: string | null;
}

function SmartSuggestModal({ tracks, isLoading, onClose, onLoadToDeck, onAddToQueue, loadingTrackId }: SmartSuggestModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d0520] border border-[#bf5af2]/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()} data-testid="smart-suggest-modal">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#bf5af2]" />
            <span className="text-sm font-bold text-white">Smart Suggestions</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" data-testid="button-close-smart-suggest">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          {!isLoading && tracks.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <p className="text-sm">No compatible tracks found</p>
            </div>
          )}
          {!isLoading && tracks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/4 border border-white/8">
              {t.albumArt && <img src={t.albumArt} alt={t.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                <p className="text-[11px] text-white/50 truncate">{t.artist}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {t.bpm && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ffd60a]/10 text-[#ffd60a]">{t.bpm} BPM</span>}
                  {t.key && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#30d158]/10 text-[#30d158]">{t.key}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onAddToQueue(t)} className="w-7 h-7 rounded-lg bg-white/8 text-white/40 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center" data-testid={`button-suggest-queue-${t.id}`}>
                  <ListPlus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onLoadToDeck(t, "A")} disabled={loadingTrackId === t.id} className="px-2 h-7 rounded-lg text-[10px] font-bold disabled:opacity-50" style={{ background: "rgba(191,90,242,0.2)", color: "#bf5af2", border: "1px solid rgba(191,90,242,0.3)" }} data-testid={`button-suggest-load-${t.id}`}>
                  {loadingTrackId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Load A"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FilterPanelProps {
  bpmRange: [number, number];
  onBpmChange: (v: [number, number]) => void;
  selectedKey: string;
  onKeyChange: (k: string) => void;
  durationRange: [number, number];
  onDurationChange: (v: [number, number]) => void;
  selectedEnergy: string;
  onEnergyChange: (v: string) => void;
  onClose: () => void;
}

function FilterPanel({
  bpmRange, onBpmChange, selectedKey, onKeyChange,
  durationRange, onDurationChange, selectedEnergy, onEnergyChange, onClose
}: FilterPanelProps) {
  const durationLabel = (v: number) => v === 600 ? "∞" : formatDuration(v);
  return (
    <div className="bg-[#0d0520] border border-white/10 rounded-xl p-3 mb-2 space-y-3" data-testid="filter-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white">Advanced Filters</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10" data-testid="button-close-filters"><X className="w-3 h-3 text-white/40" /></button>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/50">BPM Range</span>
          <span className="text-[10px] text-white/70">{bpmRange[0]} – {bpmRange[1]}</span>
        </div>
        <div className="flex gap-2">
          <input type="range" min={60} max={180} value={bpmRange[0]} onChange={e => onBpmChange([parseInt(e.target.value), bpmRange[1]])} className="flex-1 accent-[#bf5af2]" data-testid="slider-bpm-min" />
          <input type="range" min={60} max={180} value={bpmRange[1]} onChange={e => onBpmChange([bpmRange[0], parseInt(e.target.value)])} className="flex-1 accent-[#bf5af2]" data-testid="slider-bpm-max" />
        </div>
      </div>
      <div>
        <p className="text-[10px] text-white/50 mb-1">Musical Key</p>
        <select
          value={selectedKey}
          onChange={e => onKeyChange(e.target.value)}
          className="w-full bg-white/8 border border-white/15 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#bf5af2]"
          data-testid="select-key-filter"
        >
          <option value="">Any Key</option>
          {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div>
        <p className="text-[10px] text-white/50 mb-1">Energy Level</p>
        <div className="flex gap-1.5 flex-wrap">
          {["", ...ENERGY_LEVELS].map(e => (
            <button
              key={e || "any"}
              onClick={() => onEnergyChange(e)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${selectedEnergy === e ? "bg-[#bf5af2] text-white" : "bg-white/8 text-white/50 hover:bg-white/12"}`}
              data-testid={`button-energy-${e || "any"}`}
            >
              {e ? e.charAt(0).toUpperCase() + e.slice(1) : "Any"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/50">Duration Range</span>
          <span className="text-[10px] text-white/70">{durationLabel(durationRange[0])} – {durationLabel(durationRange[1])}</span>
        </div>
        <div className="flex gap-2">
          <input type="range" min={0} max={600} step={30} value={durationRange[0]} onChange={e => { const v = parseInt(e.target.value); onDurationChange([Math.min(v, durationRange[1] - 30), durationRange[1]]); }} className="flex-1 accent-[#bf5af2]" data-testid="slider-duration-min" />
          <input type="range" min={0} max={600} step={30} value={durationRange[1]} onChange={e => { const v = parseInt(e.target.value); onDurationChange([durationRange[0], Math.max(v, durationRange[0] + 30)]); }} className="flex-1 accent-[#bf5af2]" data-testid="slider-duration-max" />
        </div>
      </div>
    </div>
  );
}

export function JamendoMusicLibrary({
  onLoadToDeck, loadingTrackId, activeDeckBpm, activeDeckKey, onQueueRef
}: JamendoMusicLibraryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<LibraryTab>("featured");
  const [selectedGenre, setSelectedGenre] = useState("electronic");
  const [genrePage, setGenrePage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queue, setQueue] = useState<JamendoTrack[]>([]);
  const [queueDeck, setQueueDeck] = useState<DeckId>("A");
  const [showSmartSuggest, setShowSmartSuggest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedEnergy, setSelectedEnergy] = useState<string>("");
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 600]);
  const [genreAccumulatedTracks, setGenreAccumulatedTracks] = useState<JamendoTrack[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<JamendoTrack[]>([]);

  // Keep queueRef in sync
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Expose popNext for auto-load from parent
  useEffect(() => {
    if (!onQueueRef) return;
    onQueueRef({
      popNext: (deck: DeckId) => {
        if (deck !== queueDeck) return undefined;
        const current = queueRef.current;
        if (current.length === 0) return undefined;
        const [next, ...rest] = current;
        setQueue(rest);
        return next;
      }
    });
  }, [onQueueRef, queueDeck]);

  // Favorites query
  const { data: favoritesList = [] } = useQuery<JamendoTrack[]>({
    queryKey: ["/api/library/favorites"],
    staleTime: 30_000,
  });
  const favoriteIds = useMemo(() => new Set(favoritesList.map(f => f.id)), [favoritesList]);

  // History query
  const { data: historyList = [] } = useQuery<JamendoTrack[]>({
    queryKey: ["/api/library/history"],
    staleTime: 30_000,
  });

  // Featured query
  const { data: featuredData, isLoading: featuredLoading } = useQuery<{ tracks: JamendoTrack[] }>({
    queryKey: ["/api/jamendo/featured"],
    queryFn: async () => {
      const res = await fetch("/api/jamendo/featured?limit=50");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 600_000,
  });

  // Trending query
  const { data: trendingData, isLoading: trendingLoading } = useQuery<{ tracks: JamendoTrack[] }>({
    queryKey: ["/api/jamendo/trending"],
    queryFn: async () => {
      const res = await fetch("/api/jamendo/trending?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "trending",
    staleTime: 600_000,
  });

  // Genre library query
  const { data: genreData, isLoading: genreLoading } = useQuery<{ tracks: JamendoTrack[]; page: number }>({
    queryKey: ["/api/jamendo/library", selectedGenre, genrePage],
    queryFn: async () => {
      const res = await fetch(`/api/jamendo/library?genre=${encodeURIComponent(selectedGenre)}&page=${genrePage}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "genre",
    staleTime: 600_000,
  });

  // Search query
  const { data: searchData, isLoading: searchLoading } = useQuery<{ tracks: JamendoTrack[]; total: number }>({
    queryKey: ["/api/jamendo/search", submittedQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submittedQuery.trim()) params.set("q", submittedQuery.trim());
      const res = await fetch(`/api/jamendo/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!submittedQuery.trim() && activeTab === "search",
    staleTime: 60_000,
  });

  // Smart Suggest query
  const { data: suggestData, isLoading: suggestLoading, refetch: refetchSuggest } = useQuery<{ tracks: JamendoTrack[] }>({
    queryKey: ["/api/jamendo/suggest", activeDeckBpm, activeDeckKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeDeckBpm) params.set("bpm", activeDeckBpm.toString());
      if (activeDeckKey) params.set("key", activeDeckKey);
      const res = await fetch(`/api/jamendo/suggest?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: false,
    staleTime: 60_000,
  });

  // Accumulate genre tracks on page change
  useEffect(() => {
    if (!genreData) return;
    if (genreData.page === 0) {
      setGenreAccumulatedTracks(genreData.tracks);
    } else {
      setGenreAccumulatedTracks(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTracks = genreData.tracks.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTracks];
      });
    }
  }, [genreData]);

  // Reset genre tracks when genre changes
  useEffect(() => {
    setGenrePage(0);
    setGenreAccumulatedTracks([]);
  }, [selectedGenre]);

  // Infinite scroll for genre tab
  useEffect(() => {
    if (activeTab !== "genre" || !sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !genreLoading && (genreData?.tracks.length ?? 0) >= 50) {
        setGenrePage(p => p + 1);
      }
    }, { threshold: 0.5 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [activeTab, genreLoading, genreData]);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null; }
    audioRef.current?.pause();
    setPreviewingId(null);
  }, []);

  const togglePreview = useCallback((track: JamendoTrack) => {
    if (previewingId === track.id) { stopPreview(); return; }
    stopPreview();
    const audio = new Audio(`/api/jamendo/stream?id=${track.id}`);
    audio.volume = 0.7;
    audio.play().catch(() => {
      toast({ title: "Preview unavailable", description: "Could not play preview.", variant: "destructive" });
      setPreviewingId(null);
    });
    audio.onended = () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); setPreviewingId(null); };
    audioRef.current = audio;
    setPreviewingId(track.id);
    previewTimerRef.current = setTimeout(() => { audio.pause(); setPreviewingId(null); }, PREVIEW_LIMIT_SECS * 1000);
  }, [previewingId, stopPreview, toast]);

  useEffect(() => () => { audioRef.current?.pause(); if (previewTimerRef.current) clearTimeout(previewTimerRef.current); }, []);

  const toggleFavorite = useCallback(async (track: JamendoTrack) => {
    if (favoriteIds.has(track.id)) {
      await fetch(`/api/library/favorites/${track.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/library/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/library/favorites"] });
  }, [favoriteIds, queryClient]);

  const addToQueue = useCallback((track: JamendoTrack) => {
    setQueue(prev => prev.find(t => t.id === track.id) ? prev : [...prev, track]);
    setShowQueue(true);
    toast({ title: "Added to queue", description: track.name });
  }, [toast]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleLoadToDeck = useCallback(async (track: JamendoTrack, deck: DeckId) => {
    stopPreview();
    try {
      await onLoadToDeck(track, deck);
      toast({ title: `Loaded to Deck ${deck}`, description: `${track.name} — ${track.artist}` });
      await fetch("/api/library/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/library/history"] });
    } catch {
      toast({ title: "Failed to load track", variant: "destructive" });
    }
  }, [onLoadToDeck, stopPreview, toast, queryClient]);

  const handleSmartSuggest = useCallback(() => {
    setShowSmartSuggest(true);
    refetchSuggest();
  }, [refetchSuggest]);

  const applyFilters = useCallback((tracks: JamendoTrack[]) => {
    return tracks.filter(t => {
      if (t.bpm && (t.bpm < bpmRange[0] || t.bpm > bpmRange[1])) return false;
      if (selectedKey && t.key && t.key !== selectedKey) return false;
      if (durationRange[0] > 0 && t.duration < durationRange[0]) return false;
      if (durationRange[1] < 600 && t.duration > durationRange[1]) return false;
      if (selectedEnergy && t.energy) {
        const energyMap: Record<string, string[]> = {
          low: ["low"],
          medium: ["medium"],
          high: ["high"],
          veryHigh: ["veryHigh", "very_high"],
        };
        const allowed = energyMap[selectedEnergy] ?? [];
        if (!allowed.some(a => t.energy!.toLowerCase().includes(a.toLowerCase()))) return false;
      }
      return true;
    });
  }, [bpmRange, selectedKey, durationRange, selectedEnergy]);

  const hasActiveFilters = bpmRange[0] !== 60 || bpmRange[1] !== 180 || !!selectedKey || durationRange[0] > 0 || durationRange[1] < 600 || !!selectedEnergy;

  const currentTracks = useMemo((): JamendoTrack[] => {
    switch (activeTab) {
      case "featured": return applyFilters(featuredData?.tracks ?? []);
      case "trending": return applyFilters(trendingData?.tracks ?? []);
      case "genre": return applyFilters(genreAccumulatedTracks);
      case "search": return applyFilters(searchData?.tracks ?? []);
      case "favorites": return applyFilters(favoritesList);
      default: return [];
    }
  }, [activeTab, featuredData, trendingData, genreAccumulatedTracks, searchData, favoritesList, applyFilters]);

  const isCurrentlyLoading = (activeTab === "featured" && featuredLoading) ||
    (activeTab === "trending" && trendingLoading) ||
    (activeTab === "genre" && genreLoading && genrePage === 0) ||
    (activeTab === "search" && searchLoading);

  const queueIds = useMemo(() => new Set(queue.map(t => t.id)), [queue]);

  const tabs: { id: LibraryTab; label: string; icon: LucideIcon }[] = [
    { id: "featured", label: "Featured", icon: Star },
    { id: "trending", label: "Trending", icon: Flame },
    { id: "genre", label: "By Genre", icon: Disc3 },
    { id: "search", label: "Search", icon: Search },
    { id: "favorites", label: "Saved", icon: Heart },
  ];

  return (
    <div className="flex flex-col h-full max-h-full relative" data-testid="jamendo-library">
      {showSmartSuggest && (
        <SmartSuggestModal
          tracks={suggestData?.tracks ?? []}
          isLoading={suggestLoading}
          onClose={() => setShowSmartSuggest(false)}
          onLoadToDeck={handleLoadToDeck}
          onAddToQueue={addToQueue}
          loadingTrackId={loadingTrackId}
        />
      )}

      <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === id ? "bg-[#bf5af2] text-white" : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80"}`}
            data-testid={`tab-library-${id}`}
          >
            <Icon className="w-3 h-3" />
            {label}
            {id === "favorites" && favoritesList.length > 0 && (
              <span className="ml-0.5 text-[9px] bg-white/20 rounded-full px-1">{favoritesList.length}</span>
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {(activeDeckBpm || activeDeckKey) && (
            <button
              onClick={handleSmartSuggest}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/30 hover:bg-[#bf5af2]/25"
              title="Smart Suggest — find harmonically compatible tracks"
              data-testid="button-smart-suggest"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Suggest</span>
            </button>
          )}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all ${showFilters || hasActiveFilters ? "bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30" : "bg-white/8 text-white/40 hover:bg-white/12 hover:text-white/70"}`}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="w-3 h-3" />
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#ffd60a]" />}
          </button>
          <button
            onClick={() => setShowQueue(v => !v)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all ${showQueue ? "bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30" : "bg-white/8 text-white/40 hover:bg-white/12"}`}
            data-testid="button-toggle-queue"
          >
            <ListPlus className="w-3 h-3" />
            {queue.length > 0 && <span className="text-[9px]">{queue.length}</span>}
          </button>
        </div>
      </div>

      {showFilters && (
        <FilterPanel
          bpmRange={bpmRange}
          onBpmChange={setBpmRange}
          selectedKey={selectedKey}
          onKeyChange={setSelectedKey}
          durationRange={durationRange}
          onDurationChange={setDurationRange}
          selectedEnergy={selectedEnergy}
          onEnergyChange={setSelectedEnergy}
          onClose={() => setShowFilters(false)}
        />
      )}

      {activeTab === "genre" && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide mb-2">
          {ALL_GENRES.map(g => {
            const color = getGenreColor(g);
            const isSelected = selectedGenre === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all`}
                style={isSelected
                  ? { background: color.bg, color: color.text, border: `1px solid ${color.text}` }
                  : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid transparent" }
                }
                data-testid={`button-genre-${g}`}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "search" && (
        <div className="flex gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/15 focus-within:border-[#bf5af2] transition-colors">
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") setSubmittedQuery(searchInput); }}
              placeholder="Search tracks, artists..."
              className="flex-1 bg-transparent text-white text-xs placeholder:text-white/30 focus:outline-none"
              data-testid="input-jamendo-search"
            />
          </div>
          <button
            onClick={() => setSubmittedQuery(searchInput)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #bf5af2, #7c3aed)" }}
            data-testid="button-jamendo-search"
          >
            Search
          </button>
        </div>
      )}

      <div className="text-[10px] text-white/25 mb-1.5 flex items-center gap-1.5">
        <Music2 className="w-3 h-3" />
        <span>Royalty-free via Jamendo · Creative Commons · 30s preview</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
        {activeTab === "featured" && historyList.length > 0 && !isCurrentlyLoading && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Recently Played</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {historyList.slice(0, 20).map(t => (
                <div key={t.id} className="shrink-0 w-24 cursor-pointer group" onClick={() => handleLoadToDeck(t, "A")} data-testid={`card-history-${t.id}`}>
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white/8 mb-1">
                    {t.albumArt ? <img src={t.albumArt} alt={t.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-6 h-6 text-white/20" /></div>}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </div>
                  </div>
                  <p className="text-[9px] text-white/60 truncate">{t.name}</p>
                  <p className="text-[8px] text-white/30 truncate">{t.artist}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCurrentlyLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {!isCurrentlyLoading && activeTab === "search" && !submittedQuery.trim() && (
          <div className="text-center py-10 text-white/40" data-testid="jamendo-start-state">
            <Search className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-sm font-semibold text-white/50">Search the Jamendo library</p>
            <p className="text-xs mt-1">Enter a track name, artist, or keyword</p>
          </div>
        )}

        {!isCurrentlyLoading && activeTab === "favorites" && favoritesList.length === 0 && (
          <div className="text-center py-10 text-white/40" data-testid="favorites-empty">
            <Heart className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-sm font-semibold text-white/50">No saved tracks yet</p>
            <p className="text-xs mt-1">Tap the heart icon on any track to save it</p>
          </div>
        )}

        {!isCurrentlyLoading && currentTracks.map(track => (
          <TrackCard
            key={track.id}
            track={track}
            isLoadingThis={loadingTrackId === track.id}
            isPreviewing={previewingId === track.id}
            isFavorite={favoriteIds.has(track.id)}
            inQueue={queueIds.has(track.id)}
            onPreview={togglePreview}
            onFavorite={toggleFavorite}
            onAddToQueue={addToQueue}
            onLoadToDeck={handleLoadToDeck}
          />
        ))}

        {activeTab === "genre" && genreLoading && genrePage > 0 && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#bf5af2]" />
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />
      </div>

      {showQueue && (
        <QueueDrawer
          queue={queue}
          targetDeck={queueDeck}
          onDeckChange={setQueueDeck}
          onRemove={removeFromQueue}
          onReorder={reorderQueue}
          onClose={() => setShowQueue(false)}
        />
      )}
    </div>
  );
}
