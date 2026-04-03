import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Event, SetlistEntry } from "@shared/schema";
import { Music, Clock, Zap, DollarSign, ExternalLink } from "lucide-react";

interface SetlistData {
  event: Event;
  setlist: SetlistEntry[];
  totalReactions: number;
  totalTips: number;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SetlistPage() {
  const { eventCode } = useParams<{ eventCode: string }>();

  const { data, isLoading } = useQuery<SetlistData>({
    queryKey: ["/api/events", eventCode, "setlist"],
    queryFn: () => fetch(`/api/events/${eventCode}/setlist`).then(r => r.json()),
    enabled: !!eventCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0519" }}>
        <div className="text-white/50 text-sm">Loading setlist...</div>
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0519" }}>
        <div className="text-white/50 text-sm">Event not found.</div>
      </div>
    );
  }

  const { event, setlist, totalReactions, totalTips } = data;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
    >
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="text-3xl">🎶</div>
          <h1 className="text-2xl font-black text-white" data-testid="text-setlist-title">{event.name}</h1>
          <p className="text-white/40 text-sm">
            DJ {event.djName} &middot; {event.status === "ended" ? "Event Ended" : "Live Event"} &middot; Code: {event.code}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-3 text-center">
            <Music className="w-5 h-5 mx-auto mb-1 text-[#bf5af2]" />
            <div className="text-lg font-black text-white">{setlist.length}</div>
            <div className="text-[10px] text-white/40">Tracks</div>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <Zap className="w-5 h-5 mx-auto mb-1 text-[#ffd60a]" />
            <div className="text-lg font-black text-white">{totalReactions}</div>
            <div className="text-[10px] text-white/40">Reactions</div>
          </div>
          <div className="glass-card rounded-2xl p-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-[#30d158]" />
            <div className="text-lg font-black text-white">${totalTips.toFixed(2)}</div>
            <div className="text-[10px] text-white/40">Total Tips</div>
          </div>
        </div>

        {/* Setlist */}
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/40 px-1">Tracks Played</div>
          {setlist.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-white/30 text-sm">
              No tracks logged yet.
            </div>
          ) : (
            setlist.map((entry, i) => (
              <div
                key={entry.id}
                className="glass-card rounded-2xl p-4 flex items-center gap-4"
                data-testid={`setlist-entry-${i}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{entry.trackTitle}</div>
                  <div className="flex items-center gap-1 text-[10px] text-white/35 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(entry.playedAt)}</span>
                    <span className="text-white/20">·</span>
                    <span>by {entry.addedBy}</span>
                  </div>
                </div>
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(entry.trackTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all hover:scale-105"
                  style={{ background: "rgba(30,215,96,0.15)", color: "#1ed760", border: "1px solid rgba(30,215,96,0.3)" }}
                  data-testid={`link-spotify-${i}`}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Spotify
                </a>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-xs text-white/20 pb-4">
          DJ Hybrid &middot; After-Party Setlist 🎉
        </div>
      </div>
    </div>
  );
}
