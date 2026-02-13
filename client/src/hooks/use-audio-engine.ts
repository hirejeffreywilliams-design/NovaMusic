import { useRef, useState, useCallback, useEffect } from "react";

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
}

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
};

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sourceRefs = useRef<{ A: AudioBufferSourceNode | null; B: AudioBufferSourceNode | null }>({ A: null, B: null });
  const gainRefs = useRef<{ A: GainNode | null; B: GainNode | null }>({ A: null, B: null });
  const analyzerRefs = useRef<{ A: AnalyserNode | null; B: AnalyserNode | null }>({ A: null, B: null });
  const startTimeRefs = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const offsetRefs = useRef<{ A: number; B: number }>({ A: 0, B: 0 });
  const animFrameRef = useRef<number>(0);

  const [deckA, setDeckA] = useState<DeckState>({ ...defaultDeckState });
  const [deckB, setDeckB] = useState<DeckState>({ ...defaultDeckState });
  const [crossfade, setCrossfade] = useState(0.5);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);

      gainRefs.current.A = ctxRef.current.createGain();
      gainRefs.current.B = ctxRef.current.createGain();
      analyzerRefs.current.A = ctxRef.current.createAnalyser();
      analyzerRefs.current.B = ctxRef.current.createAnalyser();

      analyzerRefs.current.A.fftSize = 2048;
      analyzerRefs.current.B.fftSize = 2048;

      gainRefs.current.A.gain.setValueAtTime(0.5, ctxRef.current.currentTime);
      gainRefs.current.B.gain.setValueAtTime(0.5, ctxRef.current.currentTime);

      gainRefs.current.A.connect(analyzerRefs.current.A);
      gainRefs.current.B.connect(analyzerRefs.current.B);
      analyzerRefs.current.A.connect(masterRef.current);
      analyzerRefs.current.B.connect(masterRef.current);

      destRef.current = ctxRef.current.createMediaStreamDestination();
      masterRef.current.connect(destRef.current);
    }
    return ctxRef.current;
  }, []);

  const generateWaveform = useCallback((buffer: AudioBuffer): number[] => {
    const rawData = buffer.getChannelData(0);
    const samples = 200;
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
    return data.map((d) => d / max);
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
    }));
    offsetRefs.current[which] = 0;
  }, [getCtx, generateWaveform]);

  const stopSource = useCallback((which: "A" | "B") => {
    if (sourceRefs.current[which]) {
      try {
        sourceRefs.current[which]!.stop();
      } catch (_) {}
      sourceRefs.current[which] = null;
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
    src.connect(gainRefs.current[which]!);
    src.onended = () => {
      setter((prev) => ({ ...prev, isPlaying: false }));
      sourceRefs.current[which] = null;
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
    if (gainRefs.current[which]) {
      gainRefs.current[which]!.gain.setValueAtTime(vol, getCtx().currentTime);
    }
  }, [getCtx]);

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

  const updateCrossfade = useCallback((val: number) => {
    setCrossfade(val);
    if (ctxRef.current && gainRefs.current.A && gainRefs.current.B) {
      const volA = (1 - val);
      const volB = val;
      gainRefs.current.A.gain.setValueAtTime(volA, ctxRef.current.currentTime);
      gainRefs.current.B.gain.setValueAtTime(volB, ctxRef.current.currentTime);
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

  const autoMix = useCallback(() => {
    if (autoMixing) return;
    setAutoMixing(true);

    playDeck("A");
    updateCrossfade(0);

    setTimeout(() => {
      playDeck("B");
      const steps = 80;
      const duration = 8000;
      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          updateCrossfade(i / steps);
        }, i * (duration / steps));
      }
      setTimeout(() => {
        pauseDeck("A");
        updateCrossfade(1);
        setAutoMixing(false);
      }, duration + 200);
    }, 1000);
  }, [autoMixing, playDeck, pauseDeck, updateCrossfade]);

  useEffect(() => {
    const update = () => {
      const ctx = ctxRef.current;
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(update);
        return;
      }

      ["A", "B"].forEach((which) => {
        const w = which as "A" | "B";
        const setter = w === "A" ? setDeckA : setDeckB;
        const src = sourceRefs.current[w];
        const analyzer = analyzerRefs.current[w];

        setter((prev) => {
          if (!prev.isPlaying || !src) return prev;
          const elapsed = (ctx.currentTime - startTimeRefs.current[w]) * prev.playbackRate;
          const data = new Float32Array(analyzer?.fftSize || 2048);
          analyzer?.getFloatTimeDomainData(data);
          return { ...prev, currentTime: Math.min(elapsed, prev.duration), analyzerData: data };
        });
      });

      animFrameRef.current = requestAnimationFrame(update);
    };
    animFrameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return {
    deckA,
    deckB,
    crossfade,
    isRecording,
    recordingUrl,
    autoMixing,
    loadFile,
    playDeck,
    pauseDeck,
    setRate,
    setVolume,
    setCue,
    jumpCue,
    seekDeck,
    updateCrossfade,
    startRecording,
    stopRecording,
    autoMix,
    getCtx,
  };
}
