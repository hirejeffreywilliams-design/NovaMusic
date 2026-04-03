import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Event, SongRequest, Poll, Shoutout, Leaderboard } from "@shared/schema";

const EMOJI_REACTIONS = ["🔥", "🌊", "❤️", "🚀"];

function EnergyMeter({ rpm }: { rpm: number }) {
  const max = 20;
  const pct = Math.min(100, (rpm / max) * 100);
  const color = pct > 70 ? "#30d158" : pct > 40 ? "#ffd60a" : pct > 15 ? "#ff9500" : "#ff453a";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-white/40">
        <span>CROWD ENERGY</span>
        <span style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}

function LeaderboardPanel({ eventCode }: { eventCode: string }) {
  const { data } = useQuery<Leaderboard[]>({
    queryKey: ["/api/events", eventCode, "leaderboard"],
    queryFn: () => fetch(`/api/events/${eventCode}/leaderboard`).then(r => r.json()),
    refetchInterval: 15000,
  });

  if (!data?.length) return null;
  const medals = ["👑", "🥈", "🥉"];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-2">
      <div className="text-[10px] font-black uppercase tracking-wider text-[#ffd60a]">🏆 Leaderboard of Legends</div>
      {data.slice(0, 3).map((entry, i) => (
        <div key={entry.crowdName} className="flex items-center gap-2 text-xs">
          <span className="text-base">{medals[i] || `${i + 1}`}</span>
          <span className="flex-1 text-white/80 font-semibold truncate">{entry.crowdName}</span>
          <span className="text-white/40">{Math.round(entry.totalScore)} pts</span>
        </div>
      ))}
    </div>
  );
}

