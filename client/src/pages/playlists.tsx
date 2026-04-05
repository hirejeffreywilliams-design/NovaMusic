import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Music, Globe, Lock, Users, X, ListMusic, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: string;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

const VISIBILITY_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string; bg: string }> = {
  public: { label: "Public", icon: Globe, color: "#0EA5E9", bg: "rgba(14,165,233,0.15)" },
  private: { label: "Private", icon: Lock, color: "#06B6D4", bg: "rgba(6,182,212,0.15)" },
  collaborative: { label: "Collaborative", icon: Users, color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
};

export default function PlaylistsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVisibility, setNewVisibility] = useState("private");

  const {
    data: myPlaylists = [],
    isLoading: loadingMine,
  } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists/user", userId],
    queryFn: async () => {
      const res = await fetch(`/api/playlists/user/${userId}`);
      if (!res.ok) throw new Error("Failed to load playlists");
      return res.json();
    },
    enabled: !!userId,
  });

  const {
    data: publicPlaylists = [],
    isLoading: loadingPublic,
  } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists/public"],
    queryFn: async () => {
      const res = await fetch("/api/playlists/public");
      if (!res.ok) throw new Error("Failed to load public playlists");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { userId: string; name: string; description: string; visibility: string }) => {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create playlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists/user", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists/public"] });
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      setNewVisibility("private");
    },
  });

  const handleCreate = () => {
    if (!userId || !newName.trim()) return;
    createMutation.mutate({
      userId,
      name: newName.trim(),
      description: newDescription.trim(),
      visibility: newVisibility,
    });
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <Lock className="w-12 h-12 text-white/20 mx-auto" />
          <h1 className="text-xl font-bold text-white/80">Sign in Required</h1>
          <p className="text-sm text-white/40 max-w-sm">
            Please log in to view and manage your playlists.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 transition-colors"
            data-testid="button-go-home"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const renderPlaylistCard = (playlist: Playlist) => {
    const visConfig = VISIBILITY_CONFIG[playlist.visibility] || VISIBILITY_CONFIG.private;
    const VisIcon = visConfig.icon;

    return (
      <div
        key={playlist.id}
        className="bg-[#111111]/80 backdrop-blur-md border border-[#1e1e1e] rounded-2xl p-5 hover:border-[#0EA5E9]/30 transition-all duration-200 cursor-pointer group"
        data-testid={`playlist-card-${playlist.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 group-hover:bg-[#0EA5E9]/20 transition-colors">
            <ListMusic className="w-5 h-5 text-[#0EA5E9]" />
          </div>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background: visConfig.bg, color: visConfig.color }}
          >
            <VisIcon className="w-3 h-3" />
            {visConfig.label}
          </span>
        </div>

        <h3 className="text-sm font-bold text-white truncate mb-1">{playlist.name}</h3>
        {playlist.description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-3">{playlist.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1e1e1e]">
          <div className="flex items-center gap-1.5 text-white/30">
            <Music className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
            </span>
          </div>
          <span className="text-[10px] text-white/20">
            {new Date(playlist.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <ListMusic className="w-6 h-6 text-[#0EA5E9]" />
          <h1 className="text-lg font-black text-[#0EA5E9]">My Playlists</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 transition-colors"
          data-testid="button-create-playlist"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* My Playlists Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#06B6D4]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60">My Playlists</h2>
          </div>

          {loadingMine ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#0EA5E9] animate-spin" />
              <span className="ml-3 text-sm text-white/40">Loading your playlists...</span>
            </div>
          ) : myPlaylists.length === 0 ? (
            <div className="bg-[#111111]/50 backdrop-blur-md border border-[#1e1e1e] rounded-2xl p-10 text-center">
              <ListMusic className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30 mb-1">No playlists yet</p>
              <p className="text-xs text-white/20">Create your first playlist to start organizing your tracks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPlaylists.map(renderPlaylistCard)}
            </div>
          )}
        </section>

        {/* Public Playlists Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#0EA5E9]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white/60">Public Playlists</h2>
          </div>

          {loadingPublic ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#0EA5E9] animate-spin" />
              <span className="ml-3 text-sm text-white/40">Loading public playlists...</span>
            </div>
          ) : publicPlaylists.length === 0 ? (
            <div className="bg-[#111111]/50 backdrop-blur-md border border-[#1e1e1e] rounded-2xl p-10 text-center">
              <Globe className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30 mb-1">No public playlists available</p>
              <p className="text-xs text-white/20">Be the first to share a playlist with the community.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicPlaylists.map(renderPlaylistCard)}
            </div>
          )}
        </section>
      </main>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-[#111111] border border-[#1e1e1e] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Create Playlist</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                  Playlist Name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Summer Vibes 2026"
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0EA5E9]/60 transition-colors"
                  data-testid="input-playlist-name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What's this playlist about?"
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0EA5E9]/60 transition-colors resize-none"
                  data-testid="input-playlist-description"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
                  Visibility
                </label>
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0EA5E9]/60 transition-colors"
                  data-testid="select-playlist-visibility"
                >
                  <option value="private">Private - Only you can see</option>
                  <option value="public">Public - Visible to everyone</option>
                  <option value="collaborative">Collaborative - Others can add tracks</option>
                </select>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-400">
                  Failed to create playlist. Please try again.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
                  data-testid="button-cancel-create"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Playlist"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
