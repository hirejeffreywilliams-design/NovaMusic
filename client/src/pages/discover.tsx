import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Play,
  TrendingUp,
  Music,
  Sparkles,
  Hash,
  Flame,
  Heart,
  Zap,
  Sun,
  Moon,
  CloudRain,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  playCount: number;
}

interface Mood {
  id: string;
  name: string;
  color: string;
  trackCount: number;
}

interface Genre {
  id: string;
  name: string;
  trackCount: number;
}

const MOOD_ICONS: Record<string, React.ReactNode> = {
  Energetic: <Zap className="w-5 h-5" />,
  Chill: <Sun className="w-5 h-5" />,
  Dark: <Moon className="w-5 h-5" />,
  Melancholy: <CloudRain className="w-5 h-5" />,
  Uplifting: <Star className="w-5 h-5" />,
  Romantic: <Heart className="w-5 h-5" />,
  Hype: <Flame className="w-5 h-5" />,
};

const MOOD_FALLBACK_COLORS: string[] = [
  "#0EA5E9",
  "#06B6D4",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#6366F1",
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-[#111111] border border-[#1e1e1e] p-4 animate-pulse">
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

function SkeletonMoodCard() {
  return (
    <div className="rounded-2xl h-28 bg-[#111111] border border-[#1e1e1e] animate-pulse" />
  );
}

function SkeletonChip() {
  return (
    <div className="h-8 w-24 rounded-full bg-[#111111] border border-[#1e1e1e] animate-pulse" />
  );
}

function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export default function DiscoverPage() {
  const [, navigate] = useLocation();
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const {
    data: trendingTracks = [],
    isLoading: loadingTrending,
  } = useQuery<Track[]>({
    queryKey: ["/api/discovery/trending"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/trending");
      if (!res.ok) throw new Error("Failed to load trending tracks");
      return res.json();
    },
  });

  const {
    data: moods = [],
    isLoading: loadingMoods,
  } = useQuery<Mood[]>({
    queryKey: ["/api/discovery/moods"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/moods");
      if (!res.ok) throw new Error("Failed to load moods");
      return res.json();
    },
  });

  const {
    data: genres = [],
    isLoading: loadingGenres,
  } = useQuery<Genre[]>({
    queryKey: ["/api/discovery/genres"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/genres");
      if (!res.ok) throw new Error("Failed to load genres");
      return res.json();
    },
  });

  const filteredTracks = activeMood
    ? trendingTracks.filter(
        (t) => t.genre?.toLowerCase() === activeMood.toLowerCase()
      )
    : trendingTracks;

  const recommendedTracks = [...trendingTracks]
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 6);

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
            <Sparkles className="w-6 h-6 text-[#0EA5E9]" />
            <h1 className="text-lg font-black text-[#0EA5E9] tracking-wide">
              DISCOVER
            </h1>
          </div>
          {activeMood && (
            <button
              onClick={() => setActiveMood(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#06B6D4] bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 transition-colors"
              data-testid="button-clear-mood"
            >
              Clear Filter
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Trending Tracks */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#0EA5E9]" />
            <h2 className="text-base font-bold text-white">Trending Tracks</h2>
            <span className="ml-auto text-xs text-white/30">
              {!loadingTrending && `${filteredTracks.length} tracks`}
            </span>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">
                {activeMood
                  ? `No tracks found for "${activeMood}" mood.`
                  : "No trending tracks available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="group rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-[#1e1e1e] p-4 hover:bg-[#111111] hover:border-[#0EA5E9]/30 transition-all duration-200 cursor-pointer"
                  data-testid={`track-card-${track.id}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center shrink-0 group-hover:bg-[#0EA5E9]/20 group-hover:scale-110 transition-all duration-200"
                      data-testid={`button-play-${track.id}`}
                    >
                      <Play className="w-4 h-4 text-[#0EA5E9] ml-0.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {track.artistName}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {track.genre && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-full">
                        {track.genre}
                      </span>
                    )}
                    <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {formatPlayCount(track.playCount)} plays
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Moods */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-base font-bold text-white">Moods</h2>
          </div>

          {loadingMoods ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonMoodCard key={i} />
              ))}
            </div>
          ) : moods.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No moods available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {moods.map((mood, idx) => {
                const bgColor =
                  mood.color || MOOD_FALLBACK_COLORS[idx % MOOD_FALLBACK_COLORS.length];
                const isActive = activeMood === mood.name;
                return (
                  <button
                    key={mood.id}
                    onClick={() =>
                      setActiveMood(isActive ? null : mood.name)
                    }
                    className={`relative rounded-2xl h-28 overflow-hidden transition-all duration-200 border-2 ${
                      isActive
                        ? "border-white scale-[1.02] shadow-lg"
                        : "border-transparent hover:scale-[1.02]"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${bgColor}CC, ${bgColor}66)`,
                    }}
                    data-testid={`mood-card-${mood.name.toLowerCase()}`}
                  >
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1.5">
                      {MOOD_ICONS[mood.name] || (
                        <Music className="w-5 h-5" />
                      )}
                      <span className="text-sm font-bold text-white drop-shadow-md">
                        {mood.name}
                      </span>
                      <span className="text-[10px] text-white/70">
                        {mood.trackCount} tracks
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Genres */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Hash className="w-5 h-5 text-[#06B6D4]" />
            <h2 className="text-base font-bold text-white">Genres</h2>
          </div>

          {loadingGenres ? (
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonChip key={i} />
              ))}
            </div>
          ) : genres.length === 0 ? (
            <div className="text-center py-8">
              <Hash className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No genres available.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-[#111111] border border-[#1e1e1e] text-white/70 hover:text-[#06B6D4] hover:border-[#06B6D4]/40 hover:bg-[#06B6D4]/10 transition-all duration-200"
                  data-testid={`genre-chip-${genre.name.toLowerCase()}`}
                >
                  {genre.name}
                  {genre.trackCount > 0 && (
                    <span className="ml-1.5 text-xs text-white/30">
                      {genre.trackCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recommended */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-base font-bold text-white">Recommended</h2>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : recommendedTracks.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">
                No recommendations yet. Start exploring to get personalized
                picks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedTracks.map((track) => (
                <div
                  key={`rec-${track.id}`}
                  className="group rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-[#1e1e1e] p-4 hover:bg-[#111111] hover:border-[#F59E0B]/30 transition-all duration-200 cursor-pointer"
                  data-testid={`recommended-card-${track.id}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="w-10 h-10 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center shrink-0 group-hover:bg-[#F59E0B]/20 group-hover:scale-110 transition-all duration-200"
                      data-testid={`button-play-rec-${track.id}`}
                    >
                      <Play className="w-4 h-4 text-[#F59E0B] ml-0.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {track.artistName}
                      </p>
                    </div>
                    <Star className="w-4 h-4 text-[#F59E0B]/40 group-hover:text-[#F59E0B] transition-colors" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {track.genre && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded-full">
                        {track.genre}
                      </span>
                    )}
                    <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {formatPlayCount(track.playCount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