export default function CrowdPage() {
  const { eventCode } = useParams<{ eventCode: string }>();
  const qc = useQueryClient();
  const [crowdName, setCrowdName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [requestTitle, setRequestTitle] = useState("");
  const [shoutoutMsg, setShoutoutMsg] = useState("");
  const [tipAmount, setTipAmount] = useState(2);
  const [recentEmojis, setRecentEmojis] = useState<{ emoji: string; id: number; x: number }[]>([]);
  const [reactions, setReactions] = useState<{ emoji: string; ts: number }[]>([]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [moodColor, setMoodColor] = useState<string | null>(null);
  const [moodKeyword, setMoodKeyword] = useState<string | null>(null);
  const [moodPulse, setMoodPulse] = useState(false);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [voted, setVoted] = useState(false);
  const [tipDone, setTipDone] = useState(false);
  const [shoutoutDone, setShoutoutDone] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [battleVotes, setBattleVotes] = useState<{ A: number; B: number }>({ A: 0, B: 0 });
  const [battleVoted, setBattleVoted] = useState(false);
  const emojiIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: eventData } = useQuery<Event>({
    queryKey: ["/api/events", eventCode],
    queryFn: () => fetch(`/api/events/${eventCode}`).then(r => r.json()),
    enabled: !!eventCode,
    refetchInterval: 30000,
  });

  // Calculate reactions per minute for energy meter
  const rpm = reactions.filter(r => Date.now() - r.ts < 60000).length;

  // WebSocket connection
  useEffect(() => {
    if (!eventData?.id) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?eventId=${eventData.id}&type=crowd&name=${encodeURIComponent(crowdName)}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "now_playing") setNowPlaying(msg.trackTitle);
        if (msg.type === "event_updated") {
          if (msg.event.moodColor) setMoodColor(msg.event.moodColor);
          if (msg.event.moodKeyword) setMoodKeyword(msg.event.moodKeyword);
          if (msg.event.nowPlaying) setNowPlaying(msg.event.nowPlaying);
        }
        if (msg.type === "mood_update") {
          setMoodColor(msg.moodColor);
          setMoodKeyword(msg.moodKeyword);
          setMoodPulse(true);
          setTimeout(() => setMoodPulse(false), 2000);
        }
        if (msg.type === "new_poll") { setActivePoll(msg.poll); setVoted(false); }
        if (msg.type === "poll_vote") setActivePoll(msg.poll);
        if (msg.type === "poll_closed") setActivePoll(prev => prev?.id === msg.poll.id ? { ...msg.poll, active: false } : prev);
        if (msg.type === "reaction") setReactions(prev => [...prev.slice(-99), { emoji: msg.reaction.emoji, ts: msg.reaction.createdAt }]);
        if (msg.type === "battle_vote") setBattleVotes(msg.voteCount);
        if (msg.type === "tip_received") {
          // Show a brief tip notification in the crowd feed
          setReactions(prev => [...prev.slice(-99), { emoji: "💸", ts: Date.now() }]);
        }
      } catch (_) {}
    };

    ws.onclose = () => { wsRef.current = null; };

    return () => { ws.close(); };
  }, [eventData?.id, crowdName]);

  // Initialize mood/nowPlaying from event
  useEffect(() => {
    if (eventData) {
      if (eventData.moodColor) setMoodColor(eventData.moodColor);
      if (eventData.moodKeyword) setMoodKeyword(eventData.moodKeyword);
      if (eventData.nowPlaying) setNowPlaying(eventData.nowPlaying);
    }
  }, [eventData]);

  const reactMutation = useMutation({
    mutationFn: (emoji: string) => apiRequest("POST", `/api/events/${eventCode}/reactions`, { crowdName, emoji }),
    onSuccess: (_data, emoji) => {
      const id = emojiIdRef.current++;
      const x = 20 + Math.random() * 60;
      setRecentEmojis(prev => [...prev, { emoji, id, x }]);
      setTimeout(() => setRecentEmojis(prev => prev.filter(e => e.id !== id)), 2000);
    },
  });

  const requestMutation = useMutation({
    mutationFn: (data: { trackTitle: string; priorityPaid: boolean; priorityAmount: number }) =>
      apiRequest("POST", `/api/events/${eventCode}/requests`, { crowdName, ...data }),
    onSuccess: () => { setRequestTitle(""); setRequestDone(true); setTimeout(() => setRequestDone(false), 3000); },
  });

  const tipMutation = useMutation({
    mutationFn: (amount: number) => apiRequest("POST", `/api/events/${eventCode}/tips`, { fromName: crowdName, amount }),
    onSuccess: () => { setTipDone(true); setTimeout(() => setTipDone(false), 3000); },
  });

  const shoutoutMutation = useMutation({
    mutationFn: (data: { message: string; paid: boolean; amount: number }) =>
      apiRequest("POST", `/api/events/${eventCode}/shoutouts`, { fromName: crowdName, ...data }),
    onSuccess: () => { setShoutoutMsg(""); setShoutoutDone(true); setTimeout(() => setShoutoutDone(false), 3000); },
  });

  const votePollMutation = useMutation({
    mutationFn: ({ pollId, option }: { pollId: string; option: string }) =>
      apiRequest("POST", `/api/events/${eventCode}/polls/${pollId}/vote`, { crowdName, option }).then(r => r.json()),
    onSuccess: (data: Poll) => { setActivePoll(data); setVoted(true); },
  });

  const battleVoteMutation = useMutation({
    mutationFn: (deck: "A" | "B") => apiRequest("POST", `/api/events/${eventCode}/battle-vote`, { crowdName, deck }).then(r => r.json()),
    onSuccess: (data: any) => { setBattleVotes(data.voteCount); setBattleVoted(true); },
  });

  if (!nameEntered) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
      >
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h1 className="text-2xl font-black text-white">Join the Party!</h1>
            {eventData && <p className="text-white/50 text-sm">{eventData.name}</p>}
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your display name..."
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) { setCrowdName(nameInput.trim()); setNameEntered(true); } }}
              className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-[#bf5af2]"
              data-testid="input-crowd-name"
              autoFocus
            />
            <button
              onClick={() => { if (nameInput.trim()) { setCrowdName(nameInput.trim()); setNameEntered(true); } }}
              disabled={!nameInput.trim()}
              className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78)", boxShadow: "0 0 30px rgba(191,90,242,0.4)" }}
              data-testid="button-enter-party"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0519" }}>
        <div className="text-center text-white/50 text-sm">Loading event...</div>
      </div>
    );
  }

  if (eventData.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0a0519" }}>
        <div className="text-center space-y-3">
          <div className="text-4xl">🎵</div>
          <h2 className="text-xl font-black text-white">Event Ended</h2>
          <p className="text-white/50 text-sm">Thanks for being part of {eventData.name}!</p>
          <a href={`/setlist/${eventCode}`} className="block px-6 py-3 rounded-2xl text-sm font-bold text-white mt-4" style={{ background: "rgba(191,90,242,0.3)", border: "1px solid rgba(191,90,242,0.4)" }}>
            View Setlist 🎶
          </a>
        </div>
      </div>
    );
  }

  const totalPollVotes = activePoll ? Object.values(activePoll.votes).reduce((s, v) => s + v, 0) : 0;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: moodColor && moodPulse ? moodColor + "30" : "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)", transition: "background 1s ease" }}
    >
      {/* Floating emoji reactions */}
      {recentEmojis.map(e => (
        <div
          key={e.id}
          className="fixed pointer-events-none z-50 text-3xl"
          style={{
            left: `${e.x}%`,
            bottom: "20%",
            animation: "float-up 2s ease-out forwards",
          }}
        >
          {e.emoji}
        </div>
      ))}

      {/* Mood Board overlay */}
      {moodColor && moodKeyword && moodPulse && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ background: moodColor + "20" }}
        >
          <div className="text-center" style={{ animation: "pulse-fade 2s ease-out forwards" }}>
            <div className="text-6xl font-black" style={{ color: moodColor, textShadow: `0 0 40px ${moodColor}` }}>
              {moodKeyword}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-sm mx-auto p-4 pb-8 space-y-4">
        {/* Header */}
        <div className="text-center py-2">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-1">{crowdName} @ {eventData.name}</div>
          {nowPlaying && (
            <div className="flex items-center justify-center gap-2 text-sm text-white/70">
              <span className="text-base">🎵</span>
              <span className="font-semibold truncate max-w-[200px]" data-testid="text-now-playing">{nowPlaying}</span>
            </div>
          )}
          {moodColor && moodKeyword && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: moodColor + "30", color: moodColor, border: `1px solid ${moodColor}40` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: moodColor }} />
              {moodKeyword}
            </div>
          )}
        </div>

        {/* Energy Meter */}
        <div className="glass-card rounded-2xl p-4">
          <EnergyMeter rpm={rpm} />
        </div>

        {/* Emoji Reactions */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/40">React Now!</div>
          <div className="grid grid-cols-4 gap-2">
            {EMOJI_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => reactMutation.mutate(emoji)}
                className="flex flex-col items-center justify-center py-4 rounded-2xl text-3xl transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                data-testid={`button-react-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Paid Actions Disclaimer */}
        <div
          className="rounded-xl px-3 py-2.5 text-[10px] text-white/50 leading-relaxed"
          style={{ background: "rgba(255,214,10,0.06)", border: "1px solid rgba(255,214,10,0.12)" }}
          data-testid="notice-paid-actions"
        >
          ℹ️ Priority requests, shoutouts, and tips are <strong className="text-white/70">non-refundable</strong>. Your display name is visible to the DJ and other participants.
        </div>

        {/* Song Request */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#bf5af2]">🎵 Request a Song</div>
          <input
            type="text"
            placeholder="Song title or artist..."
            value={requestTitle}
            onChange={e => setRequestTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#bf5af2]"
            data-testid="input-song-request"
          />
          <div className="flex gap-2">
            <button
              onClick={() => requestMutation.mutate({ trackTitle: requestTitle, priorityPaid: false, priorityAmount: 0 })}
              disabled={!requestTitle.trim() || requestMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: "rgba(191,90,242,0.3)", border: "1px solid rgba(191,90,242,0.4)" }}
              data-testid="button-submit-request"
            >
              {requestDone ? "✓ Sent!" : "Submit"}
            </button>
            <button
              onClick={() => requestMutation.mutate({ trackTitle: requestTitle, priorityPaid: true, priorityAmount: 2.99 })}
              disabled={!requestTitle.trim() || requestMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #ffd60a40, #ff950040)", border: "1px solid rgba(255,214,10,0.4)" }}
              data-testid="button-priority-request"
            >
              ⚡ Priority $2.99
            </button>
          </div>
        </div>

        {/* Active Poll */}
        {activePoll && activePoll.active && (
          <div className="glass-card rounded-2xl p-4 space-y-3" data-testid="poll-panel">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#0af]">📊 DJ Poll</div>
            <p className="text-sm font-semibold text-white">{activePoll.question}</p>
            <div className="space-y-2">
              {activePoll.options.map(option => {
                const votes = activePoll.votes[option] || 0;
                const pct = totalPollVotes > 0 ? (votes / totalPollVotes) * 100 : 0;
                return (
                  <button
                    key={option}
                    onClick={() => !voted && votePollMutation.mutate({ pollId: activePoll.id, option })}
                    disabled={voted}
                    className="relative w-full px-3 py-2.5 rounded-xl text-sm text-left font-medium text-white overflow-hidden transition-all disabled:cursor-default"
                    style={{ background: "rgba(0,170,255,0.1)", border: voted ? "1px solid rgba(0,170,255,0.4)" : "1px solid rgba(0,170,255,0.2)" }}
                    data-testid={`button-poll-option-${option}`}
                  >
                    {voted && <div className="absolute inset-0 rounded-xl" style={{ width: `${pct}%`, background: "rgba(0,170,255,0.2)", transition: "width 0.5s ease" }} />}
                    <span className="relative z-10">{option}</span>
                    {voted && <span className="relative z-10 float-right text-[#0af] text-xs">{Math.round(pct)}%</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#30d158]">💸 Tip the DJ</div>
          <div className="flex gap-2">
            {[1, 2, 5, 10].map(amt => (
              <button
                key={amt}
                onClick={() => setTipAmount(amt)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: tipAmount === amt ? "rgba(48,209,88,0.3)" : "rgba(255,255,255,0.06)",
                  border: tipAmount === amt ? "1.5px solid rgba(48,209,88,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  color: tipAmount === amt ? "#30d158" : "rgba(255,255,255,0.5)",
                }}
                data-testid={`button-tip-amount-${amt}`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <button
            onClick={() => tipMutation.mutate(tipAmount)}
            disabled={tipMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-all"
            style={{ background: tipDone ? "rgba(48,209,88,0.5)" : "linear-gradient(135deg, #30d15840, #30d15820)", border: "1.5px solid rgba(48,209,88,0.4)" }}
            data-testid="button-send-tip"
          >
            {tipDone ? <span data-testid="text-tip-done">✓ Tip Sent! Thanks!</span> : `Send $${tipAmount} Tip 💚`}
          </button>
        </div>

        {/* Shoutout */}
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#ff9500]">📣 Shoutout</div>
          <textarea
            placeholder="Your shoutout message..."
            value={shoutoutMsg}
            onChange={e => setShoutoutMsg(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#ff9500] resize-none"
            data-testid="input-shoutout"
          />
          <div className="flex gap-2">
            <button
              onClick={() => shoutoutMutation.mutate({ message: shoutoutMsg, paid: false, amount: 0 })}
              disabled={!shoutoutMsg.trim() || shoutoutMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: "rgba(255,149,0,0.2)", border: "1px solid rgba(255,149,0,0.35)" }}
              data-testid="button-submit-shoutout"
            >
              {shoutoutDone ? "✓ Sent!" : "Free Shoutout"}
            </button>
            <button
              onClick={() => shoutoutMutation.mutate({ message: shoutoutMsg, paid: true, amount: 3.99 })}
              disabled={!shoutoutMsg.trim() || shoutoutMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #ff950040, #ff2d7840)", border: "1px solid rgba(255,45,120,0.4)" }}
              data-testid="button-paid-shoutout"
            >
              🔊 Paid $3.99
            </button>
          </div>
        </div>

        {/* Battle Mode */}
        {eventData.battleMode && (
          <div className="glass-card rounded-2xl p-4 space-y-3" data-testid="battle-panel">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#ff2d78]">⚔️ DJ Battle — Who's Hotter?</div>
            <div className="flex gap-3">
              <div className="flex-1 text-center text-xs text-white/50">{eventData.deckADjName || "Deck A DJ"}</div>
              <div className="text-white/30 text-xs">vs</div>
              <div className="flex-1 text-center text-xs text-white/50">{eventData.deckBDjName || "Deck B DJ"}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => battleVoteMutation.mutate("A")}
                disabled={battleVoted}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: "rgba(255,45,120,0.3)", border: "1.5px solid rgba(255,45,120,0.5)" }}
                data-testid="button-battle-vote-a"
              >
                🔥 {eventData.deckADjName || "Deck A"} ({battleVotes.A})
              </button>
              <button
                onClick={() => battleVoteMutation.mutate("B")}
                disabled={battleVoted}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-all"
                style={{ background: "rgba(0,170,255,0.3)", border: "1.5px solid rgba(0,170,255,0.5)" }}
                data-testid="button-battle-vote-b"
              >
                🔥 {eventData.deckBDjName || "Deck B"} ({battleVotes.B})
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <LeaderboardPanel eventCode={eventCode!} />
      </div>
    </div>
  );
}
