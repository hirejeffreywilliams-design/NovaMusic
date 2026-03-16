import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Music, Headphones, PartyPopper, Disc3, Mic2, Radio, Zap, Volume2, Sparkles } from "lucide-react";

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

export default function Landing() {
  const [, navigate] = useLocation();
  const [loaded, setLoaded] = useState(false);

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

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-[#ffd60a]" />
              <span className="text-sm uppercase tracking-[0.3em] text-[#ffd60a] font-semibold" data-testid="text-tagline">
                The Future of Party DJing
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

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed" data-testid="text-description">
              Professional-grade DJ mixing meets party-ready simplicity.
              Four decks, infinite possibilities. Let everyone at the party feel like a DJ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => navigate("/console")}
                className="group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
                data-testid="button-launch-console"
              >
                <div className="relative rounded-2xl bg-[#0a0519]/90 p-8 flex flex-col items-center gap-4 group-hover:bg-[#0a0519]/70 transition-colors">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, rgba(191,90,242,0.1), transparent 70%)" }} />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center neon-glow-purple relative z-10" style={{ background: "linear-gradient(135deg, #bf5af2, #8b5cf6)" }}>
                    <Headphones className="w-8 h-8 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1">DJ Console</h3>
                    <p className="text-sm text-white/50">Full pro mixing experience</p>
                  </div>
                  <div className="flex gap-2 mt-2 relative z-10">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30">4 Decks</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#0af]/20 text-[#0af] border border-[#0af]/30">FX Rack</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#ff2d78]/20 text-[#ff2d78] border border-[#ff2d78]/30">Soundboard</span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate("/party")}
                className="group relative overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)" }}
                data-testid="button-launch-party"
              >
                <div className="relative rounded-2xl bg-[#0a0519]/90 p-8 flex flex-col items-center gap-4 group-hover:bg-[#0a0519]/70 transition-colors">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,45,120,0.1), transparent 70%)" }} />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center neon-glow-pink relative z-10" style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)" }}>
                    <PartyPopper className="w-8 h-8 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1">Party Mode</h3>
                    <p className="text-sm text-white/50">Everyone gets to DJ</p>
                  </div>
                  <div className="flex gap-2 mt-2 relative z-10">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#ff2d78]/20 text-[#ff2d78] border border-[#ff2d78]/30">Easy Mix</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#ff9500]/20 text-[#ff9500] border border-[#ff9500]/30">Sound FX</span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30">Mobile Ready</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto transition-all duration-1000 delay-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            {[
              { icon: Music, label: "4-Deck Mixing", color: "#bf5af2" },
              { icon: Zap, label: "Real-time FX", color: "#0af" },
              { icon: Volume2, label: "Soundboard", color: "#ff2d78" },
              { icon: Radio, label: "Live Visualizer", color: "#30d158" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center" data-testid={`feature-${label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <span className="text-xs text-white/50 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </main>

        <footer className="text-center py-6 text-white/20 text-xs tracking-wider">
          DJ HYBRID &middot; PROPRIETARY
        </footer>
      </div>
    </div>
  );
}
