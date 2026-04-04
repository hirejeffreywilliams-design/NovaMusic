import { useRef, useState, useCallback, useEffect } from "react";

export type DeckId = "A" | "B" | "C" | "D";
const ALL_DECKS: DeckId[] = ["A", "B", "C", "D"];

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

export interface StemsState {
  bassGain: number;
  midGain: number;
  highGain: number;
  vocalsGain: number;
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
  stems: StemsState;
  stemsEnabled: boolean;
  transitionEffect: string | null;
  bpm: number;
  detectedKey: string;
  camelotCode: string;
}

export type CrossfaderCurve = "smooth" | "club" | "cut";

export interface MasteringState {
  compressorThreshold: number;
  compressorRatio: number;
  compressorKnee: number;
  compressorAttack: number;
  compressorRelease: number;
  limiterEnabled: boolean;
  masterGain: number;
  preset: string;
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
const defaultStems: StemsState = { bassGain: 1, midGain: 1, highGain: 1, vocalsGain: 1 };

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
  stems: { ...defaultStems },
  stemsEnabled: false,
  transitionEffect: null,
  bpm: 0,
  detectedKey: "",
  camelotCode: "",
};

const defaultMastering: MasteringState = {
  compressorThreshold: -24,
  compressorRatio: 4,
  compressorKnee: 30,
  compressorAttack: 0.003,
  compressorRelease: 0.25,
  limiterEnabled: false,
  masterGain: 1,
  preset: "Clean",
};

const MASTER_PRESETS: Record<string, Partial<MasteringState>> = {
  Clean: { compressorThreshold: -24, compressorRatio: 4, compressorKnee: 30, compressorAttack: 0.003, compressorRelease: 0.25 },
  Club: { compressorThreshold: -12, compressorRatio: 8, compressorKnee: 10, compressorAttack: 0.001, compressorRelease: 0.1 },
  Radio: { compressorThreshold: -6, compressorRatio: 12, compressorKnee: 5, compressorAttack: 0.001, compressorRelease: 0.05 },
  Off: { compressorThreshold: 0, compressorRatio: 1, compressorKnee: 0, compressorAttack: 0.003, compressorRelease: 0.25 },
};

interface StemNodes {
  bassFilter: BiquadFilterNode;
  bassGain: GainNode;
  midFilter: BiquadFilterNode;
  midGain: GainNode;
  highFilter: BiquadFilterNode;
  highGain: GainNode;
  vocalsFilter: BiquadFilterNode;
  vocalsGain: GainNode;
  input: GainNode;
  bypass: GainNode;
}

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
  stems: StemNodes;
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

