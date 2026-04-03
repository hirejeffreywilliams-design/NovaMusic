import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { Turntable } from "@/components/turntable";
import { Microphone } from "@/components/microphone";
import { BeginnerTips, TipBubble } from "@/components/beginner-tips";
import { SongQueue, QueuedSong } from "@/components/song-queue";
import { AudioOutput } from "@/components/audio-output";
import { PlatformSync } from "@/components/platform-sync";
import { AIDJAssistant } from "@/components/ai-dj-assistant";
import {
  ArrowLeft, Play, Pause, Upload, HelpCircle,
  Sparkles, Zap, ChevronRight, Settings,
} from "lucide-react";

const PARTY_COLORS = ["#ff2d78", "#ff9500", "#ffd60a", "#30d158", "#0af", "#bf5af2", "#64d2ff", "#ff453a"];

interface FXPad {
  name: string;
  emoji: string;
  freq: number;
  type: string;
  category: "hype" | "trending" | "tools" | "vibes";
  color: string;
}

const PARTY_FX: FXPad[] = [
  // ── HYPE ──────────────────────────────────────────────────
  { name: "AIR HORN", emoji: "📯", freq: 400, type: "horn", category: "hype", color: "#ff2d78" },
  { name: "BASS DROP", emoji: "💥", freq: 60, type: "drop", category: "hype", color: "#ff453a" },
  { name: "CROWD ROAR", emoji: "🙌", freq: 700, type: "crowd", category: "hype", color: "#ff9500" },
  { name: "YEAH!", emoji: "🎤", freq: 500, type: "vocal", category: "hype", color: "#ffd60a" },
  { name: "LET'S GO", emoji: "🔥", freq: 650, type: "letsgo", category: "hype", color: "#ff2d78" },
  { name: "FOG HORN", emoji: "🚢", freq: 80, type: "foghorn", category: "hype", color: "#ff453a" },
  { name: "SIREN", emoji: "🚨", freq: 600, type: "siren", category: "hype", color: "#ffd60a" },
  { name: "WHISTLE", emoji: "😮‍💨", freq: 3000, type: "whistle", category: "hype", color: "#30d158" },
  // ── TRENDING 2025 ─────────────────────────────────────────
  { name: "AMAPIANO", emoji: "🪘", freq: 90, type: "amapiano", category: "trending", color: "#ffd60a" },
  { name: "PHONK", emoji: "💀", freq: 110, type: "phonk", category: "trending", color: "#ff453a" },
  { name: "DRILL DROP", emoji: "🔫", freq: 50, type: "drill", category: "trending", color: "#64d2ff" },
  { name: "JERSEY CLUB", emoji: "🏙️", freq: 130, type: "jersey", category: "trending", color: "#bf5af2" },
  { name: "TRAP ROLL", emoji: "⚡", freq: 160, type: "traproll", category: "trending", color: "#0af" },
  { name: "UK GARAGE", emoji: "🇬🇧", freq: 140, type: "ukgarage", category: "trending", color: "#30d158" },
  { name: "DEMBOW", emoji: "🌴", freq: 100, type: "dembow", category: "trending", color: "#ff9500" },
  { name: "AFRO HI-HAT", emoji: "🌍", freq: 120, type: "afrohihat", category: "trending", color: "#ffd60a" },
  // ── DJ TOOLS ──────────────────────────────────────────────
  { name: "SCRATCH", emoji: "🎵", freq: 800, type: "scratch", category: "tools", color: "#bf5af2" },
  { name: "REWIND", emoji: "⏪", freq: 1500, type: "rewind", category: "tools", color: "#0af" },
  { name: "RISER", emoji: "🚀", freq: 200, type: "riser", category: "tools", color: "#30d158" },
  { name: "WOOSH", emoji: "💨", freq: 300, type: "woosh", category: "tools", color: "#64d2ff" },
  { name: "FILTER SWEEP", emoji: "🔊", freq: 400, type: "sweep", category: "tools", color: "#bf5af2" },
  { name: "LASER", emoji: "🔴", freq: 2000, type: "laser", category: "tools", color: "#ff2d78" },
  { name: "VINYL STOP", emoji: "⏹️", freq: 600, type: "vinyl_stop", category: "tools", color: "#0af" },
  { name: "STUTTER", emoji: "🔁", freq: 900, type: "stutter", category: "tools", color: "#ff9500" },
  // ── VIBES ─────────────────────────────────────────────────
  { name: "SUB HIT", emoji: "💣", freq: 35, type: "sub_hit", category: "vibes", color: "#ff453a" },
  { name: "CLAP", emoji: "👏", freq: 1200, type: "clap", category: "vibes", color: "#30d158" },
  { name: "REV CYMBAL", emoji: "🥁", freq: 500, type: "reverse_cym", category: "vibes", color: "#ffd60a" },
  { name: "BUILD UP", emoji: "📈", freq: 150, type: "build", category: "vibes", color: "#bf5af2" },
  { name: "ROBOT", emoji: "🤖", freq: 440, type: "robot", category: "vibes", color: "#0af" },
  { name: "CHIME", emoji: "🔔", freq: 1760, type: "chime", category: "vibes", color: "#64d2ff" },
  { name: "RECORD SKIP", emoji: "💿", freq: 700, type: "record_skip", category: "vibes", color: "#ff9500" },
  { name: "BOMB", emoji: "💥", freq: 40, type: "bomb", category: "vibes", color: "#ff453a" },
];

