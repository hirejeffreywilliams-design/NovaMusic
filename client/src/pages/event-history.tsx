import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Download, Music, Clock, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface PlayEvent {
  id: string;
  trackTitle: string;
  artistName: string;
  label: string | null;
  isrc: string | null;
  licenseType: string | null;
  duration: number | null;
  royaltyAmount: number | null;
  playedAt: string;
  eventName: string | null;
  venueName: string | null;
}

export default function EventHistoryPage() {
  const [, navigate] = useLocation();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newEventId, setNewEventId] = useState("");
  const [savedEvents, setSavedEvents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("djhybrid_events") || "[]"); } catch { return []; }
  });
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [trackForm, setTrackForm] = useState({ trackTitle: "", artistName: "", label: "", isrc: "", licenseType: "own", duration: "", eventName: "", venueName: "" });
  const [addingTrack, setAddingTrack] = useState(false);

  const { data: playEvents = [], isLoading } = useQuery<PlayEvent[]>({
    queryKey: ["/api/play-events/event", selectedEventId],
    enabled: !!selectedEventId,
    queryFn: async () => {
      const res = await fetch(`/api/play-events/event/${encodeURIComponent(selectedEventId)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/play-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, eventId: selectedEventId }),
      });
      if (!res.ok) throw new Error("Failed to add track");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/play-events/event", selectedEventId] });
      setAddingTrack(false);
      setTrackForm({ trackTitle: "", artistName: "", label: "", isrc: "", licenseType: "own", duration: "", eventName: "", venueName: "" });
    },
  });

  const createEvent = () => {
    if (!newEventId.trim()) return;
    const events = [...savedEvents, newEventId.trim()];
    setSavedEvents(events);
    localStorage.setItem("djhybrid_events", JSON.stringify(events));
    setSelectedEventId(newEventId.trim());
    setNewEventId("");
    setShowNewEvent(false);
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.trackTitle || !trackForm.artistName) return;
    addEventMutation.mutate({
      trackTitle: trackForm.trackTitle,
      artistName: trackForm.artistName,
      label: trackForm.label || null,
      isrc: trackForm.isrc || null,
      licenseType: trackForm.licenseType,
      duration: trackForm.duration ? parseInt(trackForm.duration) : null,
      eventName: trackForm.eventName || null,
      venueName: trackForm.venueName || null,
    });
  };

  const handleDownloadCSV = () => {
    if (!selectedEventId) return;
    window.open(`/api/play-events/event/${encodeURIComponent(selectedEventId)}/csv`, "_blank");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <FileText className="w-6 h-6 text-[#0af]" />
        <h1 className="text-lg font-black text-[#0af]">EVENT HISTORY & PLAY LOGS</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-[#0af]/5 border border-[#0af]/20 rounded-2xl p-4">
          <p className="text-xs text-white/60 leading-relaxed">
            Track every song played at each event for PRO compliance reporting. Export a formatted cue sheet / play log as CSV for sharing with your venue. Play logs include a reminder that DJs and venues are responsible for ASCAP/BMI/SESAC licensing.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 block">Select Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0af]/60"
              data-testid="select-event"
            >
              <option value="">— Choose an event —</option>
              {savedEvents.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setShowNewEvent(!showNewEvent)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold text-black bg-[#0af] hover:scale-[1.02] transition-all" data-testid="button-new-event">
              <Plus className="w-4 h-4" />New Event
            </button>
          </div>
        </div>

        {showNewEvent && (
          <div className="bg-white/5 border border-[#0af]/20 rounded-2xl p-4 flex gap-3">
            <input value={newEventId} onChange={(e) => setNewEventId(e.target.value)} placeholder="Event name / ID (e.g. 'Birthday Party 2026-04-15')" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-new-event-name" />
            <button onClick={createEvent} className="px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-[#0af] hover:scale-[1.02] transition-all" data-testid="button-create-event">Create</button>
          </div>
        )}

        {selectedEventId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white/80">
                Play Log: <span className="text-[#0af]">{selectedEventId}</span>
                <span className="ml-2 text-white/30 font-normal">({playEvents.length} tracks)</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setAddingTrack(!addingTrack)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#0af] bg-[#0af]/10 hover:bg-[#0af]/20 transition-colors" data-testid="button-add-track-to-log">
                  <Plus className="w-3 h-3" />Add Track
                </button>
                <button onClick={handleDownloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-[#0af] hover:scale-[1.02] transition-all" data-testid="button-download-playlog">
                  <Download className="w-3 h-3" />Download Play Log
                </button>
              </div>
            </div>

            {addingTrack && (
              <form onSubmit={handleAddTrack} className="bg-white/5 border border-[#0af]/20 rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-black text-[#0af]">Add Track to Play Log</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input value={trackForm.trackTitle} onChange={(e) => setTrackForm({ ...trackForm, trackTitle: e.target.value })} placeholder="Track title *" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-track-title" />
                  <input value={trackForm.artistName} onChange={(e) => setTrackForm({ ...trackForm, artistName: e.target.value })} placeholder="Artist name *" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-artist-name" />
                  <input value={trackForm.label} onChange={(e) => setTrackForm({ ...trackForm, label: e.target.value })} placeholder="Label (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-label" />
                  <input value={trackForm.isrc} onChange={(e) => setTrackForm({ ...trackForm, isrc: e.target.value })} placeholder="ISRC (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-isrc" />
                  <input value={trackForm.duration} onChange={(e) => setTrackForm({ ...trackForm, duration: e.target.value })} placeholder="Duration (seconds)" type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-duration" />
                  <input value={trackForm.venueName} onChange={(e) => setTrackForm({ ...trackForm, venueName: e.target.value })} placeholder="Venue name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#0af]/60" data-testid="input-log-venue-name" />
                </div>
                <select value={trackForm.licenseType} onChange={(e) => setTrackForm({ ...trackForm, licenseType: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0af]/60" data-testid="select-log-license-type">
                  <option value="own">My own track / standard license</option>
                  <option value="free">Marketplace — Free</option>
                  <option value="royalty">Marketplace — Royalty</option>
                  <option value="promo">Marketplace — Promo</option>
                </select>
                <div className="flex gap-3">
                  <button type="submit" disabled={addEventMutation.isPending} className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm bg-[#0af] hover:scale-[1.01] transition-all disabled:opacity-50" data-testid="button-submit-log-track">
                    {addEventMutation.isPending ? "Adding..." : "Add to Log"}
                  </button>
                  <button type="button" onClick={() => setAddingTrack(false)} className="px-4 py-2.5 rounded-xl font-bold text-white/60 text-sm bg-white/5 hover:bg-white/10 transition-all">Cancel</button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-white/30"><Music className="w-8 h-8 mx-auto mb-2 animate-pulse" /><p className="text-sm">Loading...</p></div>
            ) : playEvents.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tracks logged yet.</p>
                <p className="text-xs mt-1">Tracks are automatically logged when played via the DJ console, or you can add them manually above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {playEvents.map((event, i) => (
                  <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3" data-testid={`play-event-row-${event.id}`}>
                    <div className="text-[10px] text-white/30 shrink-0 w-6 text-center">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{event.trackTitle}</p>
                      <p className="text-xs text-white/40">{event.artistName}{event.label && ` · ${event.label}`}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      {event.isrc && <p className="text-[9px] text-white/30">{event.isrc}</p>}
                      {event.licenseType && event.licenseType !== "own" && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#ffd60a]/10 text-[#ffd60a]">
                          {event.licenseType.toUpperCase()}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-white/30">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(event.playedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