function makeDefaultDecks(): Record<DeckId, DeckState> {
  return {
    A: { ...defaultDeckState, eq: { ...defaultEQ }, fx: { ...defaultFX }, loop: { ...defaultLoop }, hotCues: [null, null, null, null], stems: { ...defaultStems } },
    B: { ...defaultDeckState, eq: { ...defaultEQ }, fx: { ...defaultFX }, loop: { ...defaultLoop }, hotCues: [null, null, null, null], stems: { ...defaultStems } },
    C: { ...defaultDeckState, eq: { ...defaultEQ }, fx: { ...defaultFX }, loop: { ...defaultLoop }, hotCues: [null, null, null, null], stems: { ...defaultStems } },
    D: { ...defaultDeckState, eq: { ...defaultEQ }, fx: { ...defaultFX }, loop: { ...defaultLoop }, hotCues: [null, null, null, null], stems: { ...defaultStems } },
  };
}

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const talkoverGainRef = useRef<GainNode | null>(null);
  const masterAnalyzerRef = useRef<AnalyserNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  const tapTimesRef = useRef<Record<DeckId, number[]>>({ A: [], B: [], C: [], D: [] });

  const sourceRefs = useRef<Record<DeckId, AudioBufferSourceNode | null>>({ A: null, B: null, C: null, D: null });
  const nodesRef = useRef<Record<DeckId, DeckNodes | null>>({ A: null, B: null, C: null, D: null });
  const startTimeRefs = useRef<Record<DeckId, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const offsetRefs = useRef<Record<DeckId, number>>({ A: 0, B: 0, C: 0, D: 0 });
  const animFrameRef = useRef<number>(0);
  const loopTimeoutRef = useRef<Record<DeckId, number | null>>({ A: null, B: null, C: null, D: null });

  const [decks, setDecks] = useState<Record<DeckId, DeckState>>(makeDefaultDecks);
  const [crossfadeAB, setCrossfadeAB] = useState(0.5);
  const [crossfadeCD, setCrossfadeCD] = useState(0.5);
  const [crossfaderCurveAB, setCrossfaderCurveAB] = useState<CrossfaderCurve>("smooth");
  const [crossfaderCurveCD, setCrossfaderCurveCD] = useState<CrossfaderCurve>("smooth");
  const [hypeLevel, setHypeLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);
  const [mastering, setMastering] = useState<MasteringState>({ ...defaultMastering });
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

  const setDeck = useCallback((which: DeckId, updater: (prev: DeckState) => DeckState) => {
    setDecks(prev => ({ ...prev, [which]: updater(prev[which]) }));
  }, []);

  const createStemNodes = useCallback((ctx: AudioContext): StemNodes => {
    const input = ctx.createGain();
    const bypass = ctx.createGain();
    bypass.gain.value = 1;

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 250;
    const bassGain = ctx.createGain();
    bassGain.gain.value = 1;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = "bandpass";
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 0.7;
    const midGain = ctx.createGain();
    midGain.gain.value = 1;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = "highpass";
    highFilter.frequency.value = 2000;
    const highGain = ctx.createGain();
    highGain.gain.value = 1;

    const vocalsFilter = ctx.createBiquadFilter();
    vocalsFilter.type = "bandpass";
    vocalsFilter.frequency.value = 1500;
    vocalsFilter.Q.value = 0.8;
    const vocalsGain = ctx.createGain();
    vocalsGain.gain.value = 1;

    return { bassFilter, bassGain, midFilter, midGain, highFilter, highGain, vocalsFilter, vocalsGain, input, bypass };
  }, []);

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

    const stems = createStemNodes(ctx);

    return {
      gain, analyzer, eqLow, eqMid, eqHigh, filter,
      delayNode, delayFeedback, delayDry, delayWet,
      reverbDry, reverbWet, reverbConvolver,
      stems,
    };
  }, [createStemNodes]);

  const connectStemChain = useCallback((stems: StemNodes, eqLow: BiquadFilterNode) => {
    stems.input.connect(stems.bassFilter);
    stems.bassFilter.connect(stems.bassGain);
    stems.bassGain.connect(eqLow);

    stems.input.connect(stems.midFilter);
    stems.midFilter.connect(stems.midGain);
    stems.midGain.connect(eqLow);

    stems.input.connect(stems.highFilter);
    stems.highFilter.connect(stems.highGain);
    stems.highGain.connect(eqLow);

    stems.input.connect(stems.vocalsFilter);
    stems.vocalsFilter.connect(stems.vocalsGain);
    stems.vocalsGain.connect(eqLow);

    stems.bypass.connect(eqLow);
  }, []);

  const connectDeckChain = useCallback((nodes: DeckNodes, master: GainNode) => {
    connectStemChain(nodes.stems, nodes.eqLow);

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
  }, [connectStemChain]);

  const applyCompressorSettings = useCallback((state: MasteringState) => {
    const comp = compressorRef.current;
    const ctx = ctxRef.current;
    if (!comp || !ctx) return;
    const t = ctx.currentTime;
    comp.threshold.setValueAtTime(state.compressorThreshold, t);
    comp.ratio.setValueAtTime(state.compressorRatio, t);
    comp.knee.setValueAtTime(state.compressorKnee, t);
    comp.attack.setValueAtTime(state.compressorAttack, t);
    comp.release.setValueAtTime(state.compressorRelease, t);
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      masterRef.current = ctxRef.current.createGain();

      talkoverGainRef.current = ctxRef.current.createGain();
      talkoverGainRef.current.gain.value = 1;

      compressorRef.current = ctxRef.current.createDynamicsCompressor();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = 1;

      masterAnalyzerRef.current = ctxRef.current.createAnalyser();
      masterAnalyzerRef.current.fftSize = 1024;
      masterAnalyzerRef.current.smoothingTimeConstant = 0.8;

      masterRef.current.connect(talkoverGainRef.current);
      talkoverGainRef.current.connect(compressorRef.current);
      compressorRef.current.connect(masterGainRef.current);
      masterGainRef.current.connect(masterAnalyzerRef.current);
      masterAnalyzerRef.current.connect(ctxRef.current.destination);

      applyCompressorSettings(defaultMastering);

      for (const id of ALL_DECKS) {
        const dn = createDeckNodes(ctxRef.current);
        nodesRef.current[id] = dn;
        dn.gain.gain.setValueAtTime(0.5, ctxRef.current.currentTime);
        connectDeckChain(dn, masterRef.current);
      }

      destRef.current = ctxRef.current.createMediaStreamDestination();
      masterGainRef.current.connect(destRef.current);

      generateBuiltInSamples(ctxRef.current);
    }
    return ctxRef.current;
  }, [createDeckNodes, connectDeckChain, applyCompressorSettings]);

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

  const connectSourceToStemInput = useCallback((src: AudioBufferSourceNode, nodes: DeckNodes, stemsEnabled: boolean) => {
    if (stemsEnabled) {
      src.connect(nodes.stems.input);
    } else {
      src.connect(nodes.stems.bypass);
    }
  }, []);

  const CAMELOT_KEYS = [
    { key: "C",  camelot: "8B", relative: "Am",  camelotRel: "8A" },
    { key: "C#", camelot: "3B", relative: "A#m", camelotRel: "3A" },
    { key: "D",  camelot: "10B", relative: "Bm",  camelotRel: "10A" },
    { key: "D#", camelot: "5B", relative: "Cm",  camelotRel: "5A" },
    { key: "E",  camelot: "12B", relative: "C#m", camelotRel: "12A" },
    { key: "F",  camelot: "7B", relative: "Dm",  camelotRel: "7A" },
    { key: "F#", camelot: "2B", relative: "D#m", camelotRel: "2A" },
    { key: "G",  camelot: "9B", relative: "Em",  camelotRel: "9A" },
    { key: "G#", camelot: "4B", relative: "Fm",  camelotRel: "4A" },
    { key: "A",  camelot: "11B", relative: "F#m", camelotRel: "11A" },
    { key: "A#", camelot: "6B", relative: "Gm",  camelotRel: "6A" },
    { key: "B",  camelot: "1B", relative: "G#m", camelotRel: "1A" },
  ];

  const detectKey = useCallback((buffer: AudioBuffer): { key: string; camelot: string } => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const chroma = new Array(12).fill(0);

    const step = Math.floor(sampleRate / 10);
    const numSamples = Math.min(data.length, sampleRate * 30);

    for (let i = 0; i < numSamples; i += step) {
      const sample = Math.abs(data[i]);
      if (sample < 0.001) continue;

      for (let midiNote = 36; midiNote <= 84; midiNote++) {
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        const period = sampleRate / freq;
        if (i + period >= data.length) continue;

        let correlation = 0;
        const windowSize = Math.min(256, Math.floor(period * 4));
        for (let j = 0; j < windowSize && i + j + Math.floor(period) < data.length; j++) {
          correlation += data[i + j] * data[i + j + Math.floor(period)];
        }

        if (correlation > 0) {
          const pitchClass = midiNote % 12;
          chroma[pitchClass] += correlation;
        }
      }
    }

    const A_MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const A_MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const chromaMax = Math.max(...chroma) || 1;
    const chromaNorm = chroma.map(v => v / chromaMax);

    let bestMajorScore = -Infinity, bestMinorScore = -Infinity;
    let bestMajorKey = 0, bestMinorKey = 0;

    for (let key = 0; key < 12; key++) {
      let majorScore = 0, minorScore = 0;
      for (let pc = 0; pc < 12; pc++) {
        majorScore += chromaNorm[(pc + key) % 12] * A_MAJOR_PROFILE[pc];
        minorScore += chromaNorm[(pc + key) % 12] * A_MINOR_PROFILE[pc];
      }
      if (majorScore > bestMajorScore) { bestMajorScore = majorScore; bestMajorKey = key; }
      if (minorScore > bestMinorScore) { bestMinorScore = minorScore; bestMinorKey = key; }
    }

    if (bestMajorScore >= bestMinorScore) {
      const k = CAMELOT_KEYS[bestMajorKey];
      return { key: k.key, camelot: k.camelot };
    } else {
      const k = CAMELOT_KEYS[bestMinorKey];
      return { key: k.relative, camelot: k.camelotRel };
    }
  }, []);

  const loadFile = useCallback(async (file: File | string, which: DeckId, displayName?: string) => {
    const ctx = getCtx();
    let arrayBuffer: ArrayBuffer;
    let fileName: string;

    if (typeof file === "string") {
      const response = await fetch(file);
      arrayBuffer = await response.arrayBuffer();
      fileName = displayName || file.split("/").pop() || "Remote Track";
    } else {
      arrayBuffer = await file.arrayBuffer();
      fileName = displayName || file.name;
    }

    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const waveformData = generateWaveform(buffer);

    let detectedKey = "";
    let camelotCode = "";
    try {
      const keyResult = detectKey(buffer);
      detectedKey = keyResult.key;
      camelotCode = keyResult.camelot;
    } catch (_) {}

    setDeck(which, (prev) => ({
      ...prev,
      buffer,
      fileName,
      duration: buffer.duration,
      currentTime: 0,
      waveformData,
      hotCues: [null, null, null, null],
      loop: { ...defaultLoop },
      cuePoint: 0,
      beatGrid: [],
      detectedKey,
      camelotCode,
    }));
    offsetRefs.current[which] = 0;
  }, [getCtx, generateWaveform, setDeck, detectKey]);

  const stopSource = useCallback((which: DeckId) => {
    if (sourceRefs.current[which]) {
      try { sourceRefs.current[which]!.stop(); } catch (_) {}
      sourceRefs.current[which] = null;
    }
    if (loopTimeoutRef.current[which]) {
      clearTimeout(loopTimeoutRef.current[which]!);
      loopTimeoutRef.current[which] = null;
    }
  }, []);

  const playDeck = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const state = decks[which];
    if (!state.buffer) return;

    stopSource(which);

    const src = ctx.createBufferSource();
    src.buffer = state.buffer;
    src.playbackRate.value = state.playbackRate;
    connectSourceToStemInput(src, nodesRef.current[which]!, state.stemsEnabled);
    src.onended = () => {
      if (!state.loop.active) {
        setDeck(which, (prev) => ({ ...prev, isPlaying: false }));
        sourceRefs.current[which] = null;
      }
    };

    const offset = offsetRefs.current[which];
    src.start(0, offset);
    startTimeRefs.current[which] = ctx.currentTime - offset / state.playbackRate;
    sourceRefs.current[which] = src;
    setDeck(which, (prev) => ({ ...prev, isPlaying: true }));
  }, [getCtx, decks, stopSource, setDeck, connectSourceToStemInput]);

  const pauseDeck = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const state = decks[which];
    if (sourceRefs.current[which] && state.isPlaying) {
      const elapsed = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
      offsetRefs.current[which] = elapsed;
      stopSource(which);
      setDeck(which, (prev) => ({ ...prev, isPlaying: false, currentTime: elapsed }));
    }
  }, [getCtx, decks, stopSource, setDeck]);

  const setRate = useCallback((which: DeckId, rate: number) => {
    setDeck(which, (prev) => ({ ...prev, playbackRate: rate }));
    if (sourceRefs.current[which]) {
      sourceRefs.current[which]!.playbackRate.value = rate;
    }
  }, [setDeck]);

  const setVolume = useCallback((which: DeckId, vol: number) => {
    setDeck(which, (prev) => ({ ...prev, volume: vol }));
    const nodes = nodesRef.current[which];
    if (nodes && ctxRef.current) {
      nodes.gain.gain.setValueAtTime(vol, ctxRef.current.currentTime);
    }
  }, [setDeck]);

  const setCue = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const state = decks[which];
    let currentPos = offsetRefs.current[which];
    if (state.isPlaying) {
      currentPos = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
    }
    setDeck(which, (prev) => ({ ...prev, cuePoint: currentPos }));
  }, [getCtx, decks, setDeck]);

  const jumpCue = useCallback((which: DeckId) => {
    const state = decks[which];
    const wasPlaying = state.isPlaying;
    if (wasPlaying) stopSource(which);
    offsetRefs.current[which] = state.cuePoint;
    setDeck(which, (prev) => ({ ...prev, currentTime: state.cuePoint, isPlaying: false }));
    if (wasPlaying) {
      setTimeout(() => playDeck(which), 10);
    }
  }, [decks, stopSource, playDeck, setDeck]);

  const seekDeck = useCallback((which: DeckId, time: number) => {
    const state = decks[which];
    const wasPlaying = state.isPlaying;
    if (wasPlaying) stopSource(which);
    offsetRefs.current[which] = time;
    setDeck(which, (prev) => ({ ...prev, currentTime: time, isPlaying: false }));
    if (wasPlaying) {
      setTimeout(() => playDeck(which), 10);
    }
  }, [decks, stopSource, playDeck, setDeck]);

  const setEQ = useCallback((which: DeckId, band: "low" | "mid" | "high", value: number) => {
    setDeck(which, (prev) => ({ ...prev, eq: { ...prev.eq, [band]: value } }));
    const nodes = nodesRef.current[which];
    if (!nodes) return;
    if (band === "low") nodes.eqLow.gain.setValueAtTime(value, ctxRef.current!.currentTime);
    if (band === "mid") nodes.eqMid.gain.setValueAtTime(value, ctxRef.current!.currentTime);
    if (band === "high") nodes.eqHigh.gain.setValueAtTime(value, ctxRef.current!.currentTime);
  }, [setDeck]);

  const setFilter = useCallback((which: DeckId, freq: number, type: "lowpass" | "highpass") => {
    setDeck(which, (prev) => ({
      ...prev,
      fx: { ...prev.fx, filterFreq: freq, filterType: type, filterEnabled: true },
    }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.filter.type = type;
    nodes.filter.frequency.setValueAtTime(freq, ctxRef.current.currentTime);
  }, [setDeck]);

  const toggleFilter = useCallback((which: DeckId, enabled: boolean) => {
    setDeck(which, (prev) => ({ ...prev, fx: { ...prev.fx, filterEnabled: enabled } }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    if (!enabled) {
      nodes.filter.type = "lowpass";
      nodes.filter.frequency.setValueAtTime(20000, ctxRef.current.currentTime);
    }
  }, [setDeck]);

  const setReverb = useCallback((which: DeckId, mix: number, enabled: boolean) => {
    setDeck(which, (prev) => ({ ...prev, fx: { ...prev.fx, reverbMix: mix, reverbEnabled: enabled } }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.reverbWet.gain.setValueAtTime(enabled ? mix : 0, ctxRef.current.currentTime);
    nodes.reverbDry.gain.setValueAtTime(enabled ? 1 - mix * 0.5 : 1, ctxRef.current.currentTime);
  }, [setDeck]);

  const setDelay = useCallback((which: DeckId, time: number, feedback: number, enabled: boolean) => {
    setDeck(which, (prev) => ({
      ...prev,
      fx: { ...prev.fx, delayTime: time, delayFeedback: feedback, delayEnabled: enabled },
    }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    nodes.delayNode.delayTime.setValueAtTime(time, ctxRef.current.currentTime);
    nodes.delayFeedback.gain.setValueAtTime(enabled ? feedback : 0, ctxRef.current.currentTime);
    nodes.delayWet.gain.setValueAtTime(enabled ? 0.5 : 0, ctxRef.current.currentTime);
  }, [setDeck]);

  const setHotCue = useCallback((which: DeckId, index: number) => {
    const ctx = getCtx();
    const state = decks[which];
    let pos = offsetRefs.current[which];
    if (state.isPlaying) {
      pos = (ctx.currentTime - startTimeRefs.current[which]) * state.playbackRate;
    }
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
    const labels = ["1", "2", "3", "4"];
    setDeck(which, (prev) => {
      const newHotCues = [...prev.hotCues];
      if (newHotCues[index]) {
        newHotCues[index] = null;
      } else {
        newHotCues[index] = { position: pos, label: labels[index], color: colors[index] };
      }
      return { ...prev, hotCues: newHotCues };
    });
  }, [getCtx, decks, setDeck]);

  const setAutoHotCues = useCallback((which: DeckId, data: Float32Array, sampleRate: number, bpm: number) => {
    const landmarks = detectLandmarks(data, sampleRate, bpm);
    setDeck(which, (prev) => ({ ...prev, hotCues: landmarks }));
  }, [setDeck]);

  const jumpHotCue = useCallback((which: DeckId, index: number) => {
    const state = decks[which];
    const cue = state.hotCues[index];
    if (!cue) return;
    seekDeck(which, cue.position);
  }, [decks, seekDeck]);

  const toggleLoop = useCallback((which: DeckId, beats: number, bpm: number) => {
    const ctx = getCtx();
    const state = decks[which];

    if (state.loop.active && state.loop.beats === beats) {
      setDeck(which, (prev) => ({ ...prev, loop: { ...prev.loop, active: false } }));
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

    setDeck(which, (prev) => ({
      ...prev,
      loop: { active: true, start: currentPos, end: loopEnd, beats },
    }));
  }, [getCtx, decks, setDeck]);

  const setBeatGrid = useCallback((which: DeckId, bpm: number) => {
    const state = decks[which];
    if (!state.buffer) return;
    const grid = generateBeatGrid(bpm, state.duration);
    setDeck(which, (prev) => ({ ...prev, beatGrid: grid }));
  }, [decks, setDeck]);

  const applyCrossfadeCurve = useCallback((val: number, curve: CrossfaderCurve): [number, number] => {
    if (curve === "smooth") {
      return [1 - val, val];
    } else if (curve === "club") {
      const t = val;
      const curved = t * t * (3 - 2 * t);
      return [1 - curved, curved];
    } else {
      const a = val < 0.48 ? 1 : val > 0.52 ? 0 : 1 - (val - 0.48) / 0.04;
      const b = val > 0.52 ? 1 : val < 0.48 ? 0 : (val - 0.48) / 0.04;
      return [a, b];
    }
  }, []);

  const updateCrossfadeAB = useCallback((val: number) => {
    setCrossfadeAB(val);
    setCrossfaderCurveAB(prev => {
      if (ctxRef.current && nodesRef.current.A && nodesRef.current.B) {
        const [gainA, gainB] = applyCrossfadeCurve(val, prev);
        nodesRef.current.A.gain.gain.setValueAtTime(gainA, ctxRef.current.currentTime);
        nodesRef.current.B.gain.gain.setValueAtTime(gainB, ctxRef.current.currentTime);
      }
      return prev;
    });
  }, [applyCrossfadeCurve]);

  const updateCrossfadeCD = useCallback((val: number) => {
    setCrossfadeCD(val);
    setCrossfaderCurveCD(prev => {
      if (ctxRef.current && nodesRef.current.C && nodesRef.current.D) {
        const [gainC, gainD] = applyCrossfadeCurve(val, prev);
        nodesRef.current.C.gain.gain.setValueAtTime(gainC, ctxRef.current.currentTime);
        nodesRef.current.D.gain.gain.setValueAtTime(gainD, ctxRef.current.currentTime);
      }
      return prev;
    });
  }, [applyCrossfadeCurve]);

  const setCrossfaderCurve = useCallback((pair: "AB" | "CD", curve: CrossfaderCurve) => {
    if (pair === "AB") {
      setCrossfaderCurveAB(curve);
      setCrossfadeAB(prev => {
        if (ctxRef.current && nodesRef.current.A && nodesRef.current.B) {
          const [gainA, gainB] = applyCrossfadeCurve(prev, curve);
          nodesRef.current.A.gain.gain.setValueAtTime(gainA, ctxRef.current.currentTime);
          nodesRef.current.B.gain.gain.setValueAtTime(gainB, ctxRef.current.currentTime);
        }
        return prev;
      });
    } else {
      setCrossfaderCurveCD(curve);
      setCrossfadeCD(prev => {
        if (ctxRef.current && nodesRef.current.C && nodesRef.current.D) {
          const [gainC, gainD] = applyCrossfadeCurve(prev, curve);
          nodesRef.current.C.gain.gain.setValueAtTime(gainC, ctxRef.current.currentTime);
          nodesRef.current.D.gain.gain.setValueAtTime(gainD, ctxRef.current.currentTime);
        }
        return prev;
      });
    }
  }, [applyCrossfadeCurve]);

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    recordingStartRef.current = Date.now();
    setRecordingElapsed(0);
    setIsRecording(true);
    setRecordingUrl(null);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingElapsed(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 1000);
  }, [getCtx]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
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
    updateCrossfadeAB(0);

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
          updateCrossfadeAB(curve);
        }, i * stepDuration);
      }

      setTimeout(() => {
        pauseDeck("A");
        updateCrossfadeAB(1);
        setRate("B", 1);
        setAutoMixing(false);
      }, transitionDuration + 200);
    }, leadInMs);
  }, [autoMixing, playDeck, pauseDeck, updateCrossfadeAB, setRate]);

  const setStemGain = useCallback((which: DeckId, stem: "bass" | "mid" | "high" | "vocals", gain: number) => {
    const stemKey = `${stem}Gain` as keyof StemsState;
    setDeck(which, (prev) => ({ ...prev, stems: { ...prev.stems, [stemKey]: gain } }));
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) return;
    const t = ctxRef.current.currentTime;
    switch (stem) {
      case "bass": nodes.stems.bassGain.gain.setValueAtTime(gain, t); break;
      case "mid": nodes.stems.midGain.gain.setValueAtTime(gain, t); break;
      case "high": nodes.stems.highGain.gain.setValueAtTime(gain, t); break;
      case "vocals": nodes.stems.vocalsGain.gain.setValueAtTime(gain, t); break;
    }
  }, [setDeck]);

  const toggleStems = useCallback((which: DeckId, enabled: boolean) => {
    const state = decks[which];
    const nodes = nodesRef.current[which];
    if (!nodes || !ctxRef.current) {
      setDeck(which, (prev) => ({ ...prev, stemsEnabled: enabled }));
      return;
    }

    const src = sourceRefs.current[which];
    if (src && state.isPlaying) {
      try { src.disconnect(); } catch (_) {}
      if (enabled) {
        src.connect(nodes.stems.input);
      } else {
        src.connect(nodes.stems.bypass);
      }
    }

    setDeck(which, (prev) => ({ ...prev, stemsEnabled: enabled }));
  }, [decks, setDeck]);

  const setMasterPreset = useCallback((preset: string) => {
    const p = MASTER_PRESETS[preset];
    if (!p) return;
    const newState: MasteringState = { ...mastering, ...p, preset };
    setMastering(newState);
    applyCompressorSettings(newState);
  }, [mastering, applyCompressorSettings]);

  const setMasterGain = useCallback((gain: number) => {
    setMastering(prev => ({ ...prev, masterGain: gain }));
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setValueAtTime(gain, ctxRef.current.currentTime);
    }
  }, []);

  const beatSync = useCallback((target: DeckId, reference: DeckId, targetBpm: number, referenceBpm: number) => {
    if (!targetBpm || !referenceBpm || targetBpm <= 0 || referenceBpm <= 0) return;
    const ratio = referenceBpm / targetBpm;
    const newRate = ratio;
    setRate(target, newRate);
  }, [setRate]);

  const spinBack = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const src = sourceRefs.current[which];
    const state = decks[which];
    if (!src || !state.isPlaying || state.transitionEffect) return;

    setDeck(which, (prev) => ({ ...prev, transitionEffect: "spinback" }));

    const now = ctx.currentTime;
    const currentRate = state.playbackRate;
    src.playbackRate.cancelScheduledValues(now);
    src.playbackRate.setValueAtTime(currentRate, now);
    src.playbackRate.linearRampToValueAtTime(-0.5, now + 0.5);

    setTimeout(() => {
      stopSource(which);
      setDeck(which, (prev) => ({
        ...prev,
        isPlaying: false,
        transitionEffect: null,
        playbackRate: 1,
      }));
      const currentOffset = offsetRefs.current[which];
      offsetRefs.current[which] = Math.max(0, currentOffset);
    }, 600);
  }, [getCtx, decks, setDeck, stopSource]);

  const brake = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const src = sourceRefs.current[which];
    const state = decks[which];
    if (!src || !state.isPlaying || state.transitionEffect) return;

    setDeck(which, (prev) => ({ ...prev, transitionEffect: "brake" }));

    const now = ctx.currentTime;
    const currentRate = state.playbackRate;
    src.playbackRate.cancelScheduledValues(now);
    src.playbackRate.setValueAtTime(currentRate, now);
    src.playbackRate.exponentialRampToValueAtTime(0.001, now + 1.5);

    setTimeout(() => {
      stopSource(which);
      setDeck(which, (prev) => ({
        ...prev,
        isPlaying: false,
        transitionEffect: null,
        playbackRate: 1,
      }));
    }, 1600);
  }, [getCtx, decks, setDeck, stopSource]);

  const echoOut = useCallback((which: DeckId) => {
    const ctx = getCtx();
    const nodes = nodesRef.current[which];
    const state = decks[which];
    if (!nodes || !state.isPlaying || state.transitionEffect) return;

    setDeck(which, (prev) => ({ ...prev, transitionEffect: "echoout" }));

    const now = ctx.currentTime;
    nodes.delayNode.delayTime.setValueAtTime(0.3, now);
    nodes.delayFeedback.gain.setValueAtTime(0.6, now);
    nodes.delayWet.gain.setValueAtTime(0.7, now);

    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
    nodes.gain.gain.linearRampToValueAtTime(0, now + 2);

    setTimeout(() => {
      stopSource(which);
      nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
      nodes.gain.gain.setValueAtTime(state.volume, ctx.currentTime);
      nodes.delayFeedback.gain.setValueAtTime(state.fx.delayEnabled ? state.fx.delayFeedback : 0, ctx.currentTime);
      nodes.delayWet.gain.setValueAtTime(state.fx.delayEnabled ? 0.5 : 0, ctx.currentTime);
      nodes.delayNode.delayTime.setValueAtTime(state.fx.delayTime, ctx.currentTime);
      setDeck(which, (prev) => ({
        ...prev,
        isPlaying: false,
        transitionEffect: null,
      }));
    }, 2200);
  }, [getCtx, decks, setDeck, stopSource]);

  const setTalkoverDuck = useCallback((active: boolean) => {
    const ctx = ctxRef.current;
    const gain = talkoverGainRef.current;
    if (!ctx || !gain) return;
    const t = ctx.currentTime;
    if (active) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.15);
    } else {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(1.0, t + 0.6);
    }
  }, []);

  const getMasterInputNode = useCallback((): AudioNode | null => {
    return masterRef.current;
  }, []);

  const tapBpm = useCallback((which: DeckId) => {
    const now = performance.now();
    const taps = tapTimesRef.current[which];
    const MAX_GAP = 3000;
    if (taps.length > 0 && now - taps[taps.length - 1] > MAX_GAP) {
      tapTimesRef.current[which] = [];
    }
    tapTimesRef.current[which] = [...tapTimesRef.current[which], now];
    const updatedTaps = tapTimesRef.current[which];
    if (updatedTaps.length < 2) return;
    const intervals: number[] = [];
    for (let i = 1; i < updatedTaps.length; i++) {
      intervals.push(updatedTaps[i] - updatedTaps[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg);
    setDeck(which, (prev) => ({ ...prev, bpm }));
  }, [setDeck]);

  const hypeWindowRef = useRef<number[]>([]);
  const lastHypeUpdateRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const ctx = ctxRef.current;
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(update);
        return;
      }

      ALL_DECKS.forEach((w) => {
        setDecks((prev) => {
          const deckState = prev[w];
          const src = sourceRefs.current[w];
          const nodes = nodesRef.current[w];

          if (!deckState.isPlaying || !src || !nodes) return prev;
          const elapsed = (ctx.currentTime - startTimeRefs.current[w]) * deckState.playbackRate;
          const clampedTime = Math.min(elapsed, deckState.duration);

          if (deckState.loop.active && clampedTime >= deckState.loop.end) {
            offsetRefs.current[w] = deckState.loop.start;
            stopSource(w);
            const newSrc = ctx.createBufferSource();
            newSrc.buffer = deckState.buffer;
            newSrc.playbackRate.value = deckState.playbackRate;
            if (deckState.stemsEnabled) {
              newSrc.connect(nodes.stems.input);
            } else {
              newSrc.connect(nodes.stems.bypass);
            }
            newSrc.start(0, deckState.loop.start);
            startTimeRefs.current[w] = ctx.currentTime - deckState.loop.start / deckState.playbackRate;
            sourceRefs.current[w] = newSrc;
          }

          const freqData = new Uint8Array(nodes.analyzer.frequencyBinCount);
          nodes.analyzer.getByteFrequencyData(freqData);
          let rms = 0;
          for (let i = 0; i < freqData.length; i++) rms += freqData[i] * freqData[i];
          rms = Math.sqrt(rms / freqData.length) / 255;

          const data = new Float32Array(nodes.analyzer.fftSize);
          nodes.analyzer.getFloatTimeDomainData(data);

          const updatedDeck = { ...deckState, currentTime: clampedTime, analyzerData: data, vuLevel: rms };
          return { ...prev, [w]: updatedDeck };
        });
      });

      const now = performance.now();
      if (masterAnalyzerRef.current && now - lastHypeUpdateRef.current > 500) {
        lastHypeUpdateRef.current = now;
        const freqData = new Uint8Array(masterAnalyzerRef.current.frequencyBinCount);
        masterAnalyzerRef.current.getByteFrequencyData(freqData);
        let masterRms = 0;
        for (let i = 0; i < freqData.length; i++) masterRms += freqData[i] * freqData[i];
        masterRms = Math.sqrt(masterRms / freqData.length) / 255;
        hypeWindowRef.current = [...hypeWindowRef.current.slice(-9), masterRms];
        const avg = hypeWindowRef.current.reduce((a, b) => a + b, 0) / hypeWindowRef.current.length;
        setHypeLevel(avg);
      }

      animFrameRef.current = requestAnimationFrame(update);
    };
    animFrameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stopSource]);

  return {
    decks,
    crossfadeAB, crossfadeCD,
    crossfaderCurveAB, crossfaderCurveCD, setCrossfaderCurve,
    hypeLevel,
    isRecording, recordingUrl, recordingElapsed, autoMixing,
    samplePads, mastering,
    loadFile, playDeck, pauseDeck,
    setRate, setVolume,
    setCue, jumpCue, seekDeck,
    setEQ, setFilter, toggleFilter, setReverb, setDelay,
    setHotCue, setAutoHotCues, jumpHotCue, toggleLoop,
    setBeatGrid, tapBpm,
    updateCrossfadeAB, updateCrossfadeCD,
    startRecording, stopRecording,
    autoMix, getCtx,
    playSample, loadSampleFile,
    setStemGain, toggleStems,
    setMasterPreset, setMasterGain,
    beatSync, spinBack, brake, echoOut,
    setTalkoverDuck, getMasterInputNode,
  };
}