const FX_CATEGORIES: { id: FXPad["category"]; label: string; emoji: string; color: string }[] = [
  { id: "hype", label: "Hype", emoji: "🔥", color: "#ff2d78" },
  { id: "trending", label: "Trending", emoji: "📈", color: "#ffd60a" },
  { id: "tools", label: "DJ Tools", emoji: "🎛️", color: "#bf5af2" },
  { id: "vibes", label: "Vibes", emoji: "✨", color: "#30d158" },
];

function generatePartySound(ctx: AudioContext, type: string, freq: number) {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.5, now);

  switch (type) {
    case "horn": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.1);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now); osc.stop(now + 0.8); break;
    }
    case "drop": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.8, now); masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now); osc.stop(now + 0.6); break;
    }
    case "scratch": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.05);
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.1); osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.15);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2); break;
    }
    case "siren": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq * 2, now + 0.3);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.6); osc.connect(masterGain);
      masterGain.gain.linearRampToValueAtTime(0, now + 0.8); osc.start(now); osc.stop(now + 0.8); break;
    }
    case "laser": {
      const osc = ctx.createOscillator(); osc.type = "square";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3); break;
    }
    case "clap": {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/ctx.sampleRate*30) * 0.6;
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(masterGain); src.start(now); break;
    }
    case "woosh": {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.sin(Math.PI * i / d.length) * 0.4;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq, now); filter.frequency.linearRampToValueAtTime(freq*4, now+0.5);
      src.connect(filter); filter.connect(masterGain); src.start(now); break;
    }
    case "vocal": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      const f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 800; f1.Q.value = 5;
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1200; f2.Q.value = 5;
      osc.connect(f1); osc.connect(f2); f1.connect(masterGain); f2.connect(masterGain);
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq*1.2, now+0.2);
      masterGain.gain.linearRampToValueAtTime(0, now+0.4); osc.start(now); osc.stop(now+0.4); break;
    }
    case "bomb": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(freq, now+0.5);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.8, now); masterGain.gain.linearRampToValueAtTime(0, now+0.8);
      osc.start(now); osc.stop(now+0.8); break;
    }
    case "riser": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq*10, now+1.5);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.1, now);
      masterGain.gain.linearRampToValueAtTime(0.5, now+1.2); masterGain.gain.linearRampToValueAtTime(0, now+1.5);
      osc.start(now); osc.stop(now+1.5); break;
    }
    case "rewind": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.5);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now+0.5);
      osc.start(now); osc.stop(now+0.5); break;
    }
    case "crowd": {
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i/ctx.sampleRate;
        d[i] = (Math.random()*2-1)*0.3 * Math.sin(Math.PI*t) + Math.sin(2*Math.PI*400*t)*0.1*Math.sin(Math.PI*t);
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(masterGain); src.start(now); break;
    }
    case "letsgo": {
      const osc = ctx.createOscillator(); osc.type = "square";
      const dist = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i*2/256)-1; curve[i] = Math.max(-1, Math.min(1, x*3)); }
      dist.curve = curve;
      osc.frequency.setValueAtTime(freq*0.8, now); osc.frequency.linearRampToValueAtTime(freq*1.3, now+0.3);
      osc.frequency.linearRampToValueAtTime(freq, now+0.5);
      osc.connect(dist); dist.connect(masterGain);
      masterGain.gain.setValueAtTime(0.6, now); masterGain.gain.linearRampToValueAtTime(0, now+0.7);
      osc.start(now); osc.stop(now+0.7); break;
    }
    case "foghorn": {
      const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator();
      osc1.type = "sine"; osc2.type = "sine";
      osc1.frequency.value = freq; osc2.frequency.value = freq * 1.01;
      osc1.connect(masterGain); osc2.connect(masterGain);
      masterGain.gain.setValueAtTime(0, now); masterGain.gain.linearRampToValueAtTime(0.8, now+0.2);
      masterGain.gain.setValueAtTime(0.8, now+0.8); masterGain.gain.linearRampToValueAtTime(0, now+1.2);
      osc1.start(now); osc1.stop(now+1.2); osc2.start(now); osc2.stop(now+1.2); break;
    }
    case "whistle": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.linearRampToValueAtTime(freq*1.15, now+0.08);
      osc.frequency.linearRampToValueAtTime(freq, now+0.2);
      osc.connect(masterGain); masterGain.gain.linearRampToValueAtTime(0, now+0.3);
      osc.start(now); osc.stop(now+0.3); break;
    }
    case "amapiano": {
      const dur = 0.6;
      [0, 0.15, 0.3, 0.45].forEach((offset, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = freq * [1, 1.5, 1.25, 2][i];
        g.gain.setValueAtTime(0.5, now+offset); g.gain.exponentialRampToValueAtTime(0.01, now+offset+0.12);
        osc.connect(g); g.connect(masterGain);
        osc.start(now+offset); osc.stop(now+offset+0.12);
      });
      break;
    }
    case "phonk": {
      const osc = ctx.createOscillator(); osc.type = "square";
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
      osc.frequency.setValueAtTime(freq, now);
      [0, 0.12, 0.24].forEach(o => {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.7, now+o); g.gain.exponentialRampToValueAtTime(0.01, now+o+0.1);
        osc.connect(lp); lp.connect(g); g.connect(masterGain);
      });
      osc.start(now); osc.stop(now+0.35); break;
    }
    case "drill": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(freq, now+0.08);
      const hihat = ctx.createOscillator(); hihat.type = "square"; hihat.frequency.value = 8000;
      const hg = ctx.createGain(); hg.gain.setValueAtTime(0.3, now);
      [0.05, 0.1, 0.125, 0.15, 0.175, 0.2].forEach(t => {
        hg.gain.setValueAtTime(0.3, now+t); hg.gain.exponentialRampToValueAtTime(0.001, now+t+0.025);
      });
      hihat.connect(hg); hg.connect(masterGain);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.8, now); masterGain.gain.linearRampToValueAtTime(0, now+0.4);
      osc.start(now); osc.stop(now+0.4); hihat.start(now); hihat.stop(now+0.3); break;
    }
    case "jersey": {
      const notes = [freq, freq*1.5, freq*2, freq*1.5];
      notes.forEach((n, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "triangle"; osc.frequency.value = n;
        const t = now + i*0.075;
        g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.07);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t+0.07);
      }); break;
    }
    case "traproll": {
      const hihat = ctx.createOscillator(); hihat.type = "square"; hihat.frequency.value = 12000;
      const g = ctx.createGain();
      const speeds = [0, 0.04, 0.08, 0.1, 0.12, 0.13, 0.14, 0.145, 0.15, 0.155, 0.16, 0.165, 0.17];
      speeds.forEach(t => {
        g.gain.setValueAtTime(0.4, now+t); g.gain.exponentialRampToValueAtTime(0.001, now+t+0.035);
      });
      hihat.connect(g); g.connect(masterGain);
      hihat.start(now); hihat.stop(now+0.25); break;
    }
    case "ukgarage": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
      osc.frequency.setValueAtTime(freq, now); osc.frequency.setValueAtTime(freq*0.75, now+0.125); osc.frequency.setValueAtTime(freq, now+0.25);
      osc.connect(lp); lp.connect(masterGain);
      masterGain.gain.setValueAtTime(0.6, now); masterGain.gain.linearRampToValueAtTime(0, now+0.4);
      osc.start(now); osc.stop(now+0.4); break;
    }
    case "dembow": {
      const kick = ctx.createOscillator(); kick.type = "sine";
      kick.frequency.setValueAtTime(220, now); kick.frequency.exponentialRampToValueAtTime(40, now+0.1);
      const kg = ctx.createGain(); kg.gain.setValueAtTime(0.9, now); kg.gain.exponentialRampToValueAtTime(0.001, now+0.15);
      kick.connect(kg); kg.connect(masterGain);
      const snare = ctx.createOscillator(); snare.type = "square"; snare.frequency.value = 300;
      const sg = ctx.createGain(); sg.gain.setValueAtTime(0, now+0.25); sg.gain.setValueAtTime(0.6, now+0.25); sg.gain.exponentialRampToValueAtTime(0.001, now+0.35);
      snare.connect(sg); sg.connect(masterGain);
      kick.start(now); kick.stop(now+0.15); snare.start(now+0.25); snare.stop(now+0.35); break;
    }
    case "afrohihat": {
      [0, 0.08, 0.16, 0.2, 0.24, 0.32].forEach((t, i) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate*0.05, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random()*2-1) * Math.exp(-j/(ctx.sampleRate*0.015));
        const src = ctx.createBufferSource(); src.buffer = buf;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
        const g = ctx.createGain(); g.gain.value = i % 3 === 0 ? 0.6 : 0.35;
        src.connect(hp); hp.connect(g); g.connect(masterGain);
        src.start(now+t); src.stop(now+t+0.05);
      }); break;
    }
    case "sweep": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.Q.value = 3;
      filter.frequency.setValueAtTime(200, now); filter.frequency.exponentialRampToValueAtTime(8000, now+1.0);
      osc.frequency.value = 50;
      osc.connect(filter); filter.connect(masterGain);
      masterGain.gain.setValueAtTime(0.3, now); masterGain.gain.linearRampToValueAtTime(0.6, now+0.8); masterGain.gain.linearRampToValueAtTime(0, now+1.0);
      osc.start(now); osc.stop(now+1.0); break;
    }
    case "vinyl_stop": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(freq*0.02, now+0.8);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(0.5, now); masterGain.gain.linearRampToValueAtTime(0, now+0.8);
      osc.start(now); osc.stop(now+0.8); break;
    }
    case "stutter": {
      for (let i = 0; i < 8; i++) {
        const t = now + i*0.04;
        const osc = ctx.createOscillator(); osc.type = "square"; osc.frequency.value = freq;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.4*(1-i*0.08), t); g.gain.exponentialRampToValueAtTime(0.001, t+0.035);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t+0.035);
      } break;
    }
    case "sub_hit": {
      const osc = ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(freq, now+0.05);
      osc.connect(masterGain); masterGain.gain.setValueAtTime(1.0, now); masterGain.gain.exponentialRampToValueAtTime(0.001, now+0.5);
      osc.start(now); osc.stop(now+0.5); break;
    }
    case "reverse_cym": {
      const sr = ctx.sampleRate; const dur = 1.2;
      const buf = ctx.createBuffer(1, sr*dur, sr); const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i/sr; d[i] = (Math.random()*2-1) * (t/dur) * 0.6;
      }
      const src = ctx.createBufferSource(); src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
      src.connect(hp); hp.connect(masterGain);
      masterGain.gain.setValueAtTime(0.3, now); masterGain.gain.linearRampToValueAtTime(0.7, now+1.1); masterGain.gain.linearRampToValueAtTime(0, now+1.2);
      src.start(now); break;
    }
    case "build": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(200, now); lp.frequency.exponentialRampToValueAtTime(8000, now+2.0);
      osc.frequency.setValueAtTime(50, now); osc.frequency.linearRampToValueAtTime(100, now+2.0);
      osc.connect(lp); lp.connect(masterGain);
      masterGain.gain.setValueAtTime(0.05, now); masterGain.gain.linearRampToValueAtTime(0.7, now+1.8); masterGain.gain.linearRampToValueAtTime(0, now+2.0);
      osc.start(now); osc.stop(now+2.0); break;
    }
    case "robot": {
      const osc = ctx.createOscillator(); osc.type = "square";
      const lp = ctx.createBiquadFilter(); lp.type = "bandpass"; lp.frequency.value = freq; lp.Q.value = 15;
      const trm = ctx.createOscillator(); const tg = ctx.createGain();
      trm.type = "square"; trm.frequency.value = 8;
      trm.connect(tg); tg.gain.value = 0.5;
      osc.connect(lp); lp.connect(masterGain);
      masterGain.gain.setValueAtTime(0.5, now); masterGain.gain.linearRampToValueAtTime(0, now+0.5);
      osc.start(now); osc.stop(now+0.5); trm.start(now); trm.stop(now+0.5); break;
    }
    case "chime": {
      [1, 1.26, 1.5, 2.0].forEach((ratio, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = freq*ratio;
        const t = now + i*0.05;
        g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t+1.5);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t+1.5);
      }); break;
    }
    case "record_skip": {
      const osc = ctx.createOscillator(); osc.type = "sawtooth";
      [0, 0.08, 0.16].forEach((offset) => {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.5, now+offset); g.gain.exponentialRampToValueAtTime(0.001, now+offset+0.07);
        osc.frequency.setValueAtTime(freq, now+offset); osc.frequency.exponentialRampToValueAtTime(freq*0.4, now+offset+0.07);
        osc.connect(g); g.connect(masterGain);
      });
      osc.start(now); osc.stop(now+0.3); break;
    }
  }
}

