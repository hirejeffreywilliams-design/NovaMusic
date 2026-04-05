import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Search,
  Music,
  Loader2,
  X,
  Clock,
  Globe,
  Database,
  Play,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PlatformTrack {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  playCount: number;
}

interface JamendoTrack {
  id: string;
  name: string;
  artist: string;
  genre: string;
  mood: string;
  albumArt: string;
  duration: number;
  license: string;
}

interface JamendoSearchResponse {
  tracks: JamendoTrack[];
  total: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-[#1e1e1e] p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-5 bg-white/5 rounded-full w-16" />
        <div className="h-5 bg-white/5 rounded-full w-20" />
      </div>
    </div>
  );
}

function PlatformTrackCard({ track }: { track: PlatformTrack }) {
  return (
    <div
      className="group rounded-2xl bg-white/[0.03] backdrop-blur-md border border-[#1e1e1e] p-4 hover:bg-white/[0.06] hover:border-[#0EA5E9]/30 transition-all duration-200 cursor-pointer"
      data-testid={`platform-track-${track.id}`}
    >
      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center shrink-0 group-hover:bg-[#0EA5E9]/20 group-hover:scale-110 transition-all duration-200"
          data-testid={`button-play-platform-${track.id}`}
        >
          <Play className="w-4 h-4 text-[#0EA5E9] ml-0.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {track.title}
          </p>
          <p className="text-xs text-white/40 truncate">{track.artistName}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {track.genre && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-full">
            {track.genre}
          </span>
        )}
        <span className="text-[10px] font-medium text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full ml-auto flex items-center gap-1">
          <Database className="w-2.5 h-2.5" />
          Platform
        </span>
      </div>
    </div>
  );
}

function JamendoTrackCard({ track }: { track: JamendoTrack }) {
  return (
    <div
      className="group rounded-2xl bg-white/[0.03] backdrop-blur-md border border-[#1e1e1e] p-4 hover:bg-white/[0.06] hover:border-[#06B6D4]/30 transition-all duration-200 cursor-pointer"
      data-testid={`jamendo-track-${track.id}`}
    >
      <div className="flex items-center gap-3">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.name}
            className="w-10 h-10 rounded-lg object-cover shrink-0 group-hover:scale-110 transition-transform duration-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-[#06B6D4]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {track.name}
          </p>
          <p className="text-xs text-white/40 truncate">{track.artist}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {track.genre && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-full">
            {track.genre}
          </span>
        )}
        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full ml-auto flex items-center gap-1">
          <Globe className="w-2.5 h-2.5" />
          Free Library
        </span>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query.trim(), 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addToRecentSearches = useCallback(
    (term: string) => {
      if (!term) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== term);
        return [term, ...filtered].slice(0, 8);
      });
    },
    [],
  );

  useEffect(() => {
    if (debouncedQuery) {
      addToRecentSearches(debouncedQuery);
    }
  }, [debouncedQuery, addToRecentSearches]);

  const {
    data: platformTracks = [],
    isLoading: loadingPlatform,
  } = useQuery<PlatformTrack[]>({
    queryKey: ["/api/tracks", debouncedQuery],
    queryFn: async () => {
      const res = await fetch("/api/tracks");
      if (!res.ok) throw new Error("Failed to load platform tracks");
      const tracks: PlatformTrack[] = await res.json();
      if (!debouncedQuery) return tracks;
      const q = debouncedQuery.toLowerCase();
      return tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artistName.toLowerCase().includes(q) ||
          (t.genre && t.genre.toLowerCase().includes(q)),
      );
    },
    enabled: debouncedQuery.length > 0,
  });

  const {
    data: jamendoData,
    isLoading: loadingJamendo,
  } = useQuery<JamendoSearchResponse>({
    queryKey: ["/api/jamendo/search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/jamendo/search?q=${encodeURIComponent(debouncedQuery)}`,
      );
      if (!res.ok) throw new Error("Failed to search Jamendo");
      return res.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const jamendoTracks = jamendoData?.tracks ?? [];
  const isLoading = loadingPlatform || loadingJamendo;
  const hasResults = platformTracks.length > 0 || jamendoTracks.length > 0;
  const hasQuery = debouncedQuery.length > 0;

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== term));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1e1e1e]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            <Search className="w-6 h-6 text-[#0EA5E9]" />
            <h1 className="text-lg font-black text-[#0EA5E9] tracking-wide">
              SEARCH
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-white/30" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks, artists, genres..."
            className="w-full rounded-2xl bg-white/[0.04] backdrop-blur-md border border-[#1e1e1e] pl-12 pr-12 py-4 text-white placeholder-white/30 text-base outline-none focus:border-[#0EA5E9]/50 focus:bg-white/[0.06] transition-all duration-200"
            data-testid="search-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
              data-testid="button-clear-search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {isLoading && hasQuery && (
            <div className="absolute inset-y-0 right-12 flex items-center">
              <Loader2 className="w-4 h-4 text-[#0EA5E9] animate-spin" />
            </div>
          )}
        </div>

        {/* Empty State - No Query */}
        {!hasQuery && (
          <div className="space-y-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-white/40" />
                  <h2 className="text-sm font-semibold text-white/50">
                    Recent Searches
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleRecentClick(term)}
                      className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] backdrop-blur-md border border-[#1e1e1e] text-sm text-white/60 hover:text-white hover:border-[#0EA5E9]/30 hover:bg-white/[0.06] transition-all duration-200"
                      data-testid={`recent-search-${term}`}
                    >
                      <Clock className="w-3 h-3 text-white/30" />
                      {term}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(term);
                        }}
                        className="ml-1 text-white/20 hover:text-white/60 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State Illustration */}
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-[#1e1e1e] flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-white/15" />
              </div>
              <h3 className="text-lg font-semibold text-white/30 mb-2">
                Find your next track
              </h3>
              <p className="text-sm text-white/20 text-center max-w-md">
                Search across platform tracks and the free music library.
                Type a song name, artist, or genre to get started.
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {hasQuery && isLoading && (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-white/50 mb-4">
                Searching...
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* No Results */}
        {hasQuery && !isLoading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="text-lg font-semibold text-white/30 mb-2">
              No results found
            </h3>
            <p className="text-sm text-white/20 text-center max-w-md">
              No tracks match "{debouncedQuery}". Try a different search term.
            </p>
          </div>
        )}

        {/* Platform Tracks Results */}
        {hasQuery && !isLoading && platformTracks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Database className="w-5 h-5 text-[#0EA5E9]" />
              <h2 className="text-base font-bold text-white">
                Platform Tracks
              </h2>
              <span className="ml-auto text-xs text-white/30">
                {platformTracks.length} result
                {platformTracks.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {platformTracks.map((track) => (
                <PlatformTrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Jamendo / Free Music Library Results */}
        {hasQuery && !isLoading && jamendoTracks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5 text-[#06B6D4]" />
              <h2 className="text-base font-bold text-white">
                Free Music Library
              </h2>
              <span className="ml-auto text-xs text-white/30">
                {jamendoTracks.length} result
                {jamendoTracks.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {jamendoTracks.map((track) => (
                <JamendoTrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
