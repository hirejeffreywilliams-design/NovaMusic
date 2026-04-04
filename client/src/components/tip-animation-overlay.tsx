import { useEffect, useState, useRef } from "react";

export interface TipEvent {
  fromName: string;
  amount: number;
  id: string;
}

type TipTier = "small" | "medium" | "large" | "mega";

function getTier(amount: number): TipTier {
  if (amount >= 10) return "mega";
  if (amount >= 5) return "large";
  if (amount >= 2) return "medium";
  return "small";
}

interface ConfettiPiece {
  id: string;
  x: number;
  color: string;
  delay: number;
  size: number;
}

interface TipAnimationOverlayProps {
  tipEvent: TipEvent | null;
  tipGoal?: number;
  totalTips?: number;
}

function useConfetti(trigger: boolean, count = 30) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const idRef = useRef(0);
  const colors = ["#ffd60a", "#ff2d78", "#30d158", "#0af", "#bf5af2", "#ff9500"];
  useEffect(() => {
    if (!trigger) return;
    const newPieces = Array.from({ length: count }, () => ({
      id: `c-${idRef.current++}`,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      size: 6 + Math.random() * 8,
    }));
    setPieces(p => [...p, ...newPieces]);
    const t = setTimeout(() => setPieces(p => p.filter(c => !newPieces.find(n => n.id === c.id))), 3000);
    return () => clearTimeout(t);
  }, [trigger, count]);
  return pieces;
}

export function TipAnimationOverlay({ tipEvent, tipGoal, totalTips = 0 }: TipAnimationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<TipEvent | null>(null);
  const [goalHit, setGoalHit] = useState(false);
  const prevGoalHit = useRef(false);

  const tier = currentTip ? getTier(currentTip.amount) : null;
  const confettiPieces = useConfetti(goalHit || tier === "mega", goalHit ? 60 : 30);

  useEffect(() => {
    if (!tipEvent) return;
    setCurrentTip(tipEvent);
    setVisible(true);
    const incomingTier = getTier(tipEvent.amount);
    const duration = incomingTier === "mega" ? 5000 : incomingTier === "large" ? 4000 : 2500;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrentTip(null), 500);
    }, duration);
    return () => clearTimeout(t);
  }, [tipEvent]);

  useEffect(() => {
    if (tipGoal && tipGoal > 0 && totalTips >= tipGoal && !prevGoalHit.current) {
      prevGoalHit.current = true;
      setGoalHit(true);
      setTimeout(() => setGoalHit(false), 5000);
    }
  }, [totalTips, tipGoal]);

  if (!visible && !goalHit && confettiPieces.length === 0) return null;

  const tierStyles: Record<TipTier, { bg: string; text: string; border: string }> = {
    small: { bg: "rgba(48,209,88,0.15)", text: "#30d158", border: "rgba(48,209,88,0.4)" },
    medium: { bg: "rgba(255,214,10,0.2)", text: "#ffd60a", border: "rgba(255,214,10,0.5)" },
    large: { bg: "rgba(255,149,0,0.25)", text: "#ff9500", border: "rgba(255,149,0,0.6)" },
    mega: { bg: "rgba(255,45,120,0.3)", text: "#ff2d78", border: "rgba(255,45,120,0.7)" },
  };

  const TIER_EMOJIS: Record<TipTier, string[]> = {
    small: ["💚"],
    medium: ["💛", "⭐"],
    large: ["🔥", "💰", "🌟"],
    mega: ["🎉", "💎", "🚀", "👑", "💸"],
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {confettiPieces.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `confetti-fall 2.5s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}

      {goalHit && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "pulse-fade 5s ease-out forwards" }}>
          <div className="text-center" style={{ animation: "scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
            <div className="text-6xl mb-2">🎯</div>
            <div className="text-3xl font-black text-[#ffd60a]" style={{ textShadow: "0 0 40px #ffd60a" }}>GOAL REACHED!</div>
            <div className="text-lg font-black text-white mt-1">Thank you everyone! 🙏</div>
          </div>
        </div>
      )}

      {visible && currentTip && tier && (
        <div
          className="absolute"
          style={{
            bottom: tier === "mega" || tier === "large" ? "30%" : "20%",
            left: "50%",
            transform: "translateX(-50%)",
            animation: `slide-up-fade ${tier === "mega" ? 5 : tier === "large" ? 4 : 2.5}s ease-out forwards`,
            zIndex: 201,
          }}
        >
          <div
            className="px-6 py-4 rounded-2xl text-center whitespace-nowrap"
            style={{
              background: tierStyles[tier].bg,
              border: `2px solid ${tierStyles[tier].border}`,
              backdropFilter: "blur(20px)",
              boxShadow: `0 0 40px ${tierStyles[tier].border}`,
            }}
          >
            {tier === "mega" && (
              <div className="text-3xl mb-1 flex gap-1 justify-center">
                {["🎉", "💎", "👑"].map((e, i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.15}s`, animation: "bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>{e}</span>
                ))}
              </div>
            )}
            {(tier === "large" || tier === "medium") && (
              <div className="text-2xl mb-1">
                {TIER_EMOJIS[tier].join(" ")}
              </div>
            )}
            <div className="font-black" style={{ fontSize: tier === "mega" ? "22px" : tier === "large" ? "18px" : "14px", color: tierStyles[tier].text }}>
              {currentTip.fromName}
            </div>
            <div className="font-black text-white" style={{ fontSize: tier === "mega" ? "36px" : tier === "large" ? "28px" : "20px" }}>
              ${currentTip.amount} TIP!
            </div>
            {tier === "small" && <div className="text-[10px] text-white/50 mt-1">💚 Thanks for the love!</div>}
            {tier === "medium" && <div className="text-xs text-white/60 mt-1">⭐ You're amazing!</div>}
            {tier === "large" && <div className="text-sm text-white/70 mt-1 font-bold">🔥 BIG SUPPORTER!</div>}
            {tier === "mega" && <div className="text-base text-white font-black mt-1">👑 MEGA TIP! YOU LEGEND!</div>}
          </div>
        </div>
      )}

      {visible && currentTip && tier === "small" && (
        <div className="absolute" style={{ bottom: "20%", left: `${30 + Math.random() * 40}%`, animation: "float-up 2.5s ease-out forwards" }}>
          <span className="text-2xl">💚</span>
        </div>
      )}
    </div>
  );
}

