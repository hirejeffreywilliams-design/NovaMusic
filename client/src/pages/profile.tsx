import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  User,
  ArrowLeft,
  Heart,
  ListMusic,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  BarChart2,
  Mic2,
  Loader2,
} from "lucide-react";

interface UserData {
  id: string;
  username: string;
  accountType: string;
  tosAcknowledgedAt?: string | null;
  venueLicenseAcknowledgedAt?: string | null;
}

interface UserStats {
  likesCount: number;
  playlistsCount: number;
  followingCount: number;
}

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats>({
    likesCount: 0,
    playlistsCount: 0,
    followingCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [likesRes, playlistsRes, followingRes] = await Promise.allSettled([
          fetch(`/api/users/${user.id}/likes`),
          fetch(`/api/playlists/user/${user.id}`),
          fetch(`/api/users/${user.id}/following`),
        ]);

        const likesCount =
          likesRes.status === "fulfilled" && likesRes.value.ok
            ? (await likesRes.value.json()).length ?? 0
            : 0;

        const playlistsCount =
          playlistsRes.status === "fulfilled" && playlistsRes.value.ok
            ? (await playlistsRes.value.json()).length ?? 0
            : 0;

        const followingCount =
          followingRes.status === "fulfilled" && followingRes.value.ok
            ? (await followingRes.value.json()).length ?? 0
            : 0;

        setStats({ likesCount, playlistsCount, followingCount });
      } catch {
        // Keep defaults on error
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed with local cleanup even if request fails
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      navigate("/");
    }
  };

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0EA5E9" }} />
      </div>
    );
  }

  const avatarLetter = user.username.charAt(0).toUpperCase();
  const isArtist = user.accountType === "artist";
  const accountLabel = isArtist ? "Artist" : "DJ";
  const memberSince = user.tosAcknowledgedAt
    ? new Date(user.tosAcknowledgedAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "N/A";

  const glassCard: React.CSSProperties = {
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    border: "1px solid #1e1e1e",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  };

  const quickLinks = [
    {
      label: "My Playlists",
      icon: ListMusic,
      href: "/playlists",
      color: "#0EA5E9",
    },
    {
      label: "Liked Tracks",
      icon: Heart,
      href: "/likes",
      color: "#ef4444",
    },
    {
      label: "Following",
      icon: Users,
      href: "/following",
      color: "#06B6D4",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      color: "#a855f7",
    },
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <User className="w-6 h-6" style={{ color: "#0EA5E9" }} />
        <h1
          className="text-lg font-black"
          style={{ color: "#0EA5E9" }}
        >
          Profile
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar & Username */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4"
            style={{
              background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
            }}
            data-testid="avatar-placeholder"
          >
            {avatarLetter}
          </div>
          <h2 className="text-xl font-bold text-white">{user.username}</h2>
          <span
            className="mt-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
            style={{
              backgroundColor: isArtist
                ? "rgba(6, 182, 212, 0.15)"
                : "rgba(14, 165, 233, 0.15)",
              color: isArtist ? "#06B6D4" : "#0EA5E9",
            }}
            data-testid="badge-account-type"
          >
            {accountLabel}
          </span>
        </div>

        {/* Account Info */}
        <section className="rounded-2xl p-5" style={glassCard} data-testid="section-account-info">
          <h3
            className="text-xs font-black uppercase tracking-wider mb-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Account Info
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Username</span>
              <span className="text-sm font-semibold text-white">{user.username}</span>
            </div>
            <div
              className="w-full"
              style={{ height: "1px", backgroundColor: "#1e1e1e" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Account Type</span>
              <span className="text-sm font-semibold text-white">{accountLabel}</span>
            </div>
            <div
              className="w-full"
              style={{ height: "1px", backgroundColor: "#1e1e1e" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Member Since</span>
              <span className="text-sm font-semibold text-white">{memberSince}</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="rounded-2xl p-5" style={glassCard} data-testid="section-stats">
          <h3
            className="text-xs font-black uppercase tracking-wider mb-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Stats
          </h3>
          {loadingStats ? (
            <div className="flex items-center justify-center py-6">
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "#0EA5E9" }}
              />
              <span className="ml-2 text-sm text-white/40">Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <p className="text-2xl font-black text-white">{stats.likesCount}</p>
                <p className="text-xs text-white/40 mt-0.5">Likes</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <ListMusic className="w-5 h-5" style={{ color: "#0EA5E9" }} />
                </div>
                <p className="text-2xl font-black text-white">{stats.playlistsCount}</p>
                <p className="text-xs text-white/40 mt-0.5">Playlists</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5" style={{ color: "#06B6D4" }} />
                </div>
                <p className="text-2xl font-black text-white">{stats.followingCount}</p>
                <p className="text-xs text-white/40 mt-0.5">Following</p>
              </div>
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="rounded-2xl p-5" style={glassCard} data-testid="section-quick-links">
          <h3
            className="text-xs font-black uppercase tracking-wider mb-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Quick Links
          </h3>
          <div className="space-y-1">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.href)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                  data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${link.color}15` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: link.color }} />
                  </div>
                  <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors flex-1 text-left">
                    {link.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                </button>
              );
            })}

            {/* Artist Dashboard link (only for artists) */}
            {isArtist && (
              <button
                onClick={() => navigate("/artist/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group"
                data-testid="link-artist-dashboard"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "rgba(234, 179, 8, 0.1)" }}
                >
                  <Mic2 className="w-4.5 h-4.5" style={{ color: "#eab308" }} />
                </div>
                <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors flex-1 text-left">
                  Artist Dashboard
                </span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </button>
            )}
          </div>
        </section>

        {/* Account Actions */}
        <section className="rounded-2xl p-5" style={glassCard} data-testid="section-account-actions">
          <h3
            className="text-xs font-black uppercase tracking-wider mb-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Account Actions
          </h3>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] disabled:opacity-50 disabled:scale-100"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
            }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>
        </section>
      </main>
    </div>
  );
}
