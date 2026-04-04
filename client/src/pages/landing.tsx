import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Headphones, PartyPopper, Zap, Sparkles, ChevronDown, Bot, Globe, Music2, Radio, Disc3 } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

/* ═══════════════════════════════════════════════════════════
   HYPERSPACE WARP VORTEX — full-viewport canvas background
═══════════════════════════════════════════════════════════ */
function HyperspaceVortex() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    type Particle = {
      angle: number; speed: number; dist: number; maxDist: number;
      hue: number; sat: number; bright: number; size: number; trail: number;
    };

    const makeParticle = (): Particle => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 2.5,
      dist: Math.random() * 20,
      maxDist: 180 + Math.random() * 500,
      hue: Math.random() < 0.5 ? 260 + Math.random() * 50 : Math.random() < 0.7 ? 200 + Math.random() * 30 : 320 + Math.random() * 40,
      sat: 80 + Math.random() * 20,
      bright: 65 + Math.random() * 30,
      size: 0.5 + Math.random() * 1.5,
      trail: 0.3 + Math.random() * 0.5,
    });

    const particles: Particle[] = Array.from({ length: 280 }, makeParticle);

    let animId: number;
    const cx = () => canvas.width / 2;
    const cy = () => canvas.height * 0.42;

    // Nebula draw on t=1
    let nebulaDrawn = false;
    let t = 0;

    const animate = () => {
      t++;

      // Very slow fade — lets trails persist
      ctx.fillStyle = "rgba(2, 2, 10, 0.13)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula clouds (draw once)
      if (!nebulaDrawn) {
        nebulaDrawn = true;
        [
          { x: 0.18, y: 0.22, r: 340, c: "rgba(168,85,247," },
          { x: 0.82, y: 0.60, r: 260, c: "rgba(0,150,255," },
          { x: 0.50, y: 0.90, r: 220, c: "rgba(236,72,153," },
          { x: 0.50, y: 0.42, r: 180, c: "rgba(232,121,249," },
        ].forEach(n => {
          const g = ctx.createRadialGradient(n.x * canvas.width, n.y * canvas.height, 0, n.x * canvas.width, n.y * canvas.height, n.r);
          g.addColorStop(0, n.c + "0.06)");
          g.addColorStop(1, n.c + "0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        });
      }

      // Vortex glow center
      const vg = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), 120);
      vg.addColorStop(0, "rgba(232,121,249,0.10)");
      vg.addColorStop(0.4, "rgba(129,140,248,0.04)");
      vg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Particles
      for (const p of particles) {
        const px = cx() + Math.cos(p.angle) * p.dist;
        const py = cy() + Math.sin(p.angle) * p.dist;

        const speed = p.speed * (0.5 + (p.dist / p.maxDist) * 2.5);
        const prevDist = p.dist;
        p.dist += speed;
        const alpha = Math.min(1, (p.dist / p.maxDist) * 1.4) * (1 - p.dist / p.maxDist);

        // Trail
        const trailLen = speed * (4 + p.dist / 60);
        const px0 = cx() + Math.cos(p.angle) * (p.dist - trailLen);
        const py0 = cy() + Math.sin(p.angle) * (p.dist - trailLen);

        const trail = ctx.createLinearGradient(px0, py0, px, py);
        trail.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.bright}%,0)`);
        trail.addColorStop(1, `hsla(${p.hue},${p.sat}%,${p.bright}%,${alpha * 0.9})`);

        ctx.beginPath();
        ctx.moveTo(px0, py0);
        ctx.lineTo(px, py);
        ctx.strokeStyle = trail;
        ctx.lineWidth = p.size * (0.5 + p.dist / p.maxDist * 1.5);
        ctx.stroke();

        // Star head
        if (p.dist > p.maxDist * 0.7) {
          ctx.beginPath();
          ctx.arc(px, py, p.size * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue},${p.sat}%,90%,${alpha * 0.8})`;
          ctx.fill();
        }

        if (p.dist >= p.maxDist) {
          Object.assign(p, makeParticle());
        }
      }

      // Shooting stars
      if (t % 120 === 0) {
        const sy = Math.random() * canvas.height * 0.5;
        const sx = Math.random() * canvas.width * 0.6;
        const shg = ctx.createLinearGradient(sx, sy, sx + 180, sy + 60);
        shg.addColorStop(0, "rgba(220,200,255,0)");
        shg.addColorStop(1, "rgba(220,200,255,0.7)");
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 180, sy + 60);
        ctx.strokeStyle = shg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