interface TipGoalBarProps {
  goal: number;
  total: number;
  label?: string;
}

export function TipGoalBar({ goal, total, label = "TIP GOAL" }: TipGoalBarProps) {
  const pct = Math.min(100, goal > 0 ? (total / goal) * 100 : 0);
  const hit = pct >= 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40 font-bold">{label}</span>
        <span style={{ color: hit ? "#30d158" : "#ffd60a" }} className="font-black">${total.toFixed(0)} / ${goal}</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: hit
              ? "linear-gradient(to right, #30d158, #ffd60a)"
              : "linear-gradient(to right, #ffd60a80, #ffd60a)",
            boxShadow: hit ? "0 0 12px #30d15880" : "0 0 8px #ffd60a40",
          }}
        />
      </div>
      {hit && (
        <div className="text-center text-[10px] font-black text-[#30d158] animate-pulse">🎯 GOAL REACHED! 🎉</div>
      )}
    </div>
  );
}

interface TipLeaderboardProps {
  tips: { fromName: string; amount: number; createdAt: number }[];
  compact?: boolean;
}

export function TipLeaderboard({ tips, compact = false }: TipLeaderboardProps) {
  const byPerson = tips.reduce((acc, t) => {
    acc[t.fromName] = (acc[t.fromName] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  const sorted = Object.entries(byPerson).sort(([, a], [, b]) => b - a).slice(0, compact ? 3 : 5);
  if (sorted.length === 0) return null;
  const medals = ["👑", "🥈", "🥉", "4️⃣", "5️⃣"];
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-black text-[#ffd60a] uppercase tracking-wider">💸 Top Tippers</div>
      {sorted.map(([name, total], i) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <span className="text-sm">{medals[i]}</span>
          <span className="flex-1 text-white/80 font-semibold truncate">{name}</span>
          <span className="font-black text-[#30d158]">${total.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
