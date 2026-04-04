import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Volume2, Check, X, Plus, QrCode, Users, Zap, Music, Star, Crown, Radio } from "lucide-react";
import type { Event, SongRequest, Poll, Shoutout, Tip, Leaderboard } from "@shared/schema";
import { TipGoalBar, TipLeaderboard, TipAnimationOverlay, type TipEvent } from "@/components/tip-animation-overlay";
import { LyricsPanel } from "@/components/lyrics-panel";
import { useWebRTCBroadcast } from "@/hooks/use-webrtc-broadcast";

const MOOD_PRESETS = [
  { color: "#ff2d78", keyword: "HYPE" },
  { color: "#0af", keyword: "CHILL" },
  { color: "#ffd60a", keyword: "GOLDEN" },
  { color: "#30d158", keyword: "VIBIN" },
  { color: "#bf5af2", keyword: "MYSTIC" },
  { color: "#ff9500", keyword: "FIRE" },
];

function EnergyMeter({ rpm }: { rpm: number }) {
  const max = 20;
  const pct = Math.min(100, (rpm / max) * 100);
  const color = pct > 70 ? "#30d158" : pct > 40 ? "#ffd60a" : pct > 15 ? "#ff9500" : "#ff453a";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/40">
        <span>CROWD ENERGY ({rpm} RPM)</span>
        <span style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}80, ${color})`, boxShadow: `0 0 10px ${color}60` }}
        />
      </div>
    </div>
  );
}

function QRCodeDisplay({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    import("qrcode").then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, {
          width: 150,
          color: { dark: "#ffffff", light: "#00000000" },
        });
      }
    }).catch(() => {});
  }, [url]);

  return <canvas ref={canvasRef} className="rounded-xl" />;
}

function BattleTab({
  eventCode, eventId, battleVotes, djName,
}: {
  eventCode?: string; eventId?: string; battleVotes: { A: number; B: number }; djName?: string;
}) {
  const { toast } = useToast();
  const [joinName, setJoinName] = useState("");
  const [joinEventCode, setJoinEventCode] = useState("");
  const [joined, setJoined] = useState(false);

  const joinMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/events/${joinEventCode || eventCode}/battle-join`, { djName: joinName || djName }).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: "Joined Battle!", description: data.message });
      setJoined(true);
    },
    onError: () => toast({ title: "Failed to join battle", variant: "destructive" }),
  });

  const total = battleVotes.A + battleVotes.B;
  const leader = battleVotes.A > battleVotes.B ? "A" : battleVotes.B > battleVotes.A ? "B" : null;

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-white/40 uppercase tracking-wider">DJ Battle Mode</div>

      {/* Live Vote Scoreboard */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(191,90,242,0.08)", border: "1px solid rgba(191,90,242,0.2)" }}>
        <div className="text-[11px] font-black text-white/60 text-center">LIVE VOTES</div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: leader === "A" ? "rgba(255,214,10,0.15)" : "rgba(255,255,255,0.05)", border: leader === "A" ? "2px solid #ffd60a" : "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-xs font-black text-white">Deck A {leader === "A" ? "👑" : ""}</div>
            <div className="text-2xl font-black text-[#ffd60a]">{battleVotes.A}</div>
          </div>
          <div className="flex-1 rounded-lg p-2 text-center" style={{ background: leader === "B" ? "rgba(255,214,10,0.15)" : "rgba(255,255,255,0.05)", border: leader === "B" ? "2px solid #ffd60a" : "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-xs font-black text-white">Deck B {leader === "B" ? "👑" : ""}</div>
            <div className="text-2xl font-black text-[#ffd60a]">{battleVotes.B}</div>
          </div>
        </div>
        {total === 0 && <div className="text-center text-[10px] text-white/25">Waiting for crowd votes...</div>}
        {leader && <div className="text-center text-[11px] font-black text-[#ffd60a]">Deck {leader} is leading! 🔥</div>}
        {total > 0 && !leader && <div className="text-center text-[11px] text-white/50">It's tied! 🤝</div>}
      </div>

      {/* Second DJ Join Section */}
      {!joined && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/40">Join an existing battle as Deck B:</div>
          {!eventCode && (
            <input
              value={joinEventCode}
              onChange={e => setJoinEventCode(e.target.value.toUpperCase())}
              placeholder="Event code (e.g. ABC123)"
              className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/15 text-white placeholder:text-white/25 focus:outline-none"
              data-testid="input-battle-event-code"
            />
          )}
          <input
            value={joinName}
            onChange={e => setJoinName(e.target.value)}
            placeholder="Your DJ name for Deck B"
            className="w-full px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/15 text-white placeholder:text-white/25 focus:outline-none"
            data-testid="input-battle-dj-name"
          />
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending || (!joinName && !djName)}
            className="w-full py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
            data-testid="button-battle-join"
          >
            {joinMutation.isPending ? "Joining..." : "⚔️ Join as Deck B"}
          </button>
        </div>
      )}
      {joined && <div className="text-center text-xs text-[#30d158] py-2">✓ You've joined as Deck B! The crowd is watching...</div>}
    </div>
  );
}

interface CrowdHubProps {
  eventId?: string;
  eventCode?: string;
  eventName?: string;
  djId?: string;
  djName?: string;
  nowPlaying?: string;
  getMasterNode?: () => AudioNode | null;
  getAudioCtx?: () => AudioContext | null;
}

export function CrowdHub({ eventId, eventCode, eventName, djId, djName, nowPlaying, getMasterNode, getAudioCtx }: CrowdHubProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"requests" | "polls" | "shoutouts" | "tips" | "leaderboard" | "mood" | "battle">("requests");
  const [newPollQ, setNewPollQ] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [reactions, setReactions] = useState<{ emoji: string; ts: number }[]>([]);
  const [aiCoachAlert, setAiCoachAlert] = useState<string | null>(null);
  const [nowPlayingInput, setNowPlayingInput] = useState(nowPlaying || "");
  const [battleVotes, setBattleVotes] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [tipEvent, setTipEvent] = useState<TipEvent | null>(null);
  const [totalTipsWs, setTotalTipsWs] = useState(0);
  const [sessionTips, setSessionTips] = useState<{ fromName: string; amount: number; createdAt: number }[]>([]);
  const [listenerCount, setListenerCount] = useState(0);
  const [tipGoal, setTipGoal] = useState(50);
  const [tipGoalInput, setTipGoalInput] = useState("50");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const tipIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const { startBroadcast, stopBroadcast } = useWebRTCBroadcast(ws, true);

  const crowdUrl = eventCode ? `${window.location.origin}/party/${eventCode}` : "";
  const rpm = reactions.filter(r => Date.now() - r.ts < 60000).length;

  // WebSocket for real-time updates
  useEffect(() => {
    if (!eventId) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const newWs = new WebSocket(`${protocol}//${window.location.host}/ws?eventId=${eventId}&type=dj&djId=${encodeURIComponent(djId || "")}&name=${encodeURIComponent(djName || "DJ")}`);
    wsRef.current = newWs;
    setWs(newWs);
    const ws = newWs;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_request" || msg.type === "priority_request") {
          qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
          if (msg.type === "priority_request") {
            toast({ title: "⚡ Priority Request!", description: `${msg.request.crowdName}: "${msg.request.trackTitle}"` });
          }
        }
        if (msg.type === "new_shoutout") {
          qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
          toast({ title: "📣 New Shoutout!", description: `From ${msg.shoutout.fromName}` });
        }
        if (msg.type === "new_tip") {
          qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
          toast({ title: "💸 Tip Received!", description: `$${msg.tip.amount} from ${msg.tip.fromName}` });
          const te: TipEvent = { fromName: msg.tip.fromName, amount: msg.tip.amount, id: `tip-${tipIdRef.current++}` };
          setTipEvent(te);
          setSessionTips(prev => [...prev, { fromName: msg.tip.fromName, amount: msg.tip.amount, createdAt: Date.now() }]);
        }
        if (msg.type === "tip_received") {
          setTotalTipsWs(msg.totalTips || 0);
        }
        if (msg.type === "poll_vote") {
          qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
        }
        if (msg.type === "reaction") {
          setReactions(prev => [...prev.slice(-99), { emoji: msg.reaction.emoji, ts: msg.reaction.createdAt }]);
        }
        if (msg.type === "ai_coach_alert") {
          setAiCoachAlert(msg.suggestion);
        }
        if (msg.type === "battle_vote") {
          setBattleVotes(msg.voteCount);
        }
        if (msg.type === "listener_update") {
          setListenerCount(msg.count || 0);
        }
      } catch (_) {}
    };

    return () => { ws.close(); setWs(null); };
  }, [eventId, djName, qc, toast]);

  const { data: stateData } = useQuery({
    queryKey: ["/api/events", eventId, "state"],
    queryFn: () => fetch(`/api/events/${eventId}/state`).then(r => r.json()),
    enabled: !!eventId,
    refetchInterval: 10000,
  });

  const { data: leaderboard } = useQuery<Leaderboard[]>({
    queryKey: ["/api/events", eventCode, "leaderboard"],
    queryFn: () => fetch(`/api/events/${eventCode}/leaderboard`).then(r => r.json()),
    enabled: !!eventCode,
    refetchInterval: 15000,
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: string }) =>
      apiRequest("PATCH", `/api/events/${eventId}/requests/${requestId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] }),
  });

  const addToSetlistMutation = useMutation({
    mutationFn: ({ trackTitle }: { trackTitle: string }) =>
      apiRequest("POST", `/api/events/${eventId}/setlist`, { trackTitle, addedBy: djName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
      setNowPlayingInput("");
      toast({ title: "Added to setlist!" });
    },
  });

  const createPollMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/polls`, { question: newPollQ, options: newPollOptions.filter(Boolean) }),
    onSuccess: () => {
      setNewPollQ(""); setNewPollOptions(["", ""]);
      qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] });
      toast({ title: "Poll created!" });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => apiRequest("POST", `/api/events/${eventId}/polls/${pollId}/close`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] }),
  });

  const announceShoutoutMutation = useMutation({
    mutationFn: (shoutoutId: string) => apiRequest("POST", `/api/events/${eventId}/shoutouts/${shoutoutId}/announce`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/events", eventId, "state"] }),
  });

  const moodMutation = useMutation({
    mutationFn: ({ moodColor, moodKeyword }: { moodColor: string; moodKeyword: string }) =>
      apiRequest("PATCH", `/api/events/${eventId}`, { moodColor, moodKeyword }),
    onSuccess: () => toast({ title: "Mood updated!", description: "Crowd phones synced." }),
  });

  const endEventMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/events/${eventId}/end`, {}),
    onSuccess: () => toast({ title: "Event ended!", description: "Payout created." }),
  });

  const readAloud = (text: string) => {
    if ("speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utt);
    }
  };

  const sendCrowdSing = useCallback((line: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "crowd_sing", line }));
    }
  }, []);

  const sendLyricsLine = useCallback((lineIndex: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "lyrics_line", lineIndex }));
    }
  }, []);

  const pendingRequests = stateData?.requests?.filter((r: SongRequest) => r.status === "pending") || [];
  const activePoll = stateData?.polls?.find((p: Poll) => p.active);
  const unnouncedShoutouts = stateData?.shoutouts?.filter((s: Shoutout) => !s.announced) || [];
  const allTips: Tip[] = stateData?.tips || [];
  const totalTips = allTips.reduce((s: number, t: Tip) => s + t.amount, 0);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        No active event. Create an event to enable Crowd Hub.
      </div>
    );
  }

  const tabs = [
    { id: "requests" as const, label: "Requests", badge: pendingRequests.length, emoji: "🎵" },
    { id: "polls" as const, label: "Polls", badge: 0, emoji: "📊" },
    { id: "shoutouts" as const, label: "Shoutouts", badge: unnouncedShoutouts.length, emoji: "📣" },
    { id: "tips" as const, label: "Tips", badge: 0, emoji: "💸" },
    { id: "leaderboard" as const, label: "Leaders", badge: 0, emoji: "🏆" },
    { id: "mood" as const, label: "Mood", badge: 0, emoji: "🎨" },
    { id: "battle" as const, label: "Battle", badge: 0, emoji: "⚔️" },
  ];

  const medals = ["👑", "🥈", "🥉"];

  return (
    <div className="space-y-4 h-full overflow-auto">
      <TipAnimationOverlay tipEvent={tipEvent} tipGoal={tipGoal} totalTips={totalTipsWs || totalTips} />

      {/* AI Coach Alert */}
      {aiCoachAlert && (
        <div className="rounded-2xl p-4 flex items-start gap-3 animate-slide-in-up" style={{ background: "rgba(255,214,10,0.12)", border: "1.5px solid rgba(255,214,10,0.35)" }}>
          <span className="text-xl shrink-0">🤖</span>
          <div className="flex-1">
            <div className="text-[10px] font-black text-[#ffd60a] uppercase tracking-wider mb-1">AI Crowd Coach Alert</div>
            <p className="text-xs text-white/70" data-testid="text-ai-coach">{aiCoachAlert}</p>
            <p className="text-[9px] italic text-white/30 mt-1">AI suggestions are for guidance only. Apply your own professional judgment.</p>
          </div>
          <button onClick={() => setAiCoachAlert(null)} className="text-white/30 hover:text-white/60 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Energy + QR */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <EnergyMeter rpm={rpm} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="py-2 rounded-xl" style={{ background: "rgba(48,209,88,0.1)" }}>
              <div className="text-sm font-black text-[#30d158]">${totalTips.toFixed(2)}</div>
              <div className="text-[9px] text-white/35">Tips</div>
            </div>
            <div className="py-2 rounded-xl" style={{ background: "rgba(191,90,242,0.1)" }}>
              <div className="text-sm font-black text-[#bf5af2]">{stateData?.reactions?.length || 0}</div>
              <div className="text-[9px] text-white/35">Reactions</div>
            </div>
            <div className="py-2 rounded-xl" style={{ background: "rgba(0,170,255,0.1)" }}>
              <div className="text-sm font-black text-[#0af]">{listenerCount}</div>
              <div className="text-[9px] text-white/35">Live</div>
            </div>
          </div>
          {/* Live Audio Broadcast */}
          <button
            data-testid="button-go-live"
            onClick={async () => {
              if (isBroadcasting) {
                stopBroadcast();
                setIsBroadcasting(false);
              } else {
                try {
                  let stream: MediaStream | null = null;
                  let masterDest: MediaStreamAudioDestinationNode | undefined;
                  const ctx = getAudioCtx?.();
                  const masterNode = getMasterNode?.();
                  if (ctx && masterNode) {
                    masterDest = ctx.createMediaStreamDestination();
                    masterNode.connect(masterDest);
                    stream = masterDest.stream;
                  }
                  if (!stream || stream.getAudioTracks().length === 0) {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    masterDest = undefined;
                  }
                  await startBroadcast(stream, masterDest);
                  setIsBroadcasting(true);
                } catch (err) {
                  toast({ title: "Mic access denied", description: "Allow microphone access to broadcast live audio.", variant: "destructive" });
                }
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: isBroadcasting ? "rgba(255,45,120,0.25)" : "rgba(48,209,88,0.15)",
              border: isBroadcasting ? "1px solid rgba(255,45,120,0.5)" : "1px solid rgba(48,209,88,0.3)",
              color: isBroadcasting ? "#ff2d78" : "#30d158",
            }}
          >
            <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? "animate-pulse" : ""}`} />
            {isBroadcasting ? "Broadcasting Live — Stop" : "Go Live (Broadcast Audio)"}
          </button>
          {/* Now Playing Input */}
          <div className="space-y-2">
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Now Playing</div>
            <div className="flex gap-1">
              <input
                value={nowPlayingInput}
                onChange={e => setNowPlayingInput(e.target.value)}
                placeholder="Track name..."
                className="flex-1 px-2 py-1.5 rounded-lg bg-white/8 border border-white/15 text-white text-[10px] placeholder:text-white/20 focus:outline-none focus:border-[#bf5af2]"
                data-testid="input-now-playing"
              />
              <button
                onClick={() => nowPlayingInput && addToSetlistMutation.mutate({ trackTitle: nowPlayingInput })}
                className="px-2 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all"
                style={{ background: "rgba(191,90,242,0.3)", border: "1px solid rgba(191,90,242,0.4)" }}
                data-testid="button-add-to-setlist"
              >
                + Log
              </button>
            </div>
          </div>
        </div>

        {/* QR + Share */}
        <div className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2">
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Crowd Join Link</div>
          {crowdUrl ? (
            <QRCodeDisplay url={crowdUrl} />
          ) : (
            <div className="w-[150px] h-[150px] flex items-center justify-center text-white/20">
              <QrCode className="w-12 h-12" />
            </div>
          )}
          <div className="text-[9px] text-[#bf5af2] font-bold break-all text-center">{eventCode}</div>
          <button
            onClick={() => navigator.clipboard.writeText(crowdUrl).then(() => toast({ title: "Link copied!" }))}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white w-full text-center transition-all"
            style={{ background: "rgba(191,90,242,0.2)", border: "1px solid rgba(191,90,242,0.3)" }}
            data-testid="button-copy-link"
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${activeTab === tab.id ? "bg-[#bf5af2] text-white" : "text-white/40 hover:text-white/60"}`}
            data-testid={`tab-crowd-${tab.id}`}
          >
            <span>{tab.emoji}</span>
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-0.5 w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center" style={{ background: "#ff453a" }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "requests" && (
        <div className="space-y-2">
          {pendingRequests.length === 0 ? (
            <div className="text-center text-white/25 text-sm py-8">No pending requests.</div>
          ) : (
            pendingRequests.map((req: SongRequest) => (
              <div
                key={req.id}
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: req.priorityPaid ? "rgba(255,214,10,0.08)" : "rgba(255,255,255,0.04)",
                  border: req.priorityPaid ? "1px solid rgba(255,214,10,0.3)" : "1px solid rgba(255,255,255,0.08)",
                }}
                data-testid={`request-row-${req.id}`}
              >
                {req.priorityPaid && <span className="text-xs shrink-0">⚡</span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{req.trackTitle}</div>
                  <div className="text-[10px] text-white/40">{req.crowdName}{req.priorityPaid ? ` · $${req.priorityAmount} priority` : ""}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => updateRequestMutation.mutate({ requestId: req.id, status: "approved" })}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(48,209,88,0.2)", border: "1px solid rgba(48,209,88,0.3)" }}
                    data-testid={`button-approve-${req.id}`}
                  >
                    <Check className="w-3.5 h-3.5 text-[#30d158]" />
                  </button>
                  <button
                    onClick={() => updateRequestMutation.mutate({ requestId: req.id, status: "rejected" })}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(255,69,58,0.2)", border: "1px solid rgba(255,69,58,0.3)" }}
                    data-testid={`button-reject-${req.id}`}
                  >
                    <X className="w-3.5 h-3.5 text-[#ff453a]" />
                  </button>
                  <button
                    onClick={() => { updateRequestMutation.mutate({ requestId: req.id, status: "approved" }); addToSetlistMutation.mutate({ trackTitle: req.trackTitle }); }}
                    className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all"
                    style={{ background: "rgba(191,90,242,0.25)", border: "1px solid rgba(191,90,242,0.3)" }}
                    data-testid={`button-add-deck-${req.id}`}
                  >
                    + Deck
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "polls" && (
        <div className="space-y-3">
          {activePoll ? (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)" }}>
              <div className="text-xs font-bold text-[#0af]">Active Poll: {activePoll.question}</div>
              {activePoll.options.map((opt: string) => {
                const total = Object.values(activePoll.votes as Record<string, number>).reduce((s: number, v: number) => s + v, 0);
                const pct = total > 0 ? ((activePoll.votes[opt] || 0) / total) * 100 : 0;
                return (
                  <div key={opt} className="space-y-1">
                    <div className="flex justify-between text-xs text-white/70">
                      <span>{opt}</span>
                      <span>{activePoll.votes[opt] || 0} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0af] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => closePollMutation.mutate(activePoll.id)}
                className="w-full py-2 rounded-xl text-[10px] font-bold text-[#ff453a] border border-[#ff453a]/30 hover:bg-[#ff453a]/10 transition-all"
                data-testid="button-close-poll"
              >
                Close Poll
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Create New Poll</div>
              <input
                value={newPollQ}
                onChange={e => setNewPollQ(e.target.value)}
                placeholder="Poll question..."
                className="w-full px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#0af]"
                data-testid="input-poll-question"
              />
              {newPollOptions.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={e => { const opts = [...newPollOptions]; opts[i] = e.target.value; setNewPollOptions(opts); }}
                  placeholder={`Option ${i + 1}...`}
                  className="w-full px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#0af]"
                  data-testid={`input-poll-option-${i}`}
                />
              ))}
              <button onClick={() => setNewPollOptions(o => [...o, ""])} className="text-[10px] text-[#0af] hover:underline" data-testid="button-add-poll-option">+ Add option</button>
              <button
                onClick={() => createPollMutation.mutate()}
                disabled={!newPollQ || newPollOptions.filter(Boolean).length < 2 || createPollMutation.isPending}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-40"
                style={{ background: "rgba(0,170,255,0.3)", border: "1px solid rgba(0,170,255,0.4)" }}
                data-testid="button-create-poll"
              >
                {createPollMutation.isPending ? "Creating..." : "Launch Poll"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "shoutouts" && (
        <div className="space-y-2">
          {stateData?.shoutouts?.length === 0 ? (
            <div className="text-center text-white/25 text-sm py-8">No shoutouts yet.</div>
          ) : (
            (stateData?.shoutouts || []).map((s: Shoutout) => (
              <div key={s.id} className={`rounded-xl p-3 space-y-2 ${!s.announced ? "border border-[#ff9500]/30" : "border border-white/8"}`} style={{ background: !s.announced ? "rgba(255,149,0,0.08)" : "rgba(255,255,255,0.03)" }} data-testid={`shoutout-row-${s.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white">{s.fromName} {s.paid && <span className="text-[9px] text-[#ffd60a]">· Paid ${s.amount}</span>}</div>
                    <p className="text-[11px] text-white/60 mt-0.5">{s.message}</p>
                  </div>
                  {!s.announced && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => readAloud(`Shoutout from ${s.fromName}: ${s.message}`)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background: "rgba(191,90,242,0.2)", border: "1px solid rgba(191,90,242,0.3)" }}
                        data-testid={`button-read-aloud-${s.id}`}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#bf5af2]" />
                      </button>
                      <button
                        onClick={() => announceShoutoutMutation.mutate(s.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background: "rgba(48,209,88,0.2)", border: "1px solid rgba(48,209,88,0.3)" }}
                        data-testid={`button-mark-announced-${s.id}`}
                      >
                        <Check className="w-3.5 h-3.5 text-[#30d158]" />
                      </button>
                    </div>
                  )}
                  {s.announced && <span className="text-[9px] text-white/25">Done</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "tips" && (
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xl font-black text-[#30d158]">${totalTips.toFixed(2)}</div>
                <div className="text-[10px] text-white/40">85% yours = ${(totalTips * 0.85).toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tipGoalInput}
                  onChange={e => setTipGoalInput(e.target.value)}
                  className="w-16 px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/15 text-white text-center focus:outline-none"
                  placeholder="Goal"
                  data-testid="input-tip-goal"
                />
                <button
                  onClick={() => {
                    const g = parseInt(tipGoalInput);
                    if (g > 0) {
                      setTipGoal(g);
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: "tip_goal_update", tipGoal: g }));
                      }
                    }
                  }}
                  className="px-2 py-1 rounded-lg text-[9px] font-bold text-white"
                  style={{ background: "rgba(48,209,88,0.3)", border: "1px solid rgba(48,209,88,0.4)" }}
                  data-testid="button-set-tip-goal"
                >Set Goal</button>
              </div>
            </div>
            {tipGoal > 0 && <TipGoalBar goal={tipGoal} total={totalTipsWs || totalTips} label="SESSION GOAL" />}
          </div>
          {sessionTips.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,214,10,0.15)" }}>
              <TipLeaderboard tips={sessionTips} />
            </div>
          )}
          {allTips.length === 0 ? (
            <div className="text-center text-white/25 text-sm py-6">No tips yet.</div>
          ) : (
            allTips.slice().reverse().map((t: Tip) => (
              <div key={t.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(48,209,88,0.05)", border: "1px solid rgba(48,209,88,0.1)" }} data-testid={`tip-row-${t.id}`}>
                <span className="text-base">💸</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white">{t.fromName}</div>
                  <div className="text-[10px] text-white/35">Your cut: ${t.djShare.toFixed(2)}</div>
                </div>
                <div className="text-sm font-black text-[#30d158]">${t.amount.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="space-y-2">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Top Contributors</div>
          {!leaderboard?.length ? (
            <div className="text-center text-white/25 text-sm py-8">No data yet.</div>
          ) : (
            leaderboard.map((entry: Leaderboard, i: number) => (
              <div key={entry.crowdName} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ background: i < 3 ? "rgba(255,214,10,0.06)" : "rgba(255,255,255,0.03)", border: i < 3 ? "1px solid rgba(255,214,10,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-base">{medals[i] || `${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{entry.crowdName}</div>
                  <div className="text-[10px] text-white/35">{entry.requests} req · ${entry.tips.toFixed(1)} tips · {entry.reactions} reactions</div>
                </div>
                <div className="text-xs font-black text-[#ffd60a]">{Math.round(entry.totalScore)} pts</div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "battle" && (
        <BattleTab eventCode={eventCode} eventId={eventId} battleVotes={battleVotes} djName={djName} />
      )}

      {activeTab === "mood" && (
        <div className="space-y-3">
          <LyricsPanel
            nowPlaying={nowPlayingInput || nowPlaying}
            isDJ
            onCrowdSing={sendCrowdSing}
            onLineChange={sendLyricsLine}
          />
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Set Crowd Mood</div>
          <div className="grid grid-cols-3 gap-2">
            {MOOD_PRESETS.map(({ color, keyword }) => (
              <button
                key={keyword}
                onClick={() => moodMutation.mutate({ moodColor: color, moodKeyword: keyword })}
                className="py-4 rounded-2xl text-sm font-black transition-all hover:scale-105 active:scale-95"
                style={{ background: `${color}25`, border: `1.5px solid ${color}50`, color }}
                data-testid={`button-mood-${keyword.toLowerCase()}`}
              >
                {keyword}
              </button>
            ))}
          </div>
          {moodMutation.isPending && (
            <div className="text-center text-xs text-white/40 flex items-center justify-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing to crowd...
            </div>
          )}
          {moodMutation.isSuccess && (
            <div className="text-center text-xs text-[#30d158]">✓ Mood synced to all crowd phones!</div>
          )}

          {/* End Event */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => { if (confirm("End the event? This will create a payout.")) endEventMutation.mutate(); }}
              disabled={endEventMutation.isPending}
              className="w-full py-3 rounded-2xl text-xs font-black text-white/70 border border-white/15 hover:bg-white/5 transition-all"
              data-testid="button-end-event"
            >
              {endEventMutation.isPending ? "Ending..." : "🛑 End Event"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