/* ═══════════════════════════════════════════════════════════
   RETROWAVE PERSPECTIVE GRID FLOOR
═══════════════════════════════════════════════════════════ */
function RetrowaveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = 260; };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    let animId: number;
    const animate = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const horizon = h * 0.15;
      const floorH = h - horizon;

      // Scroll offset for animation
      const scroll = (t * 0.8) % (floorH / 10);

      // Vertical lines (perspective)
      const vLines = 16;
      for (let i = 0; i <= vLines; i++) {
        const frac = i / vLines;
        const botX = frac * w;
        const topX = cx + (frac - 0.5) * w * 0.08;
        const alpha = frac < 0.15 || frac > 0.85 ? 0 : 0.15 + Math.sin((frac - 0.5) * Math.PI) * 0.2;
        const grad = ctx.createLinearGradient(topX, horizon, botX, h);
        grad.addColorStop(0, `rgba(232,121,249,0)`);
        grad.addColorStop(0.3, `rgba(129,140,248,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(232,121,249,${alpha})`);
        ctx.beginPath();
        ctx.moveTo(topX, horizon);
        ctx.lineTo(botX, h);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Horizontal lines (scrolling)
      const hLines = 12;
      for (let i = 0; i <= hLines; i++) {
        const rawY = horizon + (i / hLines) * floorH + scroll;
        const y = rawY > h ? rawY - floorH : rawY;
        const progress = (y - horizon) / floorH;
        if (progress < 0 || progress > 1) continue;

        // Perspective interpolation of left/right endpoints
        const lx = cx - (cx * progress * 0.92);
        const rx = cx + (cx * progress * 0.92);
        const alpha = progress * 0.4 * (1 - progress * 0.3);

        // Color cycle
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.04 + i * 0.5);
        const r = Math.round(129 + pulse * 103);
        const g = Math.round(140 * (1 - pulse * 0.3));
        const b = Math.round(248 - pulse * 110 + 110);

        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = i === hLines ? 1.5 : 0.8;
        ctx.stroke();
      }

      // Glow at horizon
      const hg = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 30);
      hg.addColorStop(0, "rgba(232,121,249,0)");
      hg.addColorStop(0.5, `rgba(232,121,249,${0.06 + 0.04 * Math.sin(t * 0.05)})`);
      hg.addColorStop(1, "rgba(232,121,249,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(0, horizon - 10, w, 40);

      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed bottom-0 left-0 right-0 pointer-events-none z-0"
      style={{ height: 260, opacity: 0.6 }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED 3D DJ SETUP CANVAS
═══════════════════════════════════════════════════════════ */
function DJSetupCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    let animId: number;
    let t = 0;

    const drawPlatter = (cx: number, cy: number, r: number, color: string, angle: number, label: string) => {
      const [cr, cg, cb] = color === "A"
        ? [232, 121, 249] : [56, 189, 248];

      // Halo
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.15 + 0.1 * Math.sin(t * 0.05)})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // LED dots on outer ring
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2 + angle;
        const phase = (angle * 2 / (Math.PI * 2) + i / 24) % 1;
        const bright = 0.12 + 0.88 * Math.pow(Math.max(0, Math.sin(phase * Math.PI)), 2.5);
        const dx = cx + (r + 4) * Math.cos(ang);
        const dy = cy + (r + 4) * Math.sin(ang);
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${bright})`;
        ctx.fill();
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Vinyl base
      const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      vg.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
      vg.addColorStop(0.12, "rgba(6,3,18,0.98)");
      vg.addColorStop(0.9, "rgba(10,5,25,0.99)");
      vg.addColorStop(1, `rgba(${cr},${cg},${cb},0.06)`);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = vg;
      ctx.fill();

      // Grooves
      for (let i = 3; i <= 20; i++) {
        const gr = (r * 0.28) + (r * 0.66) * (i / 20);
        const hue = (i * 15 + t * 0.5) % 360;
        ctx.beginPath();
        ctx.arc(0, 0, gr, 0, Math.PI * 2);
        ctx.strokeStyle = i % 5 === 0 ? `hsla(${hue},70%,70%,0.06)` : `rgba(255,255,255,${0.025})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Label
      const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.28);
      lg.addColorStop(0, `rgba(${cr + 30},${cg},${cb},0.95)`);
      lg.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.85)`);
      lg.addColorStop(1, `rgba(${cr},${cg},${cb},0.3)`);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = lg;
      ctx.fill();

      // Label text
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `bold ${r * 0.22}px 'Oxanium', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = `rgba(${cr},${cg},${cb},1)`;
      ctx.shadowBlur = 12;
      ctx.fillText(label, 0, 0);
      ctx.shadowBlur = 0;

      // Spindle
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#e0e0ee";
      ctx.fill();

      ctx.restore();

      // Specular
      ctx.save();
      ctx.translate(cx, cy);
      const sg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      sg.addColorStop(0, "rgba(255,255,255,0.09)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.restore();
    };

    const drawMixer = (x: number, y: number, w: number, h: number) => {
      // Mixer body
      const mg = ctx.createLinearGradient(x, y, x, y + h);
      mg.addColorStop(0, "rgba(30,15,60,0.95)");
      mg.addColorStop(1, "rgba(10,5,25,0.98)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(232,121,249,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crossfader track
      const faderX = x + 10;
      const faderY = y + h * 0.65;
      const faderW = w - 20;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(faderX, faderY - 3, faderW, 6, 3);
      ctx.fill();

      // Fader thumb (animated)
      const faderPos = 0.5 + 0.45 * Math.sin(t * 0.015);
      const thumbX = faderX + faderPos * faderW - 6;
      ctx.fillStyle = "rgba(232,121,249,0.9)";
      ctx.beginPath();
      ctx.roundRect(thumbX, faderY - 7, 12, 14, 3);
      ctx.fill();
      ctx.shadowColor = "rgba(232,121,249,0.8)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // EQ knobs
      const knobColors = ["#ff453a", "#ffd60a", "#30d158"];
      for (let i = 0; i < 3; i++) {
        const kx = x + 16 + (i * (w - 20) / 2.4);
        const ky = y + h * 0.28;
        const kr = 6;
        ctx.beginPath();
        ctx.arc(kx, ky, kr, 0, Math.PI * 2);
        ctx.fillStyle = `${knobColors[i]}30`;
        ctx.fill();
        ctx.strokeStyle = knobColors[i];
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Pointer
        const pang = -Math.PI * 0.7 + (t * 0.01 + i) * 0.3;
        ctx.beginPath();
        ctx.moveTo(kx, ky);
        ctx.lineTo(kx + kr * 0.8 * Math.cos(pang), ky + kr * 0.8 * Math.sin(pang));
        ctx.strokeStyle = knobColors[i];
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // VU meters
      for (let side = 0; side < 2; side++) {
        const mx = side === 0 ? x + 6 : x + w - 10;
        const bars = 5;
        for (let b = 0; b < bars; b++) {
          const active = b < Math.round(2 + 2 * Math.abs(Math.sin(t * 0.05 + side * 1.3)));
          const c = b < 3 ? "#30d158" : b < 4 ? "#ffd60a" : "#ff453a";
          ctx.fillStyle = active ? c : `${c}20`;
          ctx.fillRect(mx, y + h * 0.8 - b * 6, 4, 4);
        }
      }
    };

    const animate = () => {
      t++;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Deep background
      const bg = ctx.createRadialGradient(SIZE/2, SIZE/2, 20, SIZE/2, SIZE/2, SIZE*0.7);
      bg.addColorStop(0, "rgba(20,8,45,0.5)");
      bg.addColorStop(1, "rgba(3,3,12,0.8)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);

      angleRef.current += 0.018;
      const ang = angleRef.current;

      // Two platters side by side
      const r = 88;
      drawPlatter(SIZE * 0.28, SIZE * 0.47, r, "A", ang, "A");
      drawPlatter(SIZE * 0.72, SIZE * 0.47, r, "B", -ang * 0.9, "B");

      // Mixer between
      drawMixer(SIZE * 0.385, SIZE * 0.28, SIZE * 0.23, SIZE * 0.38);

      // Stand base (perspective oval)
      ctx.beginPath();
      ctx.ellipse(SIZE / 2, SIZE * 0.85, SIZE * 0.42, SIZE * 0.07, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fill();
      ctx.strokeStyle = "rgba(232,121,249,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ambient floor glow
      const fg = ctx.createRadialGradient(SIZE/2, SIZE * 0.9, 0, SIZE/2, SIZE * 0.9, SIZE * 0.4);
      fg.addColorStop(0, "rgba(232,121,249,0.08)");
      fg.addColorStop(1, "rgba(232,121,249,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, SIZE * 0.7, SIZE, SIZE * 0.3);

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-dj-setup"
      style={{
        width: 320, height: 320, borderRadius: 24,
        filter: "drop-shadow(0 0 40px rgba(232,121,249,0.25)) drop-shadow(0 0 80px rgba(56,189,248,0.15))",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   NOVA LOGO
═══════════════════════════════════════════════════════════ */
function NovaLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="absolute inset-0 rounded-full border border-[#e879f9]/40"
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

/* ─── Spectrum Visualizer ─── */
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

/* ─── Genre Galaxy ─── */
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
const CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0],[9,0],[9,4],[9,6],[2,6],[1,6]];

function GenreGalaxy() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ aspectRatio: "1" }} data-testid="genre-galaxy">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {CONNECTIONS.map(([a, b], i) => (
          <line key={i} x1={GENRE_NODES[a].x} y1={GENRE_NODES[a].y} x2={GENRE_NODES[b].x} y2={GENRE_NODES[b].y}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" strokeDasharray={hovered === a || hovered === b ? "none" : "1 2"} />
        ))}
        {GENRE_NODES.map((g, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
            <circle cx={g.x} cy={g.y} r={g.size * 1.8} fill={g.color} opacity="0.08" />
            <circle cx={g.x} cy={g.y} r={g.size * 0.6} fill={g.color} opacity={hovered === i ? 1 : 0.7}
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

/* ─── EQ Bars (Nav) ─── */
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

/* ─── Marquee ─── */
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
          <span key={i} className="text-xs font-semibold tracking-wider text-white/40">{f}</span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ─── How It Works ─── */
const HOW_IT_WORKS = [
  { step: "01", emoji: "🎵", title: "Load Your Songs", desc: "Pick any MP3, WAV, or local file — no special format needed. Nova Music handles the rest.", color: "#e879f9" },
  { step: "02", emoji: "▶️", title: "Hit Play & Vibe", desc: "Press Play and watch the holographic platter spin. Load a second track for full mix control.", color: "#0af" },
  { step: "03", emoji: "🎛️", title: "Blend Smoothly", desc: "Slide the crossfader to glide between songs. Left = Deck A, Right = Deck B. That's DJing!", color: "#ff2d78" },
  { step: "04", emoji: "⚡", title: "Drop the FX", desc: "Hit the colorful pads — Air Horn, Amapiano beat, Phonk energy, and 29 more sounds.", color: "#ffd60a" },
  { step: "05", emoji: "🤖", title: "Let DJ Jeff Handle It", desc: "Turn on AI mode and DJ Jeff auto-mixes your entire library with smart transitions.", color: "#30d158" },
];

/* ═══════════════════════════════════════════════════════════
   HOLOGRAPHIC MODE CARD
═══════════════════════════════════════════════════════════ */
function HoloCard({
  children, color, accent, onClick, testId, large,
}: {
  children: React.ReactNode;
  color: string;
  accent: string;
  onClick: () => void;
  testId: string;
  large?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-3xl text-left transition-all duration-300 ${hovered ? "scale-[1.025]" : "scale-100"}`}
      style={{
        background: `linear-gradient(135deg, ${color}14 0%, rgba(5,2,18,0.95) 50%, ${accent}0a 100%)`,
        border: `1px solid ${color}30`,
        boxShadow: hovered
          ? `0 0 50px ${color}25, 0 0 100px ${color}10, inset 0 1px 0 rgba(255,255,255,0.09)`
          : `0 0 20px ${color}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
      }}
      data-testid={testId}
    >
      {/* Scan line overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden opacity-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-full" style={{ height: 1, background: `rgba(255,255,255,0.04)`, marginTop: 28 + i * 28 }} />
        ))}
      </div>

      {/* Prismatic corner glow */}
      <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(circle at top left, ${color}20, transparent 70%)` }} />
      <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none rounded-3xl"
        style={{ background: `radial-gradient(circle at bottom right, ${accent}15, transparent 70%)` }} />

      {/* Animated border shimmer */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}18, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.4s ease",
        }} />

      <div className={large ? "p-6" : "p-5"}>
        {children}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════════════ */
export default function Landing() {
  const [, navigate] = useLocation();
  const [loaded, setLoaded] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [showGalaxy, setShowGalaxy] = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#03030c" }}>
      <HyperspaceVortex />
      <RetrowaveGrid />

      {/* Depth vignette */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 15% 40%, rgba(168,85,247,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 35%, rgba(0,150,255,0.06) 0%, transparent 45%)",
        }} />

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Navigation ── */}
        <nav className="flex items-center justify-between px-6 py-4 md:px-12 md:py-5">
          <div className="flex items-center gap-3">
            <div style={{ animation: loaded ? "nova-burst 0.8s cubic-bezier(0.22,1,0.36,1) forwards" : "none", opacity: loaded ? 1 : 0 }}>
              <NovaLogo size={38} />
            </div>
            <div className={`transition-all duration-700 delay-200 ${loaded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
              <span className="font-black tracking-tight"
                style={{
                  fontFamily: "'Oxanium', sans-serif", fontSize: "1.3rem",
                  background: "linear-gradient(135deg, #e879f9 0%, #818cf8 50%, #38bdf8 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}
                data-testid="text-brand-name">
                NOVA MUSIC
              </span>
              <div className="text-[9px] text-white/25 tracking-[0.22em] font-medium -mt-0.5">GALACTIC SOUND SYSTEM</div>
            </div>
          </div>
          <EQBars />
        </nav>

        {/* ── Feature Marquee ── */}
        <FeatureMarquee />

        {/* ── Hero ── */}
        <main className="flex-1 flex flex-col items-center px-5 pb-24">
          <div className={`w-full max-w-5xl mx-auto pt-10 transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>

            {/* Hero: text left, animated DJ setup right */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 mb-16">
              <div className="flex-1 text-center md:text-left">
                {/* Live badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 border border-[#e879f9]/25"
                  style={{ background: "rgba(232,121,249,0.07)", backdropFilter: "blur(10px)" }}
                  data-testid="text-tagline">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#e879f9]/75 font-bold">
                    AI-Powered · Party Ready · Global Sound
                  </span>
                </div>

                {/* Main headline */}
                <h1 className="font-black leading-none mb-6"
                  style={{ fontFamily: "'Oxanium', sans-serif", fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                  <span className="block"
                    style={{ background: "linear-gradient(135deg, #e879f9, #818cf8, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    THE UNIVERSE
                  </span>
                  <span className="text-white/95 block">OF SOUND</span>
                  <span className="block text-[55%] font-bold tracking-[0.3em] text-white/25 mt-2">IN YOUR HANDS</span>
                </h1>

                <p className="text-base md:text-lg text-white/50 leading-relaxed mb-6 max-w-lg" data-testid="text-description">
                  No DJ experience needed. Nova Music lets <strong className="text-white/75">anyone</strong> mix music, drop global sound effects, and run an entire party from their phone — powered by AI.
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
                  {["🎉 No experience needed", "📱 Mobile-first", "🤖 AI auto-mix", "🌍 32 global FX"].map(t => (
                    <span key={t} className="text-[11px] px-3 py-1 rounded-full border text-white/35"
                      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>{t}</span>
                  ))}
                </div>

                <SpectrumVisualizer />
              </div>

              {/* Animated 3D DJ Setup */}
              <div className="shrink-0 flex flex-col items-center gap-4">
                <DJSetupCanvas />
                <p className="text-[10px] text-white/25 tracking-widest uppercase">Holographic DJ Console</p>
              </div>
            </div>

            {/* ── Mode Selection Cards ── */}
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">

              {/* AI DJ Mode — Hero Card */}
              <HoloCard color="#e879f9" accent="#818cf8" onClick={() => navigate("/ai-dj")} testId="button-launch-ai-dj" large>
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #e879f9, #8b5cf6, #38bdf8)",
                        boxShadow: "0 0 35px rgba(232,121,249,0.55)",
                      }}>
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#30d158] border-2 border-[#03030c] flex items-center justify-center"
                      style={{ boxShadow: "0 0 8px rgba(48,209,88,0.6)" }}>
                      <span className="text-[7px] font-black text-white">AI</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3 h-3 text-[#ffd60a]" />
                      <span className="text-[10px] uppercase tracking-widest text-[#ffd60a] font-black">Recommended — DJ Jeff</span>
                    </div>
                    <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>AI DJ Mode</h3>
                    <p className="text-sm text-white/40">Upload your library — DJ Jeff handles everything</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {["Auto Mix","Trend Detection","Fire Zone","Global Genres"].map(t => (
                        <span key={t} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{ background: "rgba(232,121,249,0.1)", color: "#e879f9", borderColor: "rgba(232,121,249,0.25)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0">
                    <ChevronDown className="w-4 h-4 text-white/30 -rotate-90" />
                  </div>
                </div>
              </HoloCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party Mode */}
                <HoloCard color="#ff2d78" accent="#ff9500" onClick={() => navigate("/party")} testId="button-launch-party">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #ff2d78, #ff9500)", boxShadow: "0 0 28px rgba(255,45,120,0.5)" }}>
                      <PartyPopper className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>Party Mode</h3>
                      <p className="text-xs text-white/40">Simple & fun for everyone</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["Easy Mix","32 FX","Crowd Sync"].map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full border"
                          style={{ background: "rgba(255,45,120,0.1)", color: "#ff2d78", borderColor: "rgba(255,45,120,0.25)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </HoloCard>

                {/* DJ Console */}
                <HoloCard color="#bf5af2" accent="#0af" onClick={() => navigate("/console")} testId="button-launch-console">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #bf5af2, #0af)", boxShadow: "0 0 28px rgba(191,90,242,0.5)" }}>
                      <Headphones className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#bf5af2]/60 font-semibold mb-0.5">Pro</div>
                      <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>DJ Console</h3>
                      <p className="text-xs text-white/40">Full 4-deck mixing experience</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["4 Decks","FX Rack","Battle Mode"].map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full border"
                          style={{ background: "rgba(191,90,242,0.1)", color: "#bf5af2", borderColor: "rgba(191,90,242,0.25)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </HoloCard>
              </div>

              {/* Quick-access row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Free Music", icon: "🎵", path: "/marketplace", color: "#30d158" },
                  { label: "Pricing", icon: "⭐", path: "/pricing", color: "#ffd60a" },
                  { label: "Artist Upload", icon: "🎤", path: "/signup", color: "#e879f9" },
                ].map(({ label, icon, path, color }) => (
                  <button key={path} onClick={() => navigate(path)}
                    className="rounded-2xl py-3 px-2 text-center transition-all hover:scale-[1.04]"
                    style={{ background: `${color}0d`, border: `1px solid ${color}22` }}
                    data-testid={`button-nav-${label.toLowerCase().replace(" ", "-")}`}>
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-[10px] font-semibold tracking-wide" style={{ color }}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Genre Galaxy ── */}
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
                    Nova Music knows the global sound — from Amapiano in Johannesburg to Jersey Club in New York.
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
                  <h2 className="text-lg font-black text-white/80 mb-5" style={{ fontFamily: "'Oxanium', sans-serif" }}>
                    From Zero to DJ in 5 Steps
                  </h2>
                  {HOW_IT_WORKS.map(({ step, emoji, title, desc, color }) => (
                    <div key={step} className="rounded-2xl p-4 flex items-start gap-4"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
                        style={{ background: `${color}18`, border: `1.5px solid ${color}35`, color, fontWeight: 900, fontSize: "0.75rem", fontFamily: "'Oxanium', sans-serif" }}>
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
                      style={{ background: "linear-gradient(135deg, #e879f9, #8b5cf6)", boxShadow: "0 0 30px rgba(232,121,249,0.35)", fontFamily: "'Oxanium', sans-serif" }}
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
