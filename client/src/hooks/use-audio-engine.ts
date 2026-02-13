import { useRef, useState, useCallback, useEffect } from "react";

export interface EQState {
  low: number;
  mid: number;
  high: number;
}

export interface FXState {
  filterFreq: number;
  filterType: "lowpass" | "highpass";
  filterEnabled: boolean;
  reverbMix: number;
  reverbEnabled: boolean;
  delayTime: number;
  delayFeedback: number;
  delayEnabled: boolean;
}

export interface LoopState {
  active: boolean;
  start: number;
  end: number;
  beats: number;
}

export interface HotCue {
  position: number;
  label: string;
  color: string;
}

export interface SamplePad {
  name: string;
  buffer: AudioBuffer | null;
  color: string;
}

export interface DeckState {
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  currentTime: number;
  duration: number;
  cuePoint: number;
  fileName: string;
  analyzerData: Float32Array | null;
  waveformData: number[];
  eq: EQState;
  fx: FXState;
  loop: LoopState;
  hotCues: (HotCue | null)[];
  vuLevel: number;
  beatGrid: number[];
}

const defaultEQ: EQState = { low: 0, mid: 0, high: 0 };
const defaultFX: FXState = {
  filterFreq: 1000,
  filterType: "lowpass",
  filterEnabled: false,
  reverbMix: 0.3,
  reverbEnabled: false,
  delayTime: 0.25,
  delayFeedback: 0.3,
  delayEnabled: false,
};
const defaultLoop: LoopState = { active: false, start: 0, end: 0, beats: 4 };

const defaultDeckState: DeckState = {
  buffer: null,
  isPlaying: false,
  playbackRate: 1,
  volume: 1,
  currentTime: 0,
  duration: 0,
  cuePoint: 0,
  fileName: "",
  analyzerData: null,
  waveformData: [],
  eq: { ...defaultEQ },
  fx: { ...defaultFX },
  loop: { ...defaultLoop },
  hotCues: [null, null, null, null],
  vuLevel: 0,
  beatGrid: [],
};

interface DeckNodes {
  gain: GainNode;
  analyzer: AnalyserNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  filter: BiquadFilterNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayDry: GainNode;
  delayWet: GainNode;
  reverbDry: GainNode;
  reverbWet: GainNode;
  reverbConvolver: ConvolverNode;
}

function createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function generateBeatGrid(bpm: number, duration: number): number[] {
  if (bpm <= 0 || duration <= 0) return [];
  const interval = 60 / bpm;
  const beats: number[] = [];
  for (let t = 0; t < duration; t += interval) {
    beats.push(t);
  }
  return beats;
}

