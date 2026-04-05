import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Music, Users, BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  isrc: string | null;
  licenseType: string;
  royaltyRate: number | null;
  playCount: number;
  fileUrl: string;
  previewUrl: string | null;
  available: boolean;
  createdAt: string;
}

interface TopArtist {
  artistId: string;
  artistName: string;
  totalPlays: number;
}

type TabId = "top-tracks" | "top-artists" | "by-genre";

const RANK_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "top-tracks", label: "Top Tracks", icon: <Music className="w-4 h-4" /> },
  { id: "top-artists", label: "Top Artists", icon: <Users className="w-4 h-4" /> },
  { id: "by-genre", label: "By Genre", icon: <BarChart3 className="w-4 h-4" /> },
];

function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank] || "#888888";
  const isTopThree = rank <= 3;

  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-lg font-bold"
      style={{
        width: isTopThree ? 48 : 40,
        height: isTopThree ? 48 : 40,
        fontSize: isTopThree ? 20 : 16,
        color,
        border: `2px solid ${color}`,
        background: isTopThree ? `${color}15` : "transparent",
      }}
    >
      {rank}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl p-4 animate-pulse"
          style={{ background: "#111111", border: "1px solid #1e1e1e" }}
        >
          <div className="w-10 h-10 rounded-lg" style={{ background: "#1e1e1e" }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-1/3" style={{ background: "#1e1e1e" }} />
            <div className="h-3 rounded w-1/5" style={{ background: "#1e1e1e" }} />
          </div>
          <div className="h-4 w-16 rounded" style={{ background: "#1e1e1e" }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-xl"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      <Trophy className="w-12 h-12 mb-4" style={{ color: "#444" }} />
      <p className="text-sm" style={{ color: "#666" }}>
        {message}
      </p>
    </div>
  );
}

function TrackRow({ track, rank }: { track: Track; rank: number }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:brightness-110"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      <RankBadge rank={rank} />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{track.title}</p>
        <p className="text-xs truncate" style={{ color: "#999" }}>
          {track.artistName}
        </p>
      </div>

      {track.genre && (
        <span
          className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ background: "#0EA5E920", color: "#0EA5E9", border: "1px solid #0EA5E940" }}
        >
          {track.genre}
        </span>
      )}

      <div className="text-right shrink-0">
        <p className="text-sm font-medium" style={{ color: "#06B6D4" }}>
          {formatPlayCount(track.playCount)}
        </p>
        <p className="text-[10px]" style={{ color: "#555" }}>
          plays
        </p>
      </div>
    </div>
  );
}

function ArtistRow({ artist, rank }: { artist: TopArtist; rank: number }) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:brightness-110"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      <RankBadge rank={rank} />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{artist.artistName}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-medium" style={{ color: "#06B6D4" }}>
          {formatPlayCount(artist.totalPlays)}
        </p>
        <p className="text-[10px]" style={{ color: "#555" }}>
          total plays
        </p>
      </div>
    </div>
  );
}

function TopTracksTab() {
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["/api/charts/top-tracks"],
    queryFn: async () => {
      const res = await fetch("/api/charts/top-tracks");
      if (!res.ok) throw new Error("Failed to load top tracks");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (tracks.length === 0) return <EmptyState message="No tracks on the charts yet." />;

  return (
    <div className="flex flex-col gap-2">
      {tracks.map((track, i) => (
        <TrackRow key={track.id} track={track} rank={i + 1} />
      ))}
    </div>
  );
}

function TopArtistsTab() {
  const { data: artists = [], isLoading } = useQuery<TopArtist[]>({
    queryKey: ["/api/charts/top-artists"],
    queryFn: async () => {
      const res = await fetch("/api/charts/top-artists");
      if (!res.ok) throw new Error("Failed to load top artists");
      return res.json();
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (artists.length === 0) return <EmptyState message="No artists on the charts yet." />;

  return (
    <div className="flex flex-col gap-2">
      {artists.map((artist, i) => (
        <ArtistRow key={artist.artistId} artist={artist} rank={i + 1} />
      ))}
    </div>
  );
}

function ByGenreTab() {
  const [selectedGenre, setSelectedGenre] = useState("");

  const { data: genres = [], isLoading: genresLoading } = useQuery<string[]>({
    queryKey: ["/api/discovery/genres"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/genres");
      if (!res.ok) throw new Error("Failed to load genres");
      return res.json();
    },
  });

  const { data: tracks = [], isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ["/api/charts/top-tracks", selectedGenre],
    queryFn: async () => {
      const res = await fetch(`/api/charts/top-tracks?genre=${encodeURIComponent(selectedGenre)}`);
      if (!res.ok) throw new Error("Failed to load genre tracks");
      return res.json();
    },
    enabled: !!selectedGenre,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="w-full sm:w-64 appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none cursor-pointer"
          style={{
            background: "#111111",
            border: "1px solid #1e1e1e",
          }}
        >
          <option value="" disabled>
            Select a genre...
          </option>
          {genresLoading ? (
            <option disabled>Loading genres...</option>
          ) : (
            genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))
          )}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "#666" }}
        />
      </div>

      {!selectedGenre && (
        <EmptyState message="Select a genre above to view its top tracks." />
      )}

      {selectedGenre && tracksLoading && <LoadingSkeleton />}

      {selectedGenre && !tracksLoading && tracks.length === 0 && (
        <EmptyState message={`No tracks found for ${selectedGenre}.`} />
      )}

      {selectedGenre && !tracksLoading && tracks.length > 0 && (
        <div className="flex flex-col gap-2">
          {tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChartsPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("top-tracks");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "#0a0a0aee", borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#999" }} />
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color: "#0EA5E9" }} />
            <h1 className="text-lg sm:text-xl font-bold">Charts & Leaderboards</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "#111111", border: "1px solid #1e1e1e" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? "#0EA5E9" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "#888",
              }}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "top-tracks" && <TopTracksTab />}
        {activeTab === "top-artists" && <TopArtistsTab />}
        {activeTab === "by-genre" && <ByGenreTab />}
      </main>
    </div>
  );
}
