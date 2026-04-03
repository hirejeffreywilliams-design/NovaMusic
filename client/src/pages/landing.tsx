import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Music, Headphones, PartyPopper, Disc3, Mic2, Radio, Zap, Volume2, Sparkles, ChevronDown, Bot } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number; life: number }[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1.5 - 0.5,
        size: Math.random() * 3 + 1,
        hue: Math.random() * 360,
        life: Math.random(),
      });
    }

    let animId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(10, 5, 25, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.002;
        p.hue += 0.5;

        if (p.y < 0 || p.life <= 0) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.life = 1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue % 360}, 100%, 70%, ${p.life * 0.6})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue % 360}, 100%, 70%, ${p.life * 0.1})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

function EQBars() {
  return (
    <div className="flex items-end gap-1 h-8" data-testid="eq-bars-animation">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            height: "100%",
            background: `linear-gradient(to top, #bf5af2, #0af)`,
            animation: `eq-bounce ${0.4 + i * 0.1}s ease-in-out infinite`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    step: "1",
    emoji: "🎵",
    title: "Load Your Songs",
    desc: "Tap Load on either deck and pick any song from your phone. No special files needed — MP3, WAV, anything works!",
    color: "#bf5af2",
  },
  {
    step: "2",
    emoji: "▶️",
    title: "Hit Play & Vibe",
    desc: "Press Play and let the music flow. The spinning turntable means it's playing. Load a second song on Deck B for even more fun!",
    color: "#0af",
  },
  {
    step: "3",
    emoji: "🎛️",
    title: "Blend Between Songs",
    desc: "Drag the crossfader slider to smoothly blend from one song to another. Left = Deck A, Right = Deck B. Easy!",
    color: "#ff2d78",
  },
  {
    step: "4",
    emoji: "⚡",
    title: "Drop the Sound FX",
    desc: "Hit the colorful buttons — Air Horn, Bass Drop, Siren and more! Great for hyping up the crowd at the right moment.",
    color: "#ffd60a",
  },
  {
    step: "5",
    emoji: "🎙️",
    title: "Speak Over the Music",
    desc: "Turn on the Mic to talk through your phone while music plays. Hype everyone up or make shoutouts like a real DJ!",
    color: "#30d158",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [loaded, setLoaded] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0519] relative overflow-hidden">
      <ParticleField />

      <div className="fixed inset-0 z-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(191, 90, 242, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(0, 170, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(255, 45, 120, 0.1) 0%, transparent 40%)"
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <nav className="flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Disc3 className="w-10 h-10 text-[#bf5af2] animate-vinyl-spin" />
              <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 15px rgba(191,90,242,0.5)" }} />
            </div>
            <span className="text-2xl font-black tracking-tight neon-text-purple" data-testid="text-brand-name">
              DJ HYBRID
            </span>
          </div>
          <EQBars />
        </nav>

        <main className="flex-1 flex flex-col items-center px-6 pb-20">
          <div className={`text-center max-w-4xl mx-auto pt-8 pb-12 transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-[#ffd60a]" />
              <span className="text-sm uppercase tracking-[0.3em] text-[#ffd60a] font-semibold" data-testid="text-tagline">
                For Parties, Family Events & Good Times
              </span>
              <Sparkles className="w-6 h-6 text-[#ffd60a]" />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="bg-clip-text text-transparent animate-gradient-shift" style={{ backgroundImage: "linear-gradient(135deg, #bf5af2, #0af, #ff2d78, #bf5af2)", backgroundSize: "300% 300%" }}>
                DROP THE BEAT
              </span>
              <br />
              <span className="text-white/90">ANYWHERE</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-4 leading-relaxed" data-testid="text-description">
              No DJ experience? No problem! DJ Hybrid lets <strong className="text-white/80">anyone</strong> mix music, drop sound effects, and speak over the music at parties and events — right from your phone.
            </p>

            <div className="flex items-center justify-center gap-2 mb-10">
              {["🎉 No experience needed", "📱 Works on any phone", "🎙️ Built-in microphone"].map((tag) => (
                <span key={tag} className="text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-4 max-w-2xl mx-auto mb-10 w-full">
              <button
                onClick={() => navigate("/ai-dj")}
                className="group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #bf5af2, #0af, #ff2d78)" }}
                data-testid="button-launch-ai-dj"
              >
                <div className="relative rounded-2xl bg-[#0a0519]/85 p-6 flex items-center gap-5 group-hover:bg-[#0a0519]/70 transition-colors">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, rgba(191,90,242,0.08), transparent 70%)" }} />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative z-10" style={{ background: "linear-gradient(135deg, #bf5af2, #0af)", boxShadow: "0 0 25px rgba(191,90,242,0.5)" }}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1 text-left relative z-10">
                    <div className="text-[10px] uppercase tracking-widest text-[#ffd60a] mb-1 font-bold flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />NEW — Recommended
                    </div>
                    <h3 className="text-xl font-black text-white mb-1">🤖 AI DJ Mode</h3>
                    <p className="text-sm text-white/50">Upload your library — AI does everything for you</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30">Auto Mix</span>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">Trending Detection</span>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0af]/20 text-[#0af] border border-[#0af]/30">Fire Zone</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/30 -rotate-90 relative z-10 shrink-0" />
                </div>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate("/party")}
                  className="group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)" }}
                  data-testid="button-launch-party"
                >
                  <div className="relative rounded-2xl bg-[#0a0519]/90 p-6 flex flex-col items-center gap-3 group-hover:bg-[#0a0519]/70 transition-colors">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,45,120,0.1), transparent 70%)" }} />
                    <div className="w-12 h-12 rounded-full flex items-center justify-center neon-glow-pink relative z-10" style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)" }}>
                      <PartyPopper className="w-6 h-6 text-white" />
                    </div>
                    <div className="relative z-10 text-center">
                      <h3 className="text-base font-bold text-white mb-1">🎉 Party Mode</h3>
                      <p className="text-xs text-white/50">Simple & fun for everyone</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1 relative z-10 justify-center">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff2d78]/20 text-[#ff2d78] border border-[#ff2d78]/30">Easy Mix</span>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff9500]/20 text-[#ff9500] border border-[#ff9500]/30">Sound FX</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/console")}
                  className="group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
                  data-testid="button-launch-console"
                >
                  <div className="relative rounded-2xl bg-[#0a0519]/90 p-6 flex flex-col items-center gap-3 group-hover:bg-[#0a0519]/70 transition-colors">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, rgba(191,90,242,0.1), transparent 70%)" }} />
                    <div className="w-12 h-12 rounded-full flex items-center justify-center neon-glow-purple relative z-10" style={{ background: "linear-gradient(135deg, #bf5af2, #8b5cf6)" }}>
                      <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <div className="relative z-10 text-center">
                      <div className="text-[9px] uppercase tracking-widest text-[#bf5af2]/60 mb-0.5 font-semibold">Advanced</div>
                      <h3 className="text-base font-bold text-white mb-1">🎧 DJ Console</h3>
                      <p className="text-xs text-white/50">Full pro mixing experience</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1 relative z-10 justify-center">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30">4 Decks</span>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0af]/20 text-[#0af] border border-[#0af]/30">FX Rack</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowHow(!showHow)}
              className="flex items-center gap-2 mx-auto text-sm text-white/40 hover:text-white/60 transition-colors"
              data-testid="button-how-it-works"
            >
              <span>How does it work?</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showHow ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showHow && (
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-16 animate-slide-in-up">
              <h2 className="text-center text-lg font-black text-white/80 mb-6">
                🎓 How to DJ in 5 Easy Steps
              </h2>
              {HOW_IT_WORKS.map(({ step, emoji, title, desc, color }) => (
                <div
                  key={step}
                  className="glass-panel rounded-2xl p-4 flex items-start gap-4"
                  style={{ borderColor: `${color}20` }}
                >
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg font-black text-white"
                    style={{ background: `${color}25`, border: `1.5px solid ${color}40` }}
                  >
                    {emoji}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1">
                      <span className="text-white/30 mr-2">Step {step}</span>
                      {title}
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <button
                  onClick={() => navigate("/party")}
                  className="px-8 py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(135deg, #ff2d78, #ff9500)",
                    boxShadow: "0 0 30px rgba(255,45,120,0.3), 0 0 60px rgba(255,149,0,0.15)",
                  }}
                  data-testid="button-start-party-bottom"
                >
                  🎉 Start the Party Now!
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className="text-center py-4 text-white/20 text-xs tracking-wider space-y-2">
          <div>DJ HYBRID &middot; Made for everyone at the party 🎉</div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/pricing" className="text-white/30 hover:text-white/50 transition-colors" data-testid="link-pricing">⭐ Pricing</a>
            <span className="text-white/10">·</span>
            <a href="/admin" className="text-white/30 hover:text-white/50 transition-colors" data-testid="link-admin">🔐 Admin</a>
            <span className="text-white/10">·</span>
            <button onClick={() => navigate("/compliance")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="footer-link-compliance">
              Compliance Center
            </button>
            <span className="text-white/10">·</span>
            <button onClick={() => navigate("/terms")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="footer-link-terms">
              Terms of Service
            </button>
            <span className="text-white/10">·</span>
            <button onClick={() => navigate("/marketplace")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="footer-link-marketplace">
              Music Marketplace
            </button>
            <span className="text-white/10">·</span>
            <button onClick={() => navigate("/signup")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="footer-link-signup">
              Create Account
            </button>
            <span className="text-white/10">·</span>
            <button onClick={() => navigate("/event-history")} className="text-white/30 hover:text-white/60 transition-colors" data-testid="footer-link-event-history">
              Event Play Logs
            </button>
          </div>
        </footer>
      </div>
      <AppFooter />
    </div>
  );
}