function detectLandmarks(data: Float32Array, sampleRate: number, bpm: number): (HotCue | null)[] {
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
  const labels = ["INTRO", "BUILD", "DROP", "OUTRO"];
  const duration = data.length / sampleRate;

  const segSize = Math.floor(data.length / 32);
  const energies: number[] = [];
  for (let i = 0; i < 32; i++) {
    let energy = 0;
    for (let j = 0; j < segSize; j++) {
      const idx = i * segSize + j;
      if (idx < data.length) energy += data[idx] * data[idx];
    }
    energies.push(energy / segSize);
  }

  const maxE = Math.max(...energies);
  if (maxE === 0) return [null, null, null, null];
  const norm = energies.map(e => e / maxE);

  let introPos = 0;
  for (let i = 0; i < 8; i++) {
    if (norm[i] > 0.1) {
      introPos = (i * segSize) / sampleRate;
      break;
    }
  }

  let dropPos = duration * 0.3;
  let maxJump = 0;
  for (let i = 1; i < norm.length; i++) {
    const jump = norm[i] - norm[i - 1];
    if (jump > maxJump) {
      maxJump = jump;
      dropPos = (i * segSize) / sampleRate;
    }
  }

  let buildPos = Math.max(0, dropPos - (bpm > 0 ? (60 / bpm) * 16 : 8));

  let outroPos = duration * 0.85;
  for (let i = norm.length - 1; i >= norm.length - 8; i--) {
    if (i >= 0 && norm[i] < 0.2) {
      outroPos = (i * segSize) / sampleRate;
      break;
    }
  }

  const beatSnap = bpm > 0 ? 60 / bpm : 0;
  const snap = (t: number) => {
    if (beatSnap <= 0) return t;
    return Math.round(t / beatSnap) * beatSnap;
  };

  return [
    { position: snap(introPos), label: labels[0], color: colors[0] },
    { position: snap(buildPos), label: labels[1], color: colors[1] },
    { position: snap(dropPos), label: labels[2], color: colors[2] },
    { position: snap(outroPos), label: labels[3], color: colors[3] },
  ];
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sourceRefs = useRef<{ A: AudioBufferSourceNode | null; B: AudioBufferSourceNode | null }>({ A: null, B: null });
  const nodesRef = useRef<{ A: DeckNodes | null; B: DeckNodes | null }>({ A: null, B: null });
  const startTimeRefs = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const offsetRefs = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const animFrameRef = useRef<number>(0);
  const loopTimeoutRef = useRef<{ A: number | null; B: number | null }>({ A: null, B: null });

  const [deckA, setDeckA] = useState<DeckState>({ ...defaultDeckState });
  const [deckB, setDeckB] = useState<DeckState>({ ...defaultDeckState });
  const [crossfade, setCrossfade] = useState(0.5);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);
  const [samplePads, setSamplePads] = useState<SamplePad[]>([
    { name: "Kick", buffer: null, color: "#ef4444" },
    { name: "Snare", buffer: null, color: "#f59e0b" },
    { name: "HiHat", buffer: null, color: "#22c55e" },
    { name: "Clap", buffer: null, color: "#3b82f6" },
    { name: "Air Horn", buffer: null, color: "#a855f7" },
    { name: "Riser", buffer: null, color: "#ec4899" },
    { name: "Impact", buffer: null, color: "#14b8a6" },
    { name: "Vocal", buffer: null, color: "#f97316" },
  ]);

  const createDeckNodes = useCallback((ctx: AudioContext): DeckNodes => {
    const gain = ctx.createGain();
    const analyzer = ctx.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.8;

    const eqLow = ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.value = 320;
    eqLow.gain.value = 0;

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.5;
    eqMid.gain.value = 0;

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.value = 3200;
    eqHigh.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    filter.Q.value = 1;

    const delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = 0.25;
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;
    const delayDry = ctx.createGain();
    delayDry.gain.value = 1;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;

    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(delayWet);

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = createImpulseResponse(ctx, 2, 2);
    const reverbDry = ctx.createGain();
    reverbDry.gain.value = 1;
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    return {
      gain, analyzer, eqLow, eqMid, eqHigh, filter,
      delayNode, delayFeedback, delayDry, delayWet,
      reverbDry, reverbWet, reverbConvolver,
    };
  }, []);

  const connectDeckChain = useCallback((nodes: DeckNodes, master: GainNode) => {
    nodes.eqLow.connect(nodes.eqMid);
    nodes.eqMid.connect(nodes.eqHigh);
    nodes.eqHigh.connect(nodes.filter);

    nodes.filter.connect(nodes.delayDry);
    nodes.filter.connect(nodes.delayNode);

    nodes.delayDry.connect(nodes.reverbDry);
    nodes.delayWet.connect(nodes.reverbDry);
    nodes.delayDry.connect(nodes.reverbConvolver);
    nodes.delayWet.connect(nodes.reverbConvolver);

    nodes.reverbDry.connect(nodes.gain);
    nodes.reverbConvolver.connect(nodes.reverbWet);
    nodes.reverbWet.connect(nodes.gain);

    nodes.gain.connect(nodes.analyzer);
    nodes.analyzer.connect(master);
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);

      const nodesA = createDeckNodes(ctxRef.current);
      const nodesB = createDeckNodes(ctxRef.current);
      nodesRef.current.A = nodesA;
      nodesRef.current.B = nodesB;

      nodesA.gain.gain.setValueAtTime(0.5, ctxRef.current.currentTime);
      nodesB.gain.gain.setValueAtTime(0.5, ctxRef.current.currentTime);

      connectDeckChain(nodesA, masterRef.current);
      connectDeckChain(nodesB, masterRef.current);

      destRef.current = ctxRef.current.createMediaStreamDestination();
      masterRef.current.connect(destRef.current);

      generateBuiltInSamples(ctxRef.current);
    }
    return ctxRef.current;
  }, [createDeckNodes, connectDeckChain]);

  const generateBuiltInSamples = useCallback((ctx: AudioContext) => {
    const sr = ctx.sampleRate;

    const createSample = (fn: (sr: number) => AudioBuffer, index: number) => {
      const buf = fn(sr);
      setSamplePads(prev => {
        const next = [...prev];
        next[index] = { ...next[index], buffer: buf };
        return next;
      });
    };

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.15, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 60 * Math.exp(-t * 30);
        d[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 15) * 0.8;
      }
      return buf;
    }, 0);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.12, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = ((Math.random() * 2 - 1) * 0.6 + Math.sin(2 * Math.PI * 200 * t) * 0.3) * Math.exp(-t * 20);
      }
      return buf;
    }, 1);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.05, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.5;
        if (t < 0.002) d[i] *= t / 0.002;
      }
      return buf;
    }, 2);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.1, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-t * 25);
        d[i] += Math.sin(2 * Math.PI * 1200 * t) * 0.2 * Math.exp(-t * 30);
      }
      return buf;
    }, 3);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.5, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 400 + 200 * Math.sin(2 * Math.PI * 8 * t);
        d[i] = Math.sin(2 * Math.PI * freq * t) * (t < 0.4 ? 0.7 : 0.7 * Math.exp(-(t - 0.4) * 20));
      }
      return buf;
    }, 4);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 1.5, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 200 + 2000 * (t / 1.5);
        d[i] = Math.sin(2 * Math.PI * freq * t) * 0.4 * (t / 1.5);
        d[i] += (Math.random() * 2 - 1) * 0.05 * (t / 1.5);
      }
      return buf;
    }, 5);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.3, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * 0.8 * Math.exp(-t * 8);
        d[i] += Math.sin(2 * Math.PI * 40 * t) * 0.5 * Math.exp(-t * 5);
      }
      return buf;
    }, 6);

    createSample((sr) => {
      const buf = ctx.createBuffer(1, sr * 0.4, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const formant1 = Math.sin(2 * Math.PI * 800 * t);
        const formant2 = Math.sin(2 * Math.PI * 1200 * t) * 0.5;
        const formant3 = Math.sin(2 * Math.PI * 2500 * t) * 0.25;
        const vibrato = Math.sin(2 * Math.PI * 5 * t) * 0.02;
        d[i] = (formant1 + formant2 + formant3) * (1 + vibrato) * Math.exp(-t * 4) * 0.3;
      }
      return buf;
    }, 7);
  }, []);

  const playSample = useCallback((index: number) => {
    const ctx = getCtx();
    const pad = samplePads[index];
    if (!pad?.buffer || !masterRef.current) return;

    const src = ctx.createBufferSource();
    src.buffer = pad.buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    src.connect(gain);
    gain.connect(masterRef.current);
    src.start();
  }, [getCtx, samplePads]);

  const loadSampleFile = useCallback(async (index: number, file: File) => {
    const ctx = getCtx();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    setSamplePads(prev => {
      const next = [...prev];
      next[index] = { ...next[index], buffer, name: file.name.replace(/\.[^.]+$/, "") };
      return next;
    });
  }, [getCtx]);

  const generateWaveform = useCallback((buffer: AudioBuffer): number[] => {
    const rawData = buffer.getChannelData(0);
    const samples = 300;
    const blockSize = Math.floor(rawData.length / samples);
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      data.push(sum / blockSize);
    }
    const max = Math.max(...data);
    return max > 0 ? data.map((d) => d / max) : data;
  }, []);

  const loadFile = useCallback(async (file: File, which: "A" | "B") => {
    const ctx = getCtx();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const waveformData = generateWaveform(buffer);
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({
      ...prev,
      buffer,
      fileName: file.name,
      duration: buffer.duration,
      currentTime: 0,
      waveformData,
      hotCues: [null, null, null, null],
      loop: { ...defaultLoop },
      cuePoint: 0,
      beatGrid: [],
    }));
    offsetRefs.current[which] = 0;
  }, [getCtx, generateWaveform]);

  const stopSource = useCallback((which: "A" | "B") => {
    if (sourceRefs.current[which]) {
      try { sourceRefs.current[which]!.stop(); } catch (_) {}
      sourceRefs.current[which] = null;
    }
    if (loopTimeoutRef.current[which]) {
      clearTimeout(loopTimeoutRef.current[which]!);
      loopTimeoutRef.current[which] = null;
    }
  }, []);

  const playDeck = useCallback((which: "A" | "B") => {
    const ctx = getCtx();
    const setter = which === "A" ? setDeckA : setDeckB;
    const state = which === "A" ? deckA : deckB;
    if (!state.buffer) return;

    stopSource(which);

    const src = ctx.createBufferSource();
    src.buffer = state.buffer;
    src.playbackRate.value = state.playbackRate;
    src.connect(nodesRef.current[which]!.eqLow);
    src.onended = () => {
      if (!state.loop.active) {
        setter((prev) => ({ ...prev, isPlaying: false }));
        sourceRefs.current[which] = null;
      }
    };

    const offset = offsetRefs.current[which];
    src.start(0, offset);
    startTimeRefs.current[which] = ctx.currentTime - offset / state.playbackRate;
    sourceRefs.current[which] = src;
    setter((prev) => ({ ...prev, isPlaying: true }));
  }, [getCtx, deckA, deckB, stopSource]);

  const pauseDeck = useCallback((which: "A" | "B") => {
    const ctx = getCtx();
    const setter = which === "A" ? setDeckA : setDeckB;
    const state = which === "A" ? deckA : deckB;
    if (sourceRefs.current[which] && state.isPlaying) {
      const elapsed = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
      offsetRefs.current[which] = elapsed;
      stopSource(which);
      setter((prev) => ({ ...prev, isPlaying: false, currentTime: elapsed }));
    }
  }, [getCtx, deckA, deckB, stopSource]);

  const setRate = useCallback((which: "A" | "B", rate: number) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, playbackRate: rate }));
    if (sourceRefs.current[which]) {
      sourceRefs.current[which]!.playbackRate.value = rate;
    }
  }, []);

  const setVolume = useCallback((which: "A" | "B", vol: number) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, volume: vol }));
  }, []);

  const setCue = useCallback((which: "A" | "B") => {
    const ctx = getCtx();
    const state = which === "A" ? deckA : deckB;
    const setter = which === "A" ? setDeckA : setDeckB;
    let currentPos = offsetRefs.current[which];
    if (state.isPlaying) {
      currentPos = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
    }
    setter((prev) => ({ ...prev, cuePoint: currentPos }));
  }, [getCtx, deckA, deckB]);

  const jumpCue = useCallback((which: "A" | "B") => {
    const state = which === "A" ? deckA : deckB;
    const wasPlaying = state.isPlaying;
    if (wasPlaying) stopSource(which);
    offsetRefs.current[which] = state.cuePoint;
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, currentTime: state.cuePoint, isPlaying: false }));
    if (wasPlaying) {
      setTimeout(() => playDeck(which), 10);
    }
  }, [deckA, deckB, stopSource, playDeck]);

  const seekDeck = useCallback((which: "A" | "B", time: number) => {
    const state = which === "A" ? deckA : deckB;
    const wasPlaying = state.isPlaying;
    if (wasPlaying) stopSource(which);
    offsetRefs.current[which] = time;
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, currentTime: time, isPlaying: false }));
    if (wasPlaying) {
      setTimeout(() => playDeck(which), 10);
    }
  }, [deckA, deckB, stopSource, playDeck]);

  const setEQ = useCallback((which: "A" | "B", band: "low" | "mid" | "high", value: number) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, eq: { ...prev.eq, [band]: value } }));
    const nodes = nodesRef.current[which];
    if (!nodes) return;
    const dbValue = value * 12;
    if (band === "low") nodes.eqLow.gain.setValueAtTime(dbValue, ctxRef.current!.currentTime);
    if (band === "mid") nodes.eqMid.gain.setValueAtTime(dbValue, ctxRef.current!.currentTime);
    if (band === "high") nodes.eqHigh.gain.setValueAtTime(dbValue, ctxRef.current!.currentTime);
  }, []);

  const setFilter = useCallback((which: "A" | "B", freq: number, type: "lowpass" | "highpass") => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({
      ...prev,
      fx: { ...prev.fx, filterFreq: freq, filterType: type, filterEnabled: true },
    }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.filter.type = type;
    nodes.filter.frequency.setValueAtTime(freq, ctxRef.current.currentTime);
  }, []);

  const toggleFilter = useCallback((which: "A" | "B", enabled: boolean) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, fx: { ...prev.fx, filterEnabled: enabled } }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    if (!enabled) {
      nodes.filter.type = "lowpass";
      nodes.filter.frequency.setValueAtTime(20000, ctxRef.current.currentTime);
    }
  }, []);

  const setReverb = useCallback((which: "A" | "B", mix: number, enabled: boolean) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({ ...prev, fx: { ...prev.fx, reverbMix: mix, reverbEnabled: enabled } }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.reverbWet.gain.setValueAtTime(enabled ? mix : 0, ctxRef.current.currentTime);
    nodes.reverbDry.gain.setValueAtTime(enabled ? 1 - mix * 0.5 : 1, ctxRef.current.currentTime);
  }, []);

  const setDelay = useCallback((which: "A" | "B", time: number, feedback: number, enabled: boolean) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    setter((prev) => ({
      ...prev,
      fx: { ...prev.fx, delayTime: time, delayFeedback: feedback, delayEnabled: enabled },
    }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.delayNode.delayTime.setValueAtTime(time, ctxRef.current.currentTime);
    nodes.delayFeedback.gain.setValueAtTime(enabled ? feedback : 0, ctxRef.current.currentTime);
    nodes.delayWet.gain.setValueAtTime(enabled ? 0.5 : 0, ctxRef.current.currentTime);
  }, []);

  const setHotCue = useCallback((which: "A" | "B", index: number) => {
    const ctx = getCtx();
    const state = which === "A" ? deckA : deckB;
    const setter = which === "A" ? setDeckA : setDeckB;
    let pos = offsetRefs.current[which];
    if (state.isPlaying) {
      pos = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
    }
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
    const labels = ["1", "2", "3", "4"];
    setter((prev) => {
      const newHotCues = [...prev.hotCues];
      if (newHotCues[index]) {
        newHotCues[index] = null;
      } else {
        newHotCues[index] = { position: pos, label: labels[index], color: colors[index] };
      }
      return { ...prev, hotCues: newHotCues };
    });
  }, [getCtx, deckA, deckB]);

  const setAutoHotCues = useCallback((which: "A" | "B", data: Float32Array, sampleRate: number, bpm: number) => {
    const setter = which === "A" ? setDeckA : setDeckB;
    const landmarks = detectLandmarks(data, sampleRate, bpm);
    setter((prev) => ({ ...prev, hotCues: landmarks }));
  }, []);

  const jumpHotCue = useCallback((which: "A" | "B", index: number) => {
    const state = which === "A" ? deckA : deckB;
    const cue = state.hotCues[index];
    if (!cue) return;
    seekDeck(which, cue.position);
  }, [deckA, deckB, seekDeck]);

  const toggleLoop = useCallback((which: "A" | "B", beats: number, bpm: number) => {
    const ctx = getCtx();
    const state = which === "A" ? deckA : deckB;
    const setter = which === "A" ? setDeckA : setDeckB;

    if (state.loop.active && state.loop.beats === beats) {
      setter((prev) => ({ ...prev, loop: { ...prev.loop, active: false } }));
      if (loopTimeoutRef.current[which]) {
        clearTimeout(loopTimeoutRef.current[which]!);
        loopTimeoutRef.current[which] = null;
      }
      return;
    }

    let currentPos = offsetRefs.current[which];
    if (state.isPlaying) {
      currentPos = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
    }

    const effectiveBpm = bpm || 120;
    const loopDuration = (60 / effectiveBpm) * beats;
    const loopEnd = Math.min(currentPos + loopDuration, state.duration);

    setter((prev) => ({
      ...prev,
      loop: { active: true, start: currentPos, end: loopEnd, beats },
    }));
  }, [getCtx, deckA, deckB]);

  const setBeatGrid = useCallback((which: "A" | "B", bpm: number) => {
    const state = which === "A" ? deckA : deckB;
    const setter = which === "A" ? setDeckA : setDeckB;
    if (!state.buffer) return;
    const grid = generateBeatGrid(bpm, state.duration);
    setter((prev) => ({ ...prev, beatGrid: grid }));
  }, [deckA, deckB]);

  const updateCrossfade = useCallback((val: number) => {
    setCrossfade(val);
    if (ctxRef.current && nodesRef.current.A && nodesRef.current.B) {
      nodesRef.current.A.gain.gain.setValueAtTime(1 - val, ctxRef.current.currentTime);
      nodesRef.current.B.gain.gain.setValueAtTime(val, ctxRef.current.currentTime);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!destRef.current) getCtx();
    const recorder = new MediaRecorder(destRef.current!.stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setRecordingUrl(url);
      setIsRecording(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingUrl(null);
  }, [getCtx]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const autoMix = useCallback((bpmA?: number, bpmB?: number) => {
    if (autoMixing) return;
    setAutoMixing(true);

    if (bpmA && bpmB && bpmA > 0 && bpmB > 0) {
      const ratio = bpmA / bpmB;
      if (ratio > 0.85 && ratio < 1.15) {
        setRate("B", bpmA / bpmB);
      }
    }

    playDeck("A");
    updateCrossfade(0);

    const beatInterval = bpmA && bpmA > 0 ? (60 / bpmA) * 1000 : 500;
    const transitionBeats = 16;
    const transitionDuration = beatInterval * transitionBeats;
    const leadInBeats = Math.round(2000 / beatInterval);
    const leadInMs = leadInBeats * beatInterval;

    setTimeout(() => {
      playDeck("B");

      const steps = transitionBeats * 2;
      const stepDuration = transitionDuration / steps;

      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const t = i / steps;
          const curve = t * t * (3 - 2 * t);
          updateCrossfade(curve);
        }, i * stepDuration);
      }

      setTimeout(() => {
        pauseDeck("A");
        updateCrossfade(1);
        setRate("B", 1);
        setAutoMixing(false);
      }, transitionDuration + 200);
    }, leadInMs);
  }, [autoMixing, playDeck, pauseDeck, updateCrossfade, setRate]);

  useEffect(() => {
    const update = () => {
      const ctx = ctxRef.current;
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(update);
        return;
      }

      (["A", "B"] as const).forEach((w) => {
        const setter = w === "A" ? setDeckA : setDeckB;
        const src = sourceRefs.current[w];
        const nodes = nodesRef.current[w];

        setter((prev) => {
          if (!prev.isPlaying || !src || !nodes) return prev;
          const elapsed = (ctx.currentTime - startTimeRefs.current[w]) * prev.playbackRate;
          const clampedTime = Math.min(elapsed, prev.duration);

          if (prev.loop.active && clampedTime >= prev.loop.end) {
            offsetRefs.current[w] = prev.loop.start;
            stopSource(w);
            const newSrc = ctx.createBufferSource();
            newSrc.buffer = prev.buffer;
            newSrc.playbackRate.value = prev.playbackRate;
            newSrc.connect(nodes.eqLow);
            newSrc.start(0, prev.loop.start);
            startTimeRefs.current[w] = ctx.currentTime - prev.loop.start / prev.playbackRate;
            sourceRefs.current[w] = newSrc;
          }

          const freqData = new Uint8Array(nodes.analyzer.frequencyBinCount);
          nodes.analyzer.getByteFrequencyData(freqData);
          let rms = 0;
          for (let i = 0; i < freqData.length; i++) rms += freqData[i] * freqData[i];
          rms = Math.sqrt(rms / freqData.length) / 255;

          const data = new Float32Array(nodes.analyzer.fftSize);
          nodes.analyzer.getFloatTimeDomainData(data);

          return { ...prev, currentTime: clampedTime, analyzerData: data, vuLevel: rms };
        });
      });

      animFrameRef.current = requestAnimationFrame(update);
    };
    animFrameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stopSource]);

  return {
    deckA, deckB,
    crossfade, isRecording, recordingUrl, autoMixing,
    samplePads,
    loadFile, playDeck, pauseDeck,
    setRate, setVolume,
    setCue, jumpCue, seekDeck,
    setEQ, setFilter, toggleFilter, setReverb, setDelay,
    setHotCue, setAutoHotCues, jumpHotCue, toggleLoop,
    setBeatGrid,
    updateCrossfade,
    startRecording, stopRecording,
    autoMix, getCtx,
    playSample, loadSampleFile,
  };
}
