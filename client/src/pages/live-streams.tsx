import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Radio,
  Users,
  Clock,
  Plus,
  X,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Stream {
  id: string;
  title: string;
  description: string | null;
  artistName: string;
  viewerCount: number;
  status: "live" | "scheduled" | "ended";
  scheduledAt: string | null;
  startedAt: string | null;
  createdAt: string;
}

function formatViewerCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: Stream["status"] }) {
  if (status === "live") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full"
        data-testid="badge-live"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        LIVE
      </span>
    );
  }

  if (status === "scheduled") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full"
        data-testid="badge-scheduled"
      >
        <Clock className="w-3 h-3" />
        Scheduled
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/5 px-2 py-0.5 rounded-full"
      data-testid="badge-ended"
    >
      <WifiOff className="w-3 h-3" />
      Ended
    </span>
  );
}

function SkeletonStreamCard() {
  return (
    <div className="rounded-2xl bg-[#111111] border border-[#1e1e1e] p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-white/5 rounded w-1/3" />
        <div className="h-5 bg-white/5 rounded-full w-16" />
      </div>
      <div className="h-3 bg-white/5 rounded w-2/3 mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-3 bg-white/5 rounded w-24" />
        <div className="h-3 bg-white/5 rounded w-16" />
      </div>
    </div>
  );
}

export default function LiveStreamsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const {
    data: streams = [],
    isLoading,
  } = useQuery<Stream[]>({
    queryKey: ["/api/streams/live"],
    queryFn: async () => {
      const res = await fetch("/api/streams/live");
      if (!res.ok) throw new Error("Failed to load streams");
      return res.json();
    },
  });

  const createStreamMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create stream");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/streams/live"] });
      setFormTitle("");
      setFormDescription("");
      setShowCreateForm(false);
    },
  });

  const handleCreateStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    createStreamMutation.mutate({
      title: formTitle.trim(),
      description: formDescription.trim(),
    });
  };

  const liveStreams = streams.filter((s) => s.status === "live");
  const scheduledStreams = streams.filter((s) => s.status === "scheduled");
  const endedStreams = streams.filter((s) => s.status === "ended");

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
            <Radio className="w-6 h-6 text-[#0EA5E9]" />
            <h1 className="text-lg font-black text-[#0EA5E9] tracking-wide">
              LIVE NOW
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="text-xs text-white/30">
                {liveStreams.length} live
              </span>
            )}
            {user && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0EA5E9] bg-[#0EA5E9]/10 hover:bg-[#0EA5E9]/20 transition-colors"
                data-testid="button-start-streaming"
              >
                {showCreateForm ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Start Streaming
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Create Stream Form */}
        {showCreateForm && user && (
          <section
            className="rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-[#0EA5E9]/30 p-6"
            data-testid="create-stream-form"
          >
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="w-5 h-5 text-[#0EA5E9]" />
              <h2 className="text-base font-bold text-white">
                Start a New Stream
              </h2>
            </div>
            <form onSubmit={handleCreateStream} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  Stream Title
                </label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Give your stream a name..."
                  className="w-full bg-black/30 border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0EA5E9]/60 transition-colors"
                  required
                  data-testid="input-stream-title"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-white/40">
                  Description
                </label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What will you be playing today?"
                  className="w-full bg-black/30 border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0EA5E9]/60 transition-colors"
                  data-testid="input-stream-description"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!formTitle.trim() || createStreamMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
                  data-testid="button-submit-stream"
                >
                  <Send className="w-4 h-4" />
                  {createStreamMutation.isPending
                    ? "Starting..."
                    : "Go Live"}
                </button>
                {createStreamMutation.isError && (
                  <p className="text-xs text-red-400">
                    Failed to start stream. Please try again.
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStreamCard key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && streams.length === 0 && (
          <div className="text-center py-20">
            <Radio className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-sm font-medium mb-2">
              No streams are live right now
            </p>
            <p className="text-white/20 text-xs max-w-sm mx-auto">
              Check back later or start your own stream to share your music with
              the community.
            </p>
            {user && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-bold text-sm text-black bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 transition-all hover:scale-[1.02]"
                data-testid="button-empty-start-streaming"
              >
                <Plus className="w-4 h-4" />
                Start Streaming
              </button>
            )}
          </div>
        )}

        {/* Live Streams */}
        {!isLoading && liveStreams.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <h2 className="text-base font-bold text-white">
                Live Now
              </h2>
              <span className="ml-auto text-xs text-white/30">
                {liveStreams.length} stream{liveStreams.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="group rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-[#1e1e1e] p-5 hover:bg-[#111111] hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                  data-testid={`stream-card-${stream.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white truncate pr-3">
                      {stream.title}
                    </h3>
                    <StatusBadge status={stream.status} />
                  </div>
                  {stream.description && (
                    <p className="text-xs text-white/40 mb-3 line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#06B6D4] font-medium">
                      {stream.artistName}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Users className="w-3 h-3" />
                      {formatViewerCount(stream.viewerCount)} watching
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scheduled Streams */}
        {!isLoading && scheduledStreams.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-base font-bold text-white">
                Coming Up
              </h2>
              <span className="ml-auto text-xs text-white/30">
                {scheduledStreams.length} scheduled
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="group rounded-2xl bg-[#111111]/80 backdrop-blur-md border border-[#1e1e1e] p-5 hover:bg-[#111111] hover:border-[#F59E0B]/30 transition-all duration-200 cursor-pointer"
                  data-testid={`stream-card-${stream.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white truncate pr-3">
                      {stream.title}
                    </h3>
                    <StatusBadge status={stream.status} />
                  </div>
                  {stream.description && (
                    <p className="text-xs text-white/40 mb-3 line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#06B6D4] font-medium">
                      {stream.artistName}
                    </p>
                    {stream.scheduledAt && (
                      <span className="flex items-center gap-1 text-[10px] text-[#F59E0B]/60">
                        <Clock className="w-3 h-3" />
                        {formatScheduledDate(stream.scheduledAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ended Streams */}
        {!isLoading && endedStreams.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <WifiOff className="w-5 h-5 text-white/30" />
              <h2 className="text-base font-bold text-white/50">
                Recently Ended
              </h2>
              <span className="ml-auto text-xs text-white/20">
                {endedStreams.length} ended
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {endedStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="rounded-2xl bg-[#111111]/40 backdrop-blur-md border border-[#1e1e1e]/60 p-5 opacity-60"
                  data-testid={`stream-card-${stream.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white/60 truncate pr-3">
                      {stream.title}
                    </h3>
                    <StatusBadge status={stream.status} />
                  </div>
                  {stream.description && (
                    <p className="text-xs text-white/25 mb-3 line-clamp-2">
                      {stream.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30 font-medium">
                      {stream.artistName}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-white/20">
                      <Users className="w-3 h-3" />
                      {formatViewerCount(stream.viewerCount)} watched
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