type PartySection = "mix" | "fx" | "mic" | "ai" | "settings";

export default function PartyMode() {
  const [, navigate] = useLocation();
  const engine = useAudioEngine();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [crossfade, setCrossfade] = useState(0.5);
  const [showTips, setShowTips] = useState(false);
  const [activeSection, setActiveSection] = useState<PartySection>("mix");
  const [fxCategory, setFxCategory] = useState<FXPad["category"]>("hype");
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const [showFirstTimeTip, setShowFirstTimeTip] = useState(true);
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);
  const confettiIdRef = useRef(0);

  const [queueA, setQueueA] = useState<QueuedSong[]>([]);
  const [queueB, setQueueB] = useState<QueuedSong[]>([]);
  const [queueIndexA, setQueueIndexA] = useState(-1);
  const [queueIndexB, setQueueIndexB] = useState(-1);

  const prevPlayingA = useRef(false);
  const prevPlayingB = useRef(false);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const spawnConfetti = useCallback(() => {
    const items = Array.from({ length: 12 }, () => ({
      id: confettiIdRef.current++,
      x: Math.random() * 100,
      color: PARTY_COLORS[Math.floor(Math.random() * PARTY_COLORS.length)],
      delay: Math.random() * 0.5,
    }));
    setConfetti((c) => [...c, ...items]);
    setTimeout(() => setConfetti((c) => c.filter((i) => !items.find((ni) => ni.id === i.id))), 2000);
  }, []);

  const handleFxPad = useCallback((index: number) => {
    const fx = PARTY_FX[index];
    const ctx = getAudioCtx();
    generatePartySound(ctx, fx.type, fx.freq);
    setActivePad(index);
    if (fx.type === "drop" || fx.type === "horn" || fx.type === "crowd") spawnConfetti();
    setTimeout(() => setActivePad(null), 350);
  }, [getAudioCtx, spawnConfetti]);

  const addFilesToQueue = useCallback(
    (files: FileList, deck: "A" | "B") => {
      const audioFiles = Array.from(files).filter((f) =>
        f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i.test(f.name)
      );
      const songs: QueuedSong[] = audioFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
      }));
      if (deck === "A") {
        setQueueA((q) => [...q, ...songs]);
        if (songs.length > 0 && queueIndexA === -1) {
          engine.loadFile(songs[0].file, "A");
          setQueueIndexA(0);
          setShowFirstTimeTip(false);
        }
      } else {
        setQueueB((q) => [...q, ...songs]);
        if (songs.length > 0 && queueIndexB === -1) {
          engine.loadFile(songs[0].file, "B");
          setQueueIndexB(0);
        }
      }
    },
    [engine, queueIndexA, queueIndexB]
  );

  const loadQueueSong = useCallback(
    (song: QueuedSong, index: number, deck: "A" | "B") => {
      engine.loadFile(song.file, deck);
      if (deck === "A") setQueueIndexA(index);
      else setQueueIndexB(index);
    },
    [engine]
  );

  const reorderQueue = useCallback(
    (deck: "A" | "B", from: number, to: number) => {
      const setQ = deck === "A" ? setQueueA : setQueueB;
      setQ((q) => {
        const next = [...q];
        if (to < 0 || to >= next.length) return next;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    []
  );

  const removeFromQueue = useCallback(
    (deck: "A" | "B", index: number) => {
      const setQ = deck === "A" ? setQueueA : setQueueB;
      setQ((q) => q.filter((_, i) => i !== index));
    },
    []
  );

  useEffect(() => {
    const deckA = engine.decks.A;
    const wasPlaying = prevPlayingA.current;
    const isNowDone = wasPlaying && !deckA.isPlaying && deckA.duration > 0 &&
      Math.abs(deckA.currentTime - deckA.duration) < 0.5;
    prevPlayingA.current = deckA.isPlaying;
    if (isNowDone && queueIndexA >= 0 && queueIndexA < queueA.length - 1) {
      const next = queueIndexA + 1;
      engine.loadFile(queueA[next].file, "A");
      setQueueIndexA(next);
      setTimeout(() => engine.playDeck("A"), 300);
    }
  }, [engine.decks.A.isPlaying, engine.decks.A.currentTime, engine.decks.A.duration]);

  useEffect(() => {
    const deckB = engine.decks.B;
    const wasPlaying = prevPlayingB.current;
    const isNowDone = wasPlaying && !deckB.isPlaying && deckB.duration > 0 &&
      Math.abs(deckB.currentTime - deckB.duration) < 0.5;
    prevPlayingB.current = deckB.isPlaying;
    if (isNowDone && queueIndexB >= 0 && queueIndexB < queueB.length - 1) {
      const next = queueIndexB + 1;
      engine.loadFile(queueB[next].file, "B");
      setQueueIndexB(next);
      setTimeout(() => engine.playDeck("B"), 300);
    }
  }, [engine.decks.B.isPlaying, engine.decks.B.currentTime, engine.decks.B.duration]);

  const handleFileA = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFilesToQueue(e.target.files, "A"); }
  }, [addFilesToQueue]);

  const handleFileB = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFilesToQueue(e.target.files, "B"); }
  }, [addFilesToQueue]);

  const deckA = engine.decks.A;
  const deckB = engine.decks.B;

  const visiblePads = PARTY_FX.filter(fx => fx.category === fxCategory);

  const sections: { id: PartySection; label: string; emoji: string }[] = [
    { id: "mix", label: "Mix", emoji: "🎛️" },
    { id: "fx", label: "Sound FX", emoji: "⚡" },
    { id: "mic", label: "Mic", emoji: "🎙️" },
    { id: "ai", label: "AI DJ", emoji: "✨" },
    { id: "settings", label: "Setup", emoji: "⚙️" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
    >
      {confetti.map((c) => (
        <div
          key={c.id}
          className="fixed pointer-events-none z-50 w-2 h-2 rounded-full"
          style={{
            left: `${c.x}%`,
            top: "40%",
            background: c.color,
            boxShadow: `0 0 6px ${c.color}`,
            animation: `float-up 1.8s ease-out ${c.delay}s forwards`,
          }}
        />
      ))}

      {showTips && <BeginnerTips onClose={() => setShowTips(false)} />}

      <header className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-xl">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-party-back">
          <ArrowLeft className="w-5 h-5 text-white/50" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ffd60a]" />
          <span className="text-base font-black tracking-wider neon-text-pink" data-testid="text-party-title">PARTY MODE</span>
          <Sparkles className="w-5 h-5 text-[#ffd60a]" />
        </div>
        <button
          onClick={() => setShowTips(true)}
          className="p-2 rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/20 hover:bg-[#ffd60a]/15 transition-colors"
          data-testid="button-help"
        >
          <HelpCircle className="w-5 h-5 text-[#ffd60a]" />
        </button>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-3 pt-2 pb-4 gap-3 overflow-auto">
        {showFirstTimeTip && (
          <TipBubble text="Welcome! Tap 'Load Song' on a deck to pick music — or add a whole playlist! 🎉" />
        )}

        <div className="flex gap-3 justify-center">
          {[
            { id: "A" as const, color: "#ff2d78", fileRef: fileInputARef, onFile: handleFileA, deck: deckA, queue: queueA, queueIndex: queueIndexA },
            { id: "B" as const, color: "#0af", fileRef: fileInputBRef, onFile: handleFileB, deck: deckB, queue: queueB, queueIndex: queueIndexB },
          ].map(({ id, color, fileRef, onFile, deck, queue, queueIndex }) => (
            <div key={id} className="flex-1 glass-panel rounded-2xl p-3 flex flex-col items-center gap-2" style={{ borderColor: `${color}20` }}>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color }}>
                Deck {id}
              </div>

              <div
                className="relative cursor-pointer group"
                onClick={() => {
                  if (deck.buffer) {
                    deck.isPlaying ? engine.pauseDeck(id) : engine.playDeck(id);
                  } else {
                    fileRef.current?.click();
                  }
                }}
                data-testid={`turntable-deck-${id}`}
              >
                <Turntable isPlaying={deck.isPlaying} color={color} size={130} deckLabel={id} />
                {!deck.buffer && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto mb-1" style={{ color }} />
                      <span className="text-[9px] text-white/50">Tap to load</span>
                    </div>
                  </div>
                )}
                {deck.buffer && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                      {deck.isPlaying
                        ? <Pause className="w-4 h-4 text-white" />
                        : <Play className="w-4 h-4 text-white ml-0.5" />}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[9px] text-white/30 truncate max-w-full w-full text-center" data-testid={`text-deck-${id}-name`}>
                {deck.fileName || "No song loaded"}
              </p>
              {queue.length > 1 && (
                <p className="text-[9px] text-white/20 text-center">
                  {queueIndex + 1}/{queue.length} in playlist
                </p>
              )}

              <div className="flex gap-1.5 w-full">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium border transition-colors"
                  style={{ color, borderColor: `${color}30`, background: `${color}10` }}
                  data-testid={`button-load-deck-${id}`}
                >
                  Load Song
                </button>
                <button
                  onClick={() => deck.isPlaying ? engine.pauseDeck(id) : engine.playDeck(id)}
                  disabled={!deck.buffer}
                  className="px-3 py-1.5 rounded-lg text-white text-[10px] font-bold disabled:opacity-30 transition-all"
                  style={{
                    background: deck.isPlaying ? `${color}40` : color,
                    boxShadow: deck.isPlaying ? "none" : `0 0 12px ${color}50`,
                  }}
                  data-testid={`button-play-deck-${id}`}
                >
                  {deck.isPlaying ? "⏸" : "▶️"}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="audio/*" multiple onChange={onFile} className="hidden" />
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(191,90,242,0.15)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff2d78]/80">Deck A</span>
            <span className="text-[10px] text-white/30 font-medium">BLEND / MIX</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0af]/80">Deck B</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={crossfade}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setCrossfade(v);
              engine.updateCrossfadeAB(v);
            }}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #ff2d78 ${crossfade * 100}%, #0af ${crossfade * 100}%)` }}
            data-testid="slider-crossfade"
          />
          <div className="flex justify-between mt-2">
            <button onClick={() => { engine.updateCrossfadeAB(0); setCrossfade(0); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#ff2d78]/10 text-[#ff2d78] border border-[#ff2d78]/20"
              data-testid="button-fade-to-a">← Full A</button>
            <button onClick={() => { engine.updateCrossfadeAB(0.5); setCrossfade(0.5); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 text-white/40 border border-white/10"
              data-testid="button-fade-center">Center</button>
            <button onClick={() => { engine.updateCrossfadeAB(1); setCrossfade(1); }}
              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-[#0af]/10 text-[#0af] border border-[#0af]/20"
              data-testid="button-fade-to-b">Full B →</button>
          </div>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
          {sections.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                activeSection === id ? "bg-[#bf5af2] text-white" : "text-white/40 hover:text-white/60"
              }`}
              style={activeSection === id ? { boxShadow: "0 0 15px rgba(191,90,242,0.4)" } : {}}
              data-testid={`tab-party-${id}`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeSection === "fx" && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#ffd60a]" />
              <span className="text-sm font-bold text-white/80">Sound FX Library</span>
              <span className="ml-auto text-[9px] text-white/25">{PARTY_FX.length} sounds</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {FX_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFxCategory(cat.id)}
                  className="py-2 px-1 rounded-xl text-[9px] font-black transition-all flex flex-col items-center gap-0.5"
                  style={{
                    background: fxCategory === cat.id ? `${cat.color}22` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${fxCategory === cat.id ? cat.color + "50" : "rgba(255,255,255,0.08)"}`,
                    color: fxCategory === cat.id ? cat.color : "rgba(255,255,255,0.35)",
                    boxShadow: fxCategory === cat.id ? `0 0 12px ${cat.color}25` : "none",
                  }}
                  data-testid={`button-fx-category-${cat.id}`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {visiblePads.map((fx) => {
                const i = PARTY_FX.indexOf(fx);
                const isActive = activePad === i;
                return (
                  <button
                    key={fx.name}
                    onClick={() => handleFxPad(i)}
                    className="pad-button rounded-2xl p-2.5 flex flex-col items-center gap-1.5 transition-all active:scale-90"
                    style={{
                      background: isActive ? `${fx.color}45` : `${fx.color}10`,
                      border: `1.5px solid ${fx.color}${isActive ? "80" : "25"}`,
                      boxShadow: isActive ? `0 0 22px ${fx.color}55, 0 0 44px ${fx.color}18` : "none",
                      minHeight: 82,
                    }}
                    data-testid={`button-fx-${fx.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                  >
                    <span className="text-2xl">{fx.emoji}</span>
                    <span className="text-[8px] font-black tracking-wider leading-tight text-center" style={{ color: isActive ? "#fff" : fx.color }}>
                      {fx.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {fxCategory === "trending" && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#ffd60a]/8 border border-[#ffd60a]/15">
                <span className="text-[9px]">📡</span>
                <span className="text-[9px] text-[#ffd60a]/70">Sounds inspired by global trends: Amapiano, Phonk, Drill & more</span>
              </div>
            )}
            <TipBubble text="Try Trending sounds to add global flavor! Amapiano & Phonk are massive right now 🌍" />
          </div>
        )}

        {activeSection === "mix" && (
          <div className="space-y-3 animate-slide-in-up">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (deckA.buffer) engine.playDeck("A"); if (deckB.buffer) engine.playDeck("B"); }}
                className="py-4 rounded-2xl text-sm font-black bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/25 hover:bg-[#30d158]/25 active:scale-95 transition-all"
                data-testid="button-play-all"
              >▶️ Play Both</button>
              <button
                onClick={() => { engine.pauseDeck("A"); engine.pauseDeck("B"); }}
                className="py-4 rounded-2xl text-sm font-black bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/25 hover:bg-[#ff453a]/25 active:scale-95 transition-all"
                data-testid="button-stop-all"
              >⏹ Stop All</button>
            </div>
            <div className="glass-panel rounded-2xl p-3 space-y-2" style={{ borderColor: "rgba(255,45,120,0.1)" }}>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Volume Deck A</span>
              <input type="range" min={0} max={1} step={0.01} value={deckA.volume}
                onChange={(e) => engine.setVolume("A", parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #ff2d78 ${deckA.volume*100}%, rgba(255,255,255,0.1) ${deckA.volume*100}%)` }}
                data-testid="slider-vol-a" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Volume Deck B</span>
              <input type="range" min={0} max={1} step={0.01} value={deckB.volume}
                onChange={(e) => engine.setVolume("B", parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #0af ${deckB.volume*100}%, rgba(255,255,255,0.1) ${deckB.volume*100}%)` }}
                data-testid="slider-vol-b" />
            </div>
            <SongQueue
              deckLabel="A"
              deckColor="#ff2d78"
              currentIndex={queueIndexA}
              queue={queueA}
              isPlaying={deckA.isPlaying}
              onLoadSong={(song, idx) => loadQueueSong(song, idx, "A")}
              onAddFiles={(files) => addFilesToQueue(files, "A")}
              onRemove={(idx) => removeFromQueue("A", idx)}
              onReorder={(from, to) => reorderQueue("A", from, to)}
            />
            <SongQueue
              deckLabel="B"
              deckColor="#0af"
              currentIndex={queueIndexB}
              queue={queueB}
              isPlaying={deckB.isPlaying}
              onLoadSong={(song, idx) => loadQueueSong(song, idx, "B")}
              onAddFiles={(files) => addFilesToQueue(files, "B")}
              onRemove={(idx) => removeFromQueue("B", idx)}
              onReorder={(from, to) => reorderQueue("B", from, to)}
            />
            <TipBubble text="Tip: Slide the Blend bar to mix between songs. You can also load a full playlist and it auto-advances!" />
          </div>
        )}

        {activeSection === "mic" && (
          <div className="animate-slide-in-up space-y-3">
            <div className="glass-panel rounded-2xl p-4" style={{ borderColor: "rgba(255,45,120,0.15)" }}>
              <Microphone audioCtxGetter={engine.getCtx} masterNode={null} />
            </div>
            <TipBubble text="Turn on your mic to speak over the music! Great for hyping up the crowd or making announcements 🎙️" />
          </div>
        )}

        {activeSection === "ai" && (
          <div className="animate-slide-in-up">
            <AIDJAssistant
              deckA={{
                fileName: deckA.fileName,
                isPlaying: deckA.isPlaying,
                bpm: undefined,
                key: undefined,
                duration: deckA.duration,
                buffer: deckA.buffer,
              }}
              deckB={{
                fileName: deckB.fileName,
                isPlaying: deckB.isPlaying,
                bpm: undefined,
                key: undefined,
                duration: deckB.duration,
                buffer: deckB.buffer,
              }}
              queue={[...queueA, ...queueB].map(q => ({ name: q.name, duration: q.duration }))}
              engine={engine}
              compact={true}
            />
            <TipBubble text="AI DJ analyzes your music and helps you mix like a pro! Load some songs and tap Smart Playlist to get started ✨" />
          </div>
        )}

        {activeSection === "settings" && (
          <div className="animate-slide-in-up space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 px-1">🔵 Bluetooth & Audio</h3>
              <AudioOutput audioCtxGetter={engine.getCtx} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-2 px-1">🎵 Music Sources</h3>
              <PlatformSync />
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-2 text-white/10 text-[9px] tracking-widest uppercase">
        DJ Hybrid &middot; Party Mode &middot; Made for Everyone
      </footer>
    </div>
  );
}
