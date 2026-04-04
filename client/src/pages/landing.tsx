import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Headphones, PartyPopper, Zap, Sparkles, ChevronDown, Bot, Globe, Music2, Radio, Disc3 } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

/* ── Cosmic Starfield Background ── */
function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    type Star = { x: number; y: number; r: number; hue: number; phase: number; speed: number };
    type Shooter = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
    const stars: Star[] = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.3, hue: Math.random() * 60 + 220,
      phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.8,
    }));
    const shooters: Shooter[] = [];
    let t = 0;

    const spawnShooter = () => {
      shooters.push({ x: Math.random() * canvas.width * 0.5, y: Math.random() * canvas.height * 0.4,
        vx: 4 + Math.random() * 3, vy: 1.5 + Math.random() * 2,
        life: 0, maxLife: 60 + Math.random() * 40 });
    };

    let animId: number;
    const animate = () => {
      t++;
      ctx.fillStyle = "rgba(3, 3, 12, 0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula clouds
      if (t === 1) {
        const nebulas = [
          { x: canvas.width * 0.15, y: canvas.height * 0.25, r: 280, c: "rgba(191,90,242," },
          { x: canvas.width * 0.82, y: canvas.height * 0.6, r: 220, c: "rgba(0,170,255," },
          { x: canvas.width * 0.5, y: canvas.height * 0.85, r: 200, c: "rgba(255,45,120," },
        ];
        nebulas.forEach(n => {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          g.addColorStop(0, n.c + "0.06)");
          g.addColorStop(1, n.c + "0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
      }

      // Stars with twinkle
      stars.forEach(s => {
        const brightness = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.02 * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 80%, 85%, ${brightness})`;
        ctx.fill();
        if (s.r > 1.2) {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue}, 80%, 85%, ${brightness * 0.12})`;
          ctx.fill();
        }
      });

      // Shooting stars
      if (t % 90 === 0) spawnShooter();
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx; s.y += s.vy; s.life++;
        const alpha = Math.max(0, 1 - s.life / s.maxLife);
        const tailLen = 40 + s.vx * 4;
        const grad = ctx.createLinearGradient(s.x - tailLen, s.y - tailLen * 0.4, s.x, s.y);
        grad.addColorStop(0, `rgba(200,170,255,0)`);
        grad.addColorStop(1, `rgba(220,200,255,${alpha})`);
        ctx.beginPath(); ctx.moveTo(s.x - tailLen, s.y - tailLen * 0.4); ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
        if (s.life >= s.maxLife) shooters.splice(i, 1);
      }

      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

/* ── Nova Music Logo ── */
function NovaLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute inset-0 rounded-full border border-[#bf5af2]/40"
          style={{ animation: `nova-ring ${1.8 + i * 0.6}s ease-out infinite`, animationDelay: `${i * 0.4}s` }} />
      ))}
      <svg viewBox="0 0 40 40" width={size} height={size} className="relative z-10">
        <defs>
          <radialGradient id="novaCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#0af" stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="M20 1 L22.5 14 L34 8 L25.5 19 L39 20 L25.5 21 L34 32 L22.5 26 L20 39 L17.5 26 L6 32 L14.5 21 L1 20 L14.5 19 L6 8 L17.5 14 Z"
          fill="url(#starGrad)" filter="url(#glow)" />
        <circle cx="20" cy="20" r="7" fill="url(#novaCore)" />
        <text x="20" y="24" textAnchor="middle" fontSize="9" fill="white" fontWeight="900" fontFamily="sans-serif" style={{ userSelect: "none" }}>♪</text>
      </svg>
    </div>
  );
}

