import { useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Music,
  Users,
  Heart,
  Play,
  Calendar,
  MapPin,
  Clock,
  ShoppingBag,
  Loader2,
  UserPlus,
  UserMinus,
  Tag,
  ImageOff,
  Disc3,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface ArtistProfile {
  id: string;
  stageName: string;
  bio: string | null;
  avatarUrl?: string | null;
}

interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  playCount: number;
  duration?: number | null;
  available: boolean;
}

interface FollowerData {
  count: number;
  isFollowing: boolean;
}

interface Concert {
  id: string;
  title: string;
  artistName: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number | null;
  rsvpCount: number;
}

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  stock: number;
  available: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${suffix}`;
  } catch {
    return timeStr;
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-white">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal" style={{ color: "#666" }}>
            ({count})
          </span>
        )}
      </h2>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2
        className="w-10 h-10 mb-4 animate-spin"
        style={{ color: "#0EA5E9" }}
      />
      <p className="text-sm" style={{ color: "#666" }}>
        {message}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 rounded-xl"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      <Icon className="w-10 h-10 mb-3" style={{ color: "#333" }} />
      <p className="text-sm" style={{ color: "#555" }}>
        {message}
      </p>
    </div>
  );
}

function TrackRow({
  track,
  index,
  onLike,
  isLiking,
}: {
  track: Track;
  index: number;
  onLike: (trackId: string) => void;
  isLiking: boolean;
}) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    onLike(track.id);
  };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-white/5 group"
      style={{ border: "1px solid transparent" }}
      data-testid={`track-row-${track.id}`}
    >
      {/* Track number / play button */}
      <div className="w-8 text-center shrink-0">
        <span
          className="text-sm font-medium group-hover:hidden"
          style={{ color: "#555" }}
        >
          {index + 1}
        </span>
        <button
          className="hidden group-hover:block"
          aria-label={`Play ${track.title}`}
        >
          <Play className="w-4 h-4" style={{ color: "#0EA5E9" }} />
        </button>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.title}</p>
        {track.genre && (
          <p className="text-xs truncate" style={{ color: "#666" }}>
            {track.genre}
          </p>
        )}
      </div>

      {/* Play count */}
      <div className="shrink-0 text-right mr-2">
        <span className="text-xs" style={{ color: "#888" }}>
          {formatPlayCount(track.playCount)} plays
        </span>
      </div>

      {/* Like button */}
      <button
        onClick={handleLike}
        disabled={isLiking}
        className="shrink-0 p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
        aria-label={liked ? "Unlike track" : "Like track"}
        data-testid={`like-btn-${track.id}`}
      >
        <Heart
          className="w-4 h-4 transition-colors"
          style={{
            color: liked ? "#EF4444" : "#555",
            fill: liked ? "#EF4444" : "none",
          }}
        />
      </button>
    </div>
  );
}

export default function ArtistProfilePage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [likingTrackId, setLikingTrackId] = useState<string | null>(null);

  // Fetch artist profile
  const {
    data: artist,
    isLoading: loadingProfile,
    isError: profileError,
  } = useQuery<ArtistProfile>({
    queryKey: ["/api/artist/profile", id],
    queryFn: async () => {
      const res = await fetch(`/api/artist/profile/${id}`);
      if (!res.ok) throw new Error("Failed to load artist profile");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch artist tracks
  const { data: tracks = [], isLoading: loadingTracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks/artist", id],
    queryFn: async () => {
      const res = await fetch(`/api/tracks/artist/${id}`);
      if (!res.ok) throw new Error("Failed to load tracks");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch follower data
  const { data: followerData } = useQuery<FollowerData>({
    queryKey: ["/api/followers", id],
    queryFn: async () => {
      const res = await fetch(`/api/followers/${id}`);
      if (!res.ok) throw new Error("Failed to load followers");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch upcoming concerts
  const { data: concerts = [], isLoading: loadingConcerts } = useQuery<Concert[]>({
    queryKey: ["/api/concerts", { artistId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/concerts?artistId=${id}`);
      if (!res.ok) throw new Error("Failed to load concerts");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch merchandise
  const { data: merch = [], isLoading: loadingMerch } = useQuery<MerchItem[]>({
    queryKey: ["/api/merch/artist", id],
    queryFn: async () => {
      const res = await fetch(`/api/merch/artist/${id}`);
      if (!res.ok) throw new Error("Failed to load merchandise");
      return res.json();
    },
    enabled: !!id,
  });

  // Follow / unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const isCurrentlyFollowing = followerData?.isFollowing ?? false;
      const method = isCurrentlyFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/follow/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update follow status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followers", id] });
    },
  });

  // Like track mutation
  const likeMutation = useMutation({
    mutationFn: async (trackId: string) => {
      setLikingTrackId(trackId);
      const res = await fetch(`/api/tracks/${trackId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to like track");
      return res.json();
    },
    onSettled: () => {
      setLikingTrackId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/artist", id] });
    },
  });

  const isFollowing = followerData?.isFollowing ?? false;
  const followerCount = followerData?.count ?? 0;

  // Full page loading state
  if (loadingProfile) {
    return (
      <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
        <LoadingState message="Loading artist profile..." />
      </div>
    );
  }

  // Error state
  if (profileError || !artist) {
    return (
      <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
        <header
          className="sticky top-0 z-50 backdrop-blur-md"
          style={{ background: "#0a0a0aee", borderBottom: "1px solid #1e1e1e" }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#999" }} />
            </button>
            <h1 className="text-lg font-bold">Artist Not Found</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <Music className="w-12 h-12 mb-4" style={{ color: "#333" }} />
          <p className="text-sm" style={{ color: "#666" }}>
            This artist profile could not be found.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{
              background: "rgba(14, 165, 233, 0.15)",
              color: "#0EA5E9",
              border: "1px solid rgba(14, 165, 233, 0.3)",
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "#0a0a0aee", borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Back to home"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#999" }} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <Disc3 className="w-6 h-6 shrink-0" style={{ color: "#0EA5E9" }} />
            <h1 className="text-lg sm:text-xl font-bold truncate">
              {artist.stageName}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Glass-morphism Profile Card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: "rgba(17, 17, 17, 0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
          data-testid="artist-profile-card"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
                boxShadow: "0 0 40px rgba(14, 165, 233, 0.25)",
              }}
            >
              {artist.avatarUrl ? (
                <img
                  src={artist.avatarUrl}
                  alt={artist.stageName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-12 h-12 text-white/80" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                {artist.stageName}
              </h2>

              {artist.bio && (
                <p
                  className="text-sm leading-relaxed mb-4 max-w-lg"
                  style={{ color: "#999" }}
                >
                  {artist.bio}
                </p>
              )}

              {/* Stats Row */}
              <div className="flex items-center justify-center sm:justify-start gap-6 mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: "#0EA5E9" }} />
                  <span className="text-sm font-bold text-white">
                    {followerCount.toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: "#666" }}>
                    followers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" style={{ color: "#06B6D4" }} />
                  <span className="text-sm font-bold text-white">
                    {tracks.length}
                  </span>
                  <span className="text-xs" style={{ color: "#666" }}>
                    tracks
                  </span>
                </div>
              </div>

              {/* Follow Button */}
              <button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={
                  isFollowing
                    ? {
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "#999",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }
                    : {
                        background: "#0EA5E9",
                        color: "#ffffff",
                        boxShadow: "0 0 24px rgba(14, 165, 233, 0.3)",
                      }
                }
                data-testid="follow-button"
              >
                {followMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <UserMinus className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {followMutation.isPending
                  ? "Updating..."
                  : isFollowing
                    ? "Unfollow"
                    : "Follow"}
              </button>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <section data-testid="tracks-section">
          <SectionHeader title="Tracks" count={tracks.length} />

          {loadingTracks ? (
            <LoadingState message="Loading tracks..." />
          ) : tracks.length === 0 ? (
            <EmptyState icon={Music} message="No tracks available yet." />
          ) : (
            <div
              className="rounded-2xl overflow-hidden divide-y"
              style={{
                background: "rgba(17, 17, 17, 0.5)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(30, 30, 30, 0.8)",
                borderTop: "1px solid #1e1e1e",
              }}
            >
              <div
                className="divide-y"
                style={{ borderColor: "#1e1e1e" }}
              >
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={index}
                    onLike={(trackId) => likeMutation.mutate(trackId)}
                    isLiking={likingTrackId === track.id}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Upcoming Concerts Section */}
        <section data-testid="concerts-section">
          <SectionHeader title="Upcoming Concerts" count={concerts.length} />

          {loadingConcerts ? (
            <LoadingState message="Loading concerts..." />
          ) : concerts.length === 0 ? (
            <EmptyState icon={Calendar} message="No upcoming concerts scheduled." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {concerts.map((concert) => (
                <div
                  key={concert.id}
                  className="rounded-2xl p-5 transition-all hover:scale-[1.01] hover:brightness-110"
                  style={{
                    background: "rgba(17, 17, 17, 0.7)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(30, 30, 30, 0.8)",
                    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
                  }}
                  data-testid={`concert-card-${concert.id}`}
                >
                  <h3 className="text-white font-bold text-sm mb-2 truncate">
                    {concert.title}
                  </h3>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: "#0EA5E9" }}
                      />
                      <span className="text-xs" style={{ color: "#999" }}>
                        {formatDate(concert.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: "#0EA5E9" }}
                      />
                      <span className="text-xs" style={{ color: "#999" }}>
                        {formatTime(concert.time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: "#0EA5E9" }}
                      />
                      <span className="text-xs truncate" style={{ color: "#999" }}>
                        {concert.venue}, {concert.city}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-3"
                    style={{ borderTop: "1px solid #1e1e1e" }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{
                        color:
                          concert.price === null || concert.price === 0
                            ? "#30d158"
                            : "#0EA5E9",
                      }}
                    >
                      {formatPrice(concert.price)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" style={{ color: "#666" }} />
                      <span className="text-xs" style={{ color: "#666" }}>
                        {concert.rsvpCount} attending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Merchandise Section */}
        <section data-testid="merch-section">
          <SectionHeader title="Merchandise" count={merch.length} />

          {loadingMerch ? (
            <LoadingState message="Loading merchandise..." />
          ) : merch.length === 0 ? (
            <EmptyState icon={ShoppingBag} message="No merchandise available." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {merch.map((item) => {
                const outOfStock = !item.available || item.stock <= 0;

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden transition-all ${
                      outOfStock ? "opacity-50 grayscale" : "hover:scale-[1.02]"
                    }`}
                    style={{
                      background: "rgba(17, 17, 17, 0.6)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
                    }}
                    data-testid={`merch-card-${item.id}`}
                  >
                    {/* Image area */}
                    <div
                      className="w-full h-40 flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.03))",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageOff className="w-8 h-8" style={{ color: "#333" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(14, 165, 233, 0.1)",
                            color: "#0EA5E9",
                            border: "1px solid rgba(14, 165, 233, 0.2)",
                          }}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {item.category}
                        </span>
                        <span
                          className="text-[10px] font-medium"
                          style={{
                            color: outOfStock
                              ? "#EF4444"
                              : item.stock <= 5
                                ? "#F59E0B"
                                : "#22C55E",
                          }}
                        >
                          {outOfStock
                            ? "Out of Stock"
                            : item.stock <= 5
                              ? `Only ${item.stock} left`
                              : "In Stock"}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white truncate">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p
                          className="text-xs line-clamp-2"
                          style={{ color: "#888" }}
                        >
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span
                          className="text-lg font-bold"
                          style={{ color: "#0EA5E9" }}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                        <button
                          disabled={outOfStock}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed"
                          style={
                            outOfStock
                              ? {
                                  background: "rgba(255, 255, 255, 0.05)",
                                  color: "#555",
                                }
                              : {
                                  background: "rgba(14, 165, 233, 0.15)",
                                  color: "#0EA5E9",
                                  border: "1px solid rgba(14, 165, 233, 0.3)",
                                }
                          }
                        >
                          {outOfStock ? "Sold Out" : "View"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
