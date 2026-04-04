import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, Square, Disc3, Music2, Loader2, ChevronDown } from "lucide-react";
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
}

interface JamendoMusicLibraryProps {
  onLoadToDeck: (track: JamendoTrack, deck: DeckId) => Promise<void>;
  loadingTrackId: string | null;
}

const GENRES = [
  "All Genres",
  "electronic",
  "hiphop",
  "pop",
  "rock",
  "jazz",
  "classical",
  "ambient",
  "dance",
  "house",
  "techno",
  "rnb",
  "funk",
  "soul",
  "reggae",
  "metal",
  "folk",
  "lounge",
];

const MOODS = [
  "Any Mood",
  "uplifting",
  "happy",
  "energetic",
  "chill",
  "dark",
  "sad",
  "romantic",
  "aggressive",
  "peaceful",
  "melancholic",
  "epic",
  "funky",
  "dreamy",
];

const PREVIEW_LIMIT_SECS = 30;

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

export function JamendoMusicLibrary({ onLoadToDeck, loadingTrackId }: JamendoMusicLibraryProps) {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedMood, setSelectedMood] = useState("Any Mood");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deckPickerId, setDeckPickerId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckPickerRef = useRef<HTMLDivElement | null>(null);

  const genreParam = selectedGenre === "All Genres" ? "" : selectedGenre;
  const moodParam = selectedMood === "Any Mood" ? "" : selectedMood;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!deckPickerId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (deckPickerRef.current && !deckPickerRef.current.contains(e.target as Node)) {
        setDeckPickerId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [deckPickerId]);

  const hasFilters = !!(submittedQuery || genreParam || moodParam);

  const { data, isLoading, isFetching, isError } = useQuery<{ tracks: JamendoTrack[]; total: number }>({
    queryKey: ["/api/jamendo/search", submittedQuery, genreParam, moodParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submittedQuery.trim()) params.set("q", submittedQuery.trim());
      if (genreParam.trim()) params.set("genre", genreParam.trim());
      if (moodParam.trim()) params.set("mood", moodParam.trim());
      const res = await fetch(`/api/jamendo/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
    enabled: hasFilters,
    staleTime: 60_000,
  });

  const handleSearch = useCallback(() => {
    setSubmittedQuery(searchInput);
  }, [searchInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  }, [handleSearch]);

  const handleGenreChange = useCallback((genre: string) => {
    setSelectedGenre(genre);
  }, []);

  const handleMoodChange = useCallback((mood: string) => {
    setSelectedMood(mood);
  }, []);

  const stopPreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    audioRef.current?.pause();
    setPreviewingId(null);
  }, []);

  const togglePreview = useCallback((track: JamendoTrack) => {
    if (previewingId === track.id) {
      stopPreview();
      return;
    }
    stopPreview();

    const audio = new Audio(`/api/jamendo/stream?id=${track.id}`);
    audio.volume = 0.7;
    audio.play().catch(() => {
      toast({ title: "Preview unavailable", description: "Could not play preview for this track.", variant: "destructive" });
      setPreviewingId(null);
    });
    audio.onended = () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setPreviewingId(null);
    };
    audioRef.current = audio;
    setPreviewingId(track.id);

    previewTimerRef.current = setTimeout(() => {
      audio.pause();
      setPreviewingId(null);
    }, PREVIEW_LIMIT_SECS * 1000);
  }, [previewingId, stopPreview, toast]);

  const handleLoadToDeck = useCallback(async (track: JamendoTrack, deck: DeckId) => {
    setDeckPickerId(null);
    stopPreview();
    try {
      await onLoadToDeck(track, deck);
      toast({ title: `Loaded to Deck ${deck}`, description: `${track.name} — ${track.artist}` });
    } catch {
      toast({ title: "Failed to load track", description: "Could not load this track into the deck.", variant: "destructive" });
    }
  }, [onLoadToDeck, stopPreview, toast]);

  const tracks = data?.tracks || [];
  const showLoading = isLoading || isFetching;
  const showEmpty = !showLoading && !isError && tracks.length === 0 && hasFilters;

  return (
    <div className="flex flex-col h-full max-h-full" data-testid="jamendo-library">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/15 focus-within:border-[#bf5af2] transition-colors">
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tracks, artists..."
              className="flex-1 bg-transparent text-white text-xs placeholder:text-white/30 focus:outline-none"
              data-testid="input-jamendo-search"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #bf5af2, #7c3aed)" }}
            data-testid="button-jamendo-search"
          >
            Search
          </button>
        </div>

        <div>
          <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider font-semibold">Genre</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => handleGenreChange(genre)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  selectedGenre === genre
                    ? "bg-[#bf5af2] text-white"
                    : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80"
                }`}
                data-testid={`button-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider font-semibold">Mood / Vibe</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {MOODS.map(mood => (
              <button
                key={mood}
                onClick={() => handleMoodChange(mood)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  selectedMood === mood
                    ? "bg-[#ff2d78] text-white"
                    : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80"
                }`}
                data-testid={`button-mood-${mood.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-white/30 mb-2 flex items-center gap-1.5">
        <Music2 className="w-3 h-3" />
        <span>Royalty-free tracks via Jamendo · Creative Commons licensed · 30s preview</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {showLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {isError && (
          <div className="text-center py-10 text-white/40" data-testid="jamendo-error-state">
            <Disc3 className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-sm font-semibold">Failed to load tracks</p>
            <p className="text-xs mt-1">Check your connection and try again.</p>
          </div>
        )}

        {showEmpty && (
          <div className="text-center py-10 text-white/40" data-testid="jamendo-empty-state">
            <Search className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <p className="text-sm font-semibold">No tracks found</p>
            <p className="text-xs mt-1">Try a different search term, genre, or mood.</p>
          </div>
        )}

        {!showLoading && !isError && tracks.length === 0 && !hasFilters && (
          <div className="text-center py-10 text-white/40" data-testid="jamendo-start-state">
            <Music2 className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-sm font-semibold text-white/50">Search for free music</p>
            <p className="text-xs mt-1">Browse thousands of Creative Commons tracks by keyword, genre, or mood</p>
          </div>
        )}

        {!showLoading && tracks.map(track => {
          const isLoadingThis = loadingTrackId === track.id;
          const isPreviewing = previewingId === track.id;
          const showDeckPicker = deckPickerId === track.id;

          return (
            <div
              key={track.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all group"
              data-testid={`card-jamendo-track-${track.id}`}
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/8 shrink-0">
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
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-white/30">{formatDuration(track.duration)}</span>
                  {track.genre && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#bf5af2]/20 text-[#bf5af2]">{track.genre.split(",")[0]}</span>
                  )}
                  {track.mood && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ff2d78]/20 text-[#ff2d78]">{track.mood.split(",")[0]}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => togglePreview(track)}
                  className={`flex items-center justify-center w-8 h-7 rounded-lg transition-all ${
                    isPreviewing
                      ? "bg-[#ff453a] text-white"
                      : "bg-white/8 text-white/50 hover:bg-white/15 hover:text-white"
                  }`}
                  title={isPreviewing ? "Stop preview" : "Preview 30s"}
                  data-testid={`button-preview-${track.id}`}
                >
                  {isPreviewing ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setDeckPickerId(showDeckPicker ? null : track.id)}
                    disabled={isLoadingThis}
                    className="flex items-center gap-1 px-2 h-7 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                    style={{ background: isLoadingThis ? "rgba(191,90,242,0.3)" : "rgba(191,90,242,0.2)", color: "#bf5af2", border: "1px solid rgba(191,90,242,0.3)" }}
                    data-testid={`button-load-deck-${track.id}`}
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <span>Load</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
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
                          onClick={() => handleLoadToDeck(track, deck)}
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
        })}
      </div>
    </div>
  );
}