/* ── Turntable Illustration ── */
function TurntableIllustration() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto">
      <div className="absolute inset-0 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(191,90,242,0.4) 0%, transparent 70%)", filter: "blur(30px)" }} />
      <svg viewBox="0 0 300 300" className="w-full h-full" style={{ filter: "drop-shadow(0 0 20px rgba(191,90,242,0.3))" }}>
        <defs>
          <radialGradient id="vinylGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a0a30" />
            <stop offset="30%" stopColor="#0d0620" />
            <stop offset="60%" stopColor="#150830" />
            <stop offset="80%" stopColor="#0a0518" />
            <stop offset="100%" stopColor="#06030f" />
          </radialGradient>
          <radialGradient id="labelGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
          <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        {/* Platter base */}
        <circle cx="150" cy="155" r="128" fill="#0f0624" stroke="rgba(191,90,242,0.2)" strokeWidth="2" />
        {/* Vinyl record */}
        <g style={{ transformOrigin: "150px 155px", animation: "vinyl-spin 4s linear infinite" }}>
          <circle cx="150" cy="155" r="118" fill="url(#vinylGrad)" />
          {[100, 85, 70, 55, 40, 25].map((r, i) => (
            <circle key={i} cx="150" cy="155" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {/* Groove shimmer lines */}
          {[108, 93, 78, 63, 48, 33].map((r, i) => (
            <circle key={"s" + i} cx="150" cy="155" r={r} fill="none"
              stroke={`rgba(191,90,242,${0.05 + i * 0.01})`} strokeWidth="0.5" />
          ))}
          {/* Center label */}
          <circle cx="150" cy="155" r="28" fill="url(#labelGrad)" />
          <circle cx="150" cy="155" r="22" fill="rgba(0,0,0,0.3)" />
          <text x="150" y="150" textAnchor="middle" fontSize="8" fill="white" fontWeight="900" fontFamily="Oxanium,sans-serif" opacity="0.9">NOVA</text>
          <text x="150" y="162" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="Oxanium,sans-serif" opacity="0.7">MUSIC</text>
          <circle cx="150" cy="155" r="4" fill="rgba(255,255,255,0.8)" />
        </g>
        {/* Tonearm pivot */}
        <circle cx="248" cy="60" r="10" fill="#1e293b" stroke="rgba(148,163,184,0.4)" strokeWidth="2" />
        {/* Tonearm */}
        <line x1="248" y1="60" x2="200" y2="125" stroke="url(#armGrad)" strokeWidth="4" strokeLinecap="round" />
        <line x1="200" y1="125" x2="188" y2="140" stroke="url(#armGrad)" strokeWidth="3" strokeLinecap="round" />
        {/* Needle */}
        <line x1="188" y1="140" x2="185" y2="148" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" />
        <circle cx="185" cy="149" r="3" fill="#e879f9" style={{ filter: "drop-shadow(0 0 4px #e879f9)" }} />
        {/* Headshell */}
        <rect x="183" y="137" width="14" height="7" rx="2" fill="#334155" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
      </svg>
      {/* Floating music notes */}
      {["♪", "♫", "♬", "♩"].map((note, i) => (
        <div key={i} className="absolute text-lg font-bold pointer-events-none"
          style={{
            color: ["#e879f9","#0af","#ff2d78","#ffd60a"][i],
            top: `${[10, 75, 20, 65][i]}%`,
            left: `${[5, 85, 80, 10][i]}%`,
            animation: `float-drift ${3 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            opacity: 0.7,
            textShadow: `0 0 8px ${["#e879f9","#0af","#ff2d78","#ffd60a"][i]}`,
          }}>
          {note}
        </div>
      ))}
    </div>
  );
}

/* ── Spectrum Visualizer (Novel Feature 1) ── */
function SpectrumVisualizer() {
  const bars = 32;
  return (
    <div className="flex items-end justify-center gap-[2px] h-16 w-full max-w-xs mx-auto" data-testid="spectrum-visualizer">
      {Array.from({ length: bars }).map((_, i) => {
        const hue = (i / bars) * 120 + 200;
        const delay = (i * 0.04).toFixed(2);
        const period = (0.3 + Math.abs(Math.sin(i * 0.8)) * 0.5).toFixed(2);
        return (
          <div key={i} className="flex-1 rounded-full origin-bottom"
            style={{
              minWidth: 2,
              background: `hsl(${hue}, 100%, 65%)`,
              boxShadow: `0 0 6px hsl(${hue}, 100%, 65%)`,
              animation: `spectrum-dance ${period}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }} />
        );
      })}
    </div>
  );
}

