import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Lightbulb, Music, Mic2, Zap, Headphones, Volume2 } from "lucide-react";

const TIPS = [
  {
    icon: "🎵",
    title: "Load Your Music",
    desc: "Tap the Load button on a deck and pick a song from your phone. Any MP3, WAV or audio file works!",
    color: "#bf5af2",
  },
  {
    icon: "▶️",
    title: "Hit Play!",
    desc: "Press the big play button to start the music. Both decks can play at the same time!",
    color: "#0af",
  },
  {
    icon: "🎛️",
    title: "Use the Crossfader",
    desc: "The slider in the middle blends between Deck A and Deck B. Slide left for A, slide right for B. Smooth transitions made easy!",
    color: "#ff2d78",
  },
  {
    icon: "⚡",
    title: "Hit the FX Pads!",
    desc: "Those colorful buttons are sound effects — Air Horn, Bass Drop, Siren and more. Tap them anytime to hype the crowd!",
    color: "#ffd60a",
  },
  {
    icon: "🎙️",
    title: "Speak Over the Music",
    desc: "Tap the MIC button to talk through your phone's microphone while the music plays. Hype your friends up!",
    color: "#30d158",
  },
  {
    icon: "🎉",
    title: "You're Ready to Party!",
    desc: "That's it! Load songs, hit play, and have fun. There are no wrong answers — just vibe and enjoy the music!",
    color: "#ff9500",
  },
];

interface BeginnerTipsProps {
  onClose: () => void;
}

export function BeginnerTips({ onClose }: BeginnerTipsProps) {
  const [step, setStep] = useState(0);
  const tip = TIPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm animate-slide-in-up">
        <div className="glass-panel rounded-3xl p-6 space-y-5" style={{ borderColor: `${tip.color}30` }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Step {step + 1} of {TIPS.length}
            </span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors" data-testid="button-tips-close">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: `${tip.color}20`, border: `2px solid ${tip.color}40`, boxShadow: `0 0 30px ${tip.color}20` }}
            >
              {tip.icon}
            </div>
            <h3 className="text-xl font-black text-white">{tip.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{tip.desc}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-all"
              data-testid="button-tips-prev"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>

            <div className="flex-1 flex gap-1.5 justify-center">
              {TIPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? "24px" : "6px",
                    background: i === step ? tip.color : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </div>

            {step < TIPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
                style={{ background: tip.color, boxShadow: `0 0 15px ${tip.color}50` }}
                data-testid="button-tips-next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${tip.color}, #bf5af2)`, boxShadow: `0 0 20px ${tip.color}40` }}
                data-testid="button-tips-done"
              >
                Let's Go! 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TipBubble({ text }: { text: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="flex items-start gap-2 bg-[#ffd60a]/10 border border-[#ffd60a]/25 rounded-xl px-3 py-2">
      <Lightbulb className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
      <p className="text-[10px] text-white/60 leading-relaxed">{text}</p>
      <button onClick={() => setVisible(false)} className="ml-auto shrink-0">
        <X className="w-3 h-3 text-white/20 hover:text-white/40" />
      </button>
    </div>
  );
}