/* ── Genre Galaxy Constellation (Novel Feature 2) ── */
const GENRE_NODES = [
  { label: "Hip Hop", x: 22, y: 30, color: "#ff2d78", size: 8 },
  { label: "R&B", x: 38, y: 20, color: "#ffd60a", size: 6 },
  { label: "Afrobeats", x: 60, y: 15, color: "#30d158", size: 7 },
  { label: "Amapiano", x: 78, y: 28, color: "#0af", size: 6 },
  { label: "EDM", x: 85, y: 50, color: "#818cf8", size: 7 },
  { label: "Latin", x: 72, y: 70, color: "#ff9500", size: 6 },
  { label: "Pop", x: 50, y: 78, color: "#e879f9", size: 8 },
  { label: "Phonk", x: 28, y: 72, color: "#ff453a", size: 5 },
  { label: "Drill", x: 15, y: 55, color: "#64d2ff", size: 5 },
  { label: "K-Pop", x: 50, y: 45, color: "#f472b6", size: 9 },
];

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0],[9,0],[9,4],[9,6],[2,6],[1,6],
];

function GenreGalaxy() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1" }} data-testid="genre-galaxy">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Constellation lines */}
        {CONNECTIONS.map(([a, b], i) => (
          <line key={i}
            x1={GENRE_NODES[a].x} y1={GENRE_NODES[a].y}
            x2={GENRE_NODES[b].x} y2={GENRE_NODES[b].y}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.4"
            strokeDasharray={hovered === a || hovered === b ? "none" : "1 2"} />
        ))}
        {/* Nodes */}
        {GENRE_NODES.map((g, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}>
            <circle cx={g.x} cy={g.y} r={g.size * 1.8} fill={g.color} opacity="0.08" />
            <circle cx={g.x} cy={g.y} r={g.size * 0.6} fill={g.color}
              opacity={hovered === i ? 1 : 0.7}
              style={{ filter: `drop-shadow(0 0 ${hovered === i ? 4 : 2}px ${g.color})`, transition: "all 0.2s" }} />
            <text x={g.x} y={g.y - g.size * 0.8} textAnchor="middle" fontSize="4.5"
              fill={g.color} opacity={hovered === i ? 1 : 0.6}
              style={{ fontFamily: "sans-serif", fontWeight: 700, transition: "opacity 0.2s", pointerEvents: "none" }}>
              {g.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── Floating DJ Equipment (Novel Feature 3) ── */
function FloatingEquipment() {
  const items = [
    { icon: "🎧", x: "8%", y: "15%", delay: "0s", size: "2rem" },
    { icon: "💿", x: "88%", y: "10%", delay: "0.7s", size: "2.2rem" },
    { icon: "🎛️", x: "5%", y: "70%", delay: "1.2s", size: "1.8rem" },
    { icon: "🎤", x: "90%", y: "75%", delay: "0.4s", size: "1.6rem" },
    { icon: "🔊", x: "50%", y: "5%", delay: "1.8s", size: "1.5rem" },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {items.map((item, i) => (
        <div key={i} className="absolute text-2xl select-none"
          style={{
            left: item.x, top: item.y, fontSize: item.size,
            animation: `float-drift ${4 + i * 0.8}s ease-in-out infinite`,
            animationDelay: item.delay, opacity: 0.15,
          }}>
          {item.icon}
        </div>
      ))}
    </div>
  );
}

/* ── EQ Bars (Nav) ── */
function EQBars() {
  return (
    <div className="flex items-end gap-[3px] h-7" data-testid="eq-bars-animation">
      {[0.4,0.8,0.5,1,0.6,0.9,0.45,0.7,0.55,1].map((h, i) => (
        <div key={i} className="w-[3px] rounded-full"
          style={{
            background: `hsl(${260 + i * 15}, 100%, 70%)`,
            height: "100%",
            transformOrigin: "bottom",
            animation: `spectrum-dance ${0.35 + i * 0.08}s ease-in-out infinite`,
            animationDelay: `${i * 0.04}s`,
            boxShadow: `0 0 4px hsl(${260 + i * 15}, 100%, 70%)`,
          }} />
      ))}
    </div>
  );
}

/* ── Marquee Features Banner ── */
const FEATURES = [
  "🌍 Global Music Trends", "🤖 AI Auto-Mix", "🎛️ 4-Deck Console", "📡 Live Crowd Sync",
  "🎙️ Mic Ducking", "⚡ 32 FX Pads", "🎵 Smart Setlists", "🔥 Fire Zone Detection",
  "🏆 Battle Mode", "💎 Artist Marketplace", "🎸 Jamendo Library", "🌐 Platform Integration",
];

function FeatureMarquee() {
  return (
    <div className="relative overflow-hidden py-3 border-y border-white/5" data-testid="feature-marquee">
      <div className="flex gap-8 whitespace-nowrap"
        style={{ animation: "marquee 22s linear infinite", width: "max-content" }}>
        {[...FEATURES, ...FEATURES].map((f, i) => (
          <span key={i} className="text-xs font-semibold tracking-wider text-white/40">
            {f}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ── How It Works ── */
const HOW_IT_WORKS = [
  { step: "01", emoji: "🎵", title: "Load Your Songs", desc: "Pick any MP3, WAV, or local file — no special format needed. Nova Music handles the rest.", color: "#e879f9" },
  { step: "02", emoji: "▶️", title: "Hit Play & Vibe", desc: "Press Play and watch the turntable spin. Load a second track for full mix control.", color: "#0af" },
  { step: "03", emoji: "🎛️", title: "Blend Smoothly", desc: "Slide the crossfader to glide between songs. Left = Deck A, Right = Deck B. That's DJing!", color: "#ff2d78" },
  { step: "04", emoji: "⚡", title: "Drop the FX", desc: "Hit the colorful pads — Air Horn, Amapiano beat, Phonk energy, and 29 more sounds.", color: "#ffd60a" },
  { step: "05", emoji: "🤖", title: "Let DJ Jeff Handle It", desc: "Turn on AI mode and DJ Jeff auto-mixes your entire library with smart transitions.", color: "#30d158" },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [loaded, setLoaded] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showGalaxy, setShowGalaxy] = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#03030c" }}>
      <CosmicBackground />
      <FloatingEquipment />

      {/* Deep nebula glow overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 15% 40%, rgba(191,90,242,0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 35%, rgba(0,170,255,0.07) 0%, transparent 40%), radial-gradient(ellipse at 50% 95%, rgba(255,45,120,0.07) 0%, transparent 35%)",
        }} />

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Navigation ── */}
        <nav className="flex items-center justify-between px-6 py-4 md:px-12 md:py-5">
          <div className="flex items-center gap-3">
            <div style={{ animation: loaded ? "nova-burst 0.8s cubic-bezier(0.22,1,0.36,1) forwards" : "none", opacity: loaded ? 1 : 0 }}>
              <NovaLogo size={38} />
            </div>
            <div className={`transition-all duration-700 delay-200 ${loaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
              <span className="nova-text-gradient font-black tracking-tight"
                style={{ fontFamily: "'Oxanium', sans-serif", fontSize: "1.3rem" }}
                data-testid="text-brand-name">
                NOVA MUSIC
              </span>
              <div className="text-[9px] text-white/30 tracking-[0.2em] font-medium -mt-0.5">GALACTIC SOUND SYSTEM</div>
            </div>
          </div>
          <EQBars />
        </nav>

        {/* ── Feature Marquee ── */}
        <FeatureMarquee />

        {/* ── Hero ── */}
        <main className="flex-1 flex flex-col items-center px-5 pb-16">
          <div className={`w-full max-w-5xl mx-auto pt-10 transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>

            {/* Hero layout: text left, turntable right */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-12">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 border border-[#e879f9]/30"
                  style={{ background: "rgba(232,121,249,0.08)" }}
                  data-testid="text-tagline">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#e879f9]/80 font-bold">
                    AI-Powered · Party Ready · Global Sound
                  </span>
                </div>

                <h1 className="font-black leading-none mb-6"
                  style={{ fontFamily: "'Oxanium', sans-serif", fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                  <span className="nova-text-gradient block">THE UNIVERSE</span>
                  <span className="text-white/95 block">OF SOUND</span>
                  <span className="block text-[60%] font-bold tracking-widest text-white/30 mt-1">IN YOUR HANDS</span>
                </h1>

                <p className="text-base md:text-lg text-white/50 leading-relaxed mb-6 max-w-lg" data-testid="text-description">
                  No DJ experience needed. Nova Music lets <strong className="text-white/75">anyone</strong> mix music, drop global sound effects, and run an entire party from their phone — powered by AI.
                </p>

                <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
                  {["🎉 No experience needed", "📱 Mobile-first", "🤖 AI auto-mix", "🌍 32 global FX"].map(t => (
                    <span key={t} className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/8 text-white/35">{t}</span>
                  ))}
                </div>

                <SpectrumVisualizer />
              </div>

              <div className="shrink-0">
                <TurntableIllustration />
              </div>
            </div>

            {/* ── Mode Selection Cards ── */}
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">

              {/* AI DJ Mode — Hero Card */}
              <button
                onClick={() => navigate("/ai-dj")}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.015] active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, rgba(232,121,249,0.12), rgba(129,140,248,0.08), rgba(56,189,248,0.1))", border: "1px solid rgba(232,121,249,0.25)" }}
                data-testid="button-launch-ai-dj">
                <div className="holographic-card p-6 flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #e879f9, #8b5cf6, #38bdf8)", boxShadow: "0 0 30px rgba(232,121,249,0.5)" }}>
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#30d158] border-2 border-[#03030c] flex items-center justify-center">
                      <span className="text-[7px] font-black text-white">AI</span>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3 h-3 text-[#ffd60a]" />
                      <span className="text-[10px] uppercase tracking-widest text-[#ffd60a] font-black">Recommended — DJ Jeff</span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>
                      AI DJ Mode
                    </h3>
                    <p className="text-sm text-white/45">Upload your library — DJ Jeff handles everything</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {["Auto Mix","Trend Detection","Fire Zone","Global Genres"].map(t => (
                        <span key={t} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#e879f9]/12 text-[#e879f9] border border-[#e879f9]/25">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#e879f9]/40 transition-colors">
                    <ChevronDown className="w-4 h-4 text-white/30 -rotate-90 group-hover:text-[#e879f9] transition-colors" />
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party Mode */}
                <button
                  onClick={() => navigate("/party")}
                  className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, rgba(255,45,120,0.1), rgba(255,149,0,0.08))", border: "1px solid rgba(255,45,120,0.2)" }}
                  data-testid="button-launch-party">
                  <div className="holographic-card p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)", boxShadow: "0 0 24px rgba(255,45,120,0.45)" }}>
                      <PartyPopper className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>Party Mode</h3>
                      <p className="text-xs text-white/40">Simple & fun for everyone</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["Easy Mix","32 FX","Crowd Sync"].map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-[#ff2d78]/12 text-[#ff2d78] border border-[#ff2d78]/25">{t}</span>
                      ))}
                    </div>
                  </div>
                </button>

                {/* DJ Console */}
                <button
                  onClick={() => navigate("/console")}
                  className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, rgba(191,90,242,0.1), rgba(0,170,255,0.08))", border: "1px solid rgba(191,90,242,0.2)" }}
                  data-testid="button-launch-console">
                  <div className="holographic-card p-6 flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #bf5af2, #0af)", boxShadow: "0 0 24px rgba(191,90,242,0.45)" }}>
                      <Headphones className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#bf5af2]/60 font-semibold mb-0.5">Pro</div>
                      <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>DJ Console</h3>
                      <p className="text-xs text-white/40">Full 4-deck mixing experience</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["4 Decks","FX Rack","Battle Mode"].map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-[#bf5af2]/12 text-[#bf5af2] border border-[#bf5af2]/25">{t}</span>
                      ))}
                    </div>
                  </div>
                </button>
              </div>

              {/* Quick-access row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Free Music", icon: "🎵", path: "/marketplace", color: "#30d158" },
                  { label: "Pricing", icon: "⭐", path: "/pricing", color: "#ffd60a" },
                  { label: "Artist Upload", icon: "🎤", path: "/signup", color: "#e879f9" },
                ].map(({ label, icon, path, color }) => (
                  <button key={path} onClick={() => navigate(path)}
                    className="rounded-2xl py-3 px-2 text-center transition-all hover:scale-[1.03]"
                    style={{ background: `${color}0d`, border: `1px solid ${color}25` }}
                    data-testid={`button-nav-${label.toLowerCase().replace(" ", "-")}`}>
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-[10px] font-semibold tracking-wide" style={{ color }}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Genre Galaxy section ── */}
            <div className="mt-16 text-center">
              <button onClick={() => setShowGalaxy(!showGalaxy)}
                className="flex items-center gap-2 mx-auto text-sm text-white/35 hover:text-white/60 transition-colors mb-4"
                data-testid="button-genre-galaxy">
                <Globe className="w-4 h-4" />
                <span>Explore the Genre Galaxy</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showGalaxy ? "rotate-180" : ""}`} />
              </button>

              {showGalaxy && (
                <div className="animate-slide-in-up max-w-md mx-auto">
                  <p className="text-xs text-white/30 mb-4">
                    Nova Music knows the global sound — from Amapiano in Johannesburg to Jersey Club in New York. Hover a genre.
                  </p>
                  <div className="rounded-3xl p-4 border border-white/5"
                    style={{ background: "rgba(10,5,25,0.6)", backdropFilter: "blur(20px)" }}>
                    <GenreGalaxy />
                  </div>
                </div>
              )}
            </div>

            {/* ── How It Works ── */}
            <div className="mt-12 text-center">
              <button onClick={() => setShowHow(!showHow)}
                className="flex items-center gap-2 mx-auto text-sm text-white/35 hover:text-white/60 transition-colors"
                data-testid="button-how-it-works">
                <span>How does it work?</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showHow ? "rotate-180" : ""}`} />
              </button>

              {showHow && (
                <div className="w-full max-w-xl mx-auto mt-6 space-y-3 animate-slide-in-up">
                  <h2 className="text-lg font-black text-white/80 mb-5"
                    style={{ fontFamily: "'Oxanium', sans-serif" }}>
                    From Zero to DJ in 5 Steps
                  </h2>
                  {HOW_IT_WORKS.map(({ step, emoji, title, desc, color }) => (
                    <div key={step} className="rounded-2xl p-4 flex items-start gap-4"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-base"
                        style={{ background: `${color}18`, border: `1.5px solid ${color}35`, fontFamily: "'Oxanium', sans-serif", color, fontWeight: 900, fontSize: "0.75rem" }}>
                        {step}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white mb-1">{emoji} {title}</div>
                        <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4">
                    <button onClick={() => navigate("/party")}
                      className="px-8 py-4 rounded-2xl font-black text-white transition-all hover:scale-[1.03]"
                      style={{ background: "linear-gradient(135deg, #e879f9, #8b5cf6)", boxShadow: "0 0 30px rgba(232,121,249,0.3)", fontFamily: "'Oxanium', sans-serif" }}
                      data-testid="button-start-party-bottom">
                      🚀 Launch Nova Music
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="text-center py-4 text-white/20 text-xs tracking-wider space-y-2 px-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <NovaLogo size={16} />
            <span>NOVA MUSIC · The universe of sound in your hands</span>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { label: "Pricing", path: "/pricing", testid: "link-pricing" },
              { label: "Marketplace", path: "/marketplace", testid: "footer-link-marketplace" },
              { label: "Compliance", path: "/compliance", testid: "footer-link-compliance" },
              { label: "Terms", path: "/terms", testid: "footer-link-terms" },
              { label: "Create Account", path: "/signup", testid: "footer-link-signup" },
              { label: "Event Logs", path: "/event-history", testid: "footer-link-event-history" },
            ].map(({ label, path, testid }, i, arr) => (
              <span key={path} className="flex items-center gap-4">
                <a href={path} className="text-white/25 hover:text-white/50 transition-colors" data-testid={testid}>{label}</a>
                {i < arr.length - 1 && <span className="text-white/10">·</span>}
              </span>
            ))}
          </div>
        </footer>
      </div>
      <AppFooter />
    </div>
  );
}
