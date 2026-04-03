import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Radio, Repeat, Trash2, MessageSquare } from "lucide-react";

type DeckId = "A" | "B" | "C" | "D";

interface DJEngine {
  setReverb: (deckId: DeckId, depth: number, active: boolean) => void;
  setDelay: (deckId: DeckId, time: number, feedback: number, active: boolean) => void;
  toggleFilter: (deckId: DeckId, active: boolean) => void;
  setEQ: (deckId: DeckId, band: "low" | "mid" | "high", gain: number) => void;
  decks: Record<DeckId, { isPlaying: boolean; buffer: AudioBuffer | null }>;
  playDeck: (deckId: DeckId) => void;
  pauseDeck: (deckId: DeckId) => void;
}

interface MicrophoneProps {
  audioCtxGetter: () => AudioContext;
  getMasterNode?: () => AudioNode | null;
  masterNode?: AudioNode | null;
  compact?: boolean;
  onDuckRequest?: (duck: boolean) => void;
  engine?: DJEngine;
  activeDeck?: DeckId;
}

interface MicFXBooleans {
  echo: boolean;
  reverb: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
  robot: boolean;
}

interface MicFXNumbers {
  echoDepth: number;
  reverbDepth: number;
}

type MicFXState = MicFXBooleans & MicFXNumbers;

type BooleanFXKey = keyof MicFXBooleans;
type NumberFXKey = keyof MicFXNumbers;

const defaultFX: MicFXState = {
  echo: false,
  reverb: false,
  pitchUp: false,
  pitchDown: false,
  robot: false,
  echoDepth: 0.4,
  reverbDepth: 0.4,
};

function createImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

interface VoiceCommand {
  label: (deck: DeckId) => string;
  action: (engine: DJEngine, deck: DeckId) => void;
}

const ALL_DECK_IDS: DeckId[] = ["A", "B", "C", "D"];

const VOICE_COMMANDS: Record<string, VoiceCommand> = {
  "add reverb": {
    label: (d) => `Reverb ON (Deck ${d})`,
    action: (eng, d) => eng.setReverb(d, 0.4, true),
  },
  "remove reverb": {
    label: (d) => `Reverb OFF (Deck ${d})`,
    action: (eng, d) => eng.setReverb(d, 0.4, false),
  },
  "add echo": {
    label: (d) => `Echo ON (Deck ${d})`,
    action: (eng, d) => eng.setDelay(d, 0.3, 0.4, true),
  },
  "remove echo": {
    label: (d) => `Echo OFF (Deck ${d})`,
    action: (eng, d) => eng.setDelay(d, 0.3, 0.4, false),
  },
  "add filter": {
    label: (d) => `Filter ON (Deck ${d})`,
    action: (eng, d) => eng.toggleFilter(d, true),
  },
  "remove filter": {
    label: (d) => `Filter OFF (Deck ${d})`,
    action: (eng, d) => eng.toggleFilter(d, false),
  },
  "drop the bass": {
    label: (d) => `Bass Boost +6dB (Deck ${d})`,
    action: (eng, d) => eng.setEQ(d, "low", 6),
  },
  "bass off": {
    label: (d) => `Bass Reset (Deck ${d})`,
    action: (eng, d) => eng.setEQ(d, "low", 0),
  },
  "next track": {
    label: (_d) => "Switching to next deck",
    action: (eng, activeDeck) => {
      eng.pauseDeck(activeDeck);
      const others = ALL_DECK_IDS.filter(id => id !== activeDeck && eng.decks[id]?.buffer);
      if (others.length > 0) eng.playDeck(others[0]);
    },
  },
};

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function Microphone({
  audioCtxGetter,
  getMasterNode,
  masterNode: masterNodeProp,
  compact = false,
  onDuckRequest,
  engine,
  activeDeck = "A",
}: MicrophoneProps) {
  const resolveMasterNode = useCallback((): AudioNode | null => {
    if (getMasterNode) return getMasterNode();
    return masterNodeProp ?? null;
  }, [getMasterNode, masterNodeProp]);
  const [isActive, setIsActive] = useState(false);
  const [micGain, setMicGain] = useState(0.8);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fx, setFx] = useState<MicFXState>({ ...defaultFX });
  const [isLooping, setIsLooping] = useState(false);
  const [hasLoop, setHasLoop] = useState(false);
  const [voiceCmdsEnabled, setVoiceCmdsEnabled] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [cmdFeedback, setCmdFeedback] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const fxChainOutputRef = useRef<GainNode | null>(null);
  const fxNodesRef = useRef<AudioNode[]>([]);
  const animRef = useRef<number>(0);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformAnimRef = useRef<number>(0);
  const duckActiveRef = useRef(false);
  const silenceFramesRef = useRef(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const loopSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const buildFXChain = useCallback((ctx: AudioContext, gainNode: GainNode, currentFx: MicFXState): GainNode => {
    fxNodesRef.current.forEach(n => {
      try { n.disconnect(); } catch (_) {}
      if ("stop" in n && typeof (n as AudioScheduledSourceNode).stop === "function") {
        try { (n as AudioScheduledSourceNode).stop(); } catch (_) {}
      }
    });
    fxNodesRef.current = [];

    const output = ctx.createGain();
    output.gain.value = 1;
    fxChainOutputRef.current = output;

    let currentNode: AudioNode = gainNode;

    if (currentFx.pitchUp) {
      const hiShelf = ctx.createBiquadFilter();
      hiShelf.type = "highshelf";
      hiShelf.frequency.value = 1500;
      hiShelf.gain.value = 8;
      const loShelf = ctx.createBiquadFilter();
      loShelf.type = "lowshelf";
      loShelf.frequency.value = 600;
      loShelf.gain.value = -6;
      currentNode.connect(hiShelf);
      hiShelf.connect(loShelf);
      fxNodesRef.current.push(hiShelf, loShelf);
      currentNode = loShelf;
    } else if (currentFx.pitchDown) {
      const loShelf = ctx.createBiquadFilter();
      loShelf.type = "lowshelf";
      loShelf.frequency.value = 600;
      loShelf.gain.value = 8;
      const hiShelf = ctx.createBiquadFilter();
      hiShelf.type = "highshelf";
      hiShelf.frequency.value = 2000;
      hiShelf.gain.value = -8;
      currentNode.connect(loShelf);
      loShelf.connect(hiShelf);
      fxNodesRef.current.push(loShelf, hiShelf);
      currentNode = hiShelf;
    }

    if (currentFx.robot) {
      const osc = ctx.createOscillator();
      osc.frequency.value = 80;
      osc.type = "square";
      const ring = ctx.createGain();
      ring.gain.value = 0;
      osc.connect(ring.gain);
      currentNode.connect(ring);
      osc.start();
      fxNodesRef.current.push(osc, ring);
      currentNode = ring;
    }

    if (currentFx.echo) {
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.3;
      const fb = ctx.createGain();
      fb.gain.value = currentFx.echoDepth;
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      const dry = ctx.createGain();
      dry.gain.value = 0.7;
      currentNode.connect(dry);
      currentNode.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      dry.connect(output);
      wet.connect(output);
      fxNodesRef.current.push(delay, fb, wet, dry);

      if (currentFx.reverb) {
        const convolver = ctx.createConvolver();
        convolver.buffer = createImpulse(ctx, 2, 2);
        const revWet = ctx.createGain();
        revWet.gain.value = currentFx.reverbDepth;
        const revDry = ctx.createGain();
        revDry.gain.value = 1 - currentFx.reverbDepth * 0.5;
        output.connect(revDry);
        output.connect(convolver);
        convolver.connect(revWet);
        const finalOut = ctx.createGain();
        finalOut.gain.value = 1;
        revDry.connect(finalOut);
        revWet.connect(finalOut);
        fxNodesRef.current.push(convolver, revWet, revDry, finalOut);
        fxChainOutputRef.current = finalOut;
        return finalOut;
      }
    } else if (currentFx.reverb) {
      const convolver = ctx.createConvolver();
      convolver.buffer = createImpulse(ctx, 2, 2);
      const wet = ctx.createGain();
      wet.gain.value = currentFx.reverbDepth;
      const dry = ctx.createGain();
      dry.gain.value = 1 - currentFx.reverbDepth * 0.5;
      currentNode.connect(dry);
      currentNode.connect(convolver);
      convolver.connect(wet);
      dry.connect(output);
      wet.connect(output);
      fxNodesRef.current.push(convolver, wet, dry);
    } else {
      currentNode.connect(output);
    }

    return output;
  }, []);

  const startMic = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = audioCtxGetter();
      const resolvedMaster = resolveMasterNode();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = micGain;
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 1024;
      analyzer.smoothingTimeConstant = 0.6;

      source.connect(gain);
      gain.connect(analyzer);

      const fxOutput = buildFXChain(ctx, gain, fx);
      if (resolvedMaster) {
        fxOutput.connect(resolvedMaster);
      } else {
        fxOutput.connect(ctx.destination);
      }

      streamRef.current = stream;
      sourceRef.current = source;
      gainRef.current = gain;
      analyzerRef.current = analyzer;
      setIsActive(true);

      const DUCK_THRESHOLD = 0.04;
      const SILENCE_FRAMES = 10;

      const updateVolume = () => {
        if (!analyzerRef.current) return;
        const data = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const vol = (sum / data.length) / 255;
        setVolume(vol);

        if (onDuckRequest) {
          if (vol > DUCK_THRESHOLD) {
            silenceFramesRef.current = 0;
            if (!duckActiveRef.current) {
              duckActiveRef.current = true;
              onDuckRequest(true);
            }
          } else {
            silenceFramesRef.current++;
            if (duckActiveRef.current && silenceFramesRef.current >= SILENCE_FRAMES) {
              duckActiveRef.current = false;
              onDuckRequest(false);
            }
          }
        }

        animRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const drawWaveform = () => {
        const canvas = waveformCanvasRef.current;
        const analyzerNode = analyzerRef.current;
        if (!canvas || !analyzerNode) {
          waveformAnimRef.current = requestAnimationFrame(drawWaveform);
          return;
        }
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) {
          waveformAnimRef.current = requestAnimationFrame(drawWaveform);
          return;
        }

        const w = canvas.width;
        const h = canvas.height;
        const bufLen = analyzerNode.fftSize;
        const data = new Float32Array(bufLen);
        analyzerNode.getFloatTimeDomainData(data);

        ctx2d.clearRect(0, 0, w, h);
        ctx2d.fillStyle = "rgba(0,0,0,0.4)";
        ctx2d.fillRect(0, 0, w, h);

        ctx2d.beginPath();
        ctx2d.strokeStyle = "#ff2d78";
        ctx2d.lineWidth = 1.5;
        ctx2d.shadowColor = "#ff2d78";
        ctx2d.shadowBlur = 6;

        const sliceW = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const y = ((data[i] + 1) / 2) * h;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += sliceW;
        }
        ctx2d.stroke();
        waveformAnimRef.current = requestAnimationFrame(drawWaveform);
      };
      drawWaveform();
    } catch (_err: unknown) {
      setError("Mic access denied. Please allow microphone in your browser settings.");
    }
  }, [audioCtxGetter, resolveMasterNode, micGain, onDuckRequest, buildFXChain, fx]);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    cancelAnimationFrame(waveformAnimRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
    fxNodesRef.current.forEach(n => {
      try { n.disconnect(); } catch (_) {}
      if ("stop" in n && typeof (n as AudioScheduledSourceNode).stop === "function") {
        try { (n as AudioScheduledSourceNode).stop(); } catch (_) {}
      }
    });
    fxNodesRef.current = [];
    gainRef.current = null;
    analyzerRef.current = null;
    fxChainOutputRef.current = null;
    if (duckActiveRef.current && onDuckRequest) {
      onDuckRequest(false);
      duckActiveRef.current = false;
    }
    setIsActive(false);
    setVolume(0);
  }, [onDuckRequest]);

  const applyFX = useCallback((nextFx: MicFXState) => {
    if (!gainRef.current || !isActive) return;
    const ctx = audioCtxGetter();
    const resolvedMaster = resolveMasterNode();
    const oldOutput = fxChainOutputRef.current;
    if (oldOutput) {
      try { oldOutput.disconnect(); } catch (_) {}
    }
    const newOutput = buildFXChain(ctx, gainRef.current, nextFx);
    if (resolvedMaster) newOutput.connect(resolvedMaster);
    else newOutput.connect(ctx.destination);
  }, [isActive, audioCtxGetter, buildFXChain, resolveMasterNode]);

  const toggleBoolFX = useCallback((key: BooleanFXKey) => {
    setFx(prev => {
      const next: MicFXState = { ...prev, [key]: !prev[key] };
      if (key === "pitchUp" && next.pitchUp) next.pitchDown = false;
      if (key === "pitchDown" && next.pitchDown) next.pitchUp = false;
      applyFX(next);
      return next;
    });
  }, [applyFX]);

  const setNumberFX = useCallback((key: NumberFXKey, value: number) => {
    setFx(prev => {
      const next: MicFXState = { ...prev, [key]: value };
      applyFX(next);
      return next;
    });
  }, [applyFX]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = micGain;
  }, [micGain]);

  const startLoopRecord = useCallback(() => {
    if (!isActive || !streamRef.current) return;
    setIsLooping(true);
    const mr = new MediaRecorder(streamRef.current);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const arrBuf = await blob.arrayBuffer();
      const ctx = audioCtxGetter();
      const buf = await ctx.decodeAudioData(arrBuf);
      const loopSrc = ctx.createBufferSource();
      loopSrc.buffer = buf;
      loopSrc.loop = true;
      const dest: AudioNode = resolveMasterNode() ?? ctx.destination;
      loopSrc.connect(dest);
      loopSrc.start();
      loopSourceRef.current = loopSrc;
      setHasLoop(true);
      setIsLooping(false);
    };
    mr.start();
    recorderRef.current = mr;
  }, [isActive, audioCtxGetter, resolveMasterNode]);

  const stopLoopRecord = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const clearLoop = useCallback(() => {
    if (loopSourceRef.current) {
      try { loopSourceRef.current.stop(); } catch (_) {}
      loopSourceRef.current = null;
    }
    setHasLoop(false);
  }, []);

  const toggleVoiceCommands = useCallback(() => {
    const SpeechRecognitionClass = (
      (window as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
    );
    if (!SpeechRecognitionClass) {
      setCmdFeedback("Voice commands not supported in this browser");
      return;
    }
    if (voiceCmdsEnabled) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      setVoiceCmdsEnabled(false);
      setTranscript("");
      return;
    }
    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) {
          const matchedKey = Object.keys(VOICE_COMMANDS).find(cmd => text.includes(cmd));
          if (matchedKey && engine) {
            const cmd = VOICE_COMMANDS[matchedKey];
            cmd.action(engine, activeDeck);
            setCmdFeedback(cmd.label(activeDeck));
            setTimeout(() => setCmdFeedback(""), 2500);
          }
          setTranscript(text);
        } else {
          setTranscript(text);
        }
      }
    };
    rec.onerror = () => {
      setCmdFeedback("Voice recognition error");
      setVoiceCmdsEnabled(false);
    };
    rec.start();
    recognitionRef.current = rec;
    setVoiceCmdsEnabled(true);
  }, [voiceCmdsEnabled, engine, activeDeck]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(waveformAnimRef.current);
      stopMic();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, [stopMic]);

  const bars = 12;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={isActive ? stopMic : startMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isActive ? "bg-[#ff2d78] animate-neon-pulse" : "bg-white/10 border border-white/20 hover:bg-white/15"
          }`}
          style={isActive ? { boxShadow: "0 0 25px rgba(255,45,120,0.6), 0 0 50px rgba(255,45,120,0.3)" } : {}}
          data-testid="button-mic-toggle"
        >
          {isActive ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white/60" />}
        </button>
        <span className="text-[10px] text-white/50 uppercase tracking-wider">{isActive ? "MIC ON" : "MIC OFF"}</span>
        {isActive && (
          <div className="flex items-end gap-0.5 h-6">
            {Array.from({ length: bars }, (_, i) => {
              const active = volume * bars > i;
              return (
                <div key={i} className="w-1 rounded-full transition-all duration-75" style={{
                  height: `${30 + i * 5}%`,
                  background: active ? (i > 9 ? "#ff453a" : i > 6 ? "#ffd60a" : "#30d158") : "rgba(255,255,255,0.1)",
                }} />
              );
            })}
          </div>
        )}
        {error && <p className="text-[9px] text-[#ff453a] text-center max-w-[120px]">{error}</p>}
      </div>
    );
  }

  const hypeLabel = volume > 0.6 ? "PEAK 🔥" : volume > 0.4 ? "Lit 🎤" : volume > 0.2 ? "Building" : "Ready";

  return (
    <div className="space-y-3">
      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(255,45,120,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[#ff2d78]" />
            <span className="text-sm font-bold text-white/80">Microphone</span>
          </div>
          <button
            onClick={isActive ? stopMic : startMic}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive ? "bg-[#ff2d78] text-white" : "bg-white/10 text-white/60 hover:bg-white/15 border border-white/10"
            }`}
            style={isActive ? { boxShadow: "0 0 15px rgba(255,45,120,0.4)" } : {}}
            data-testid="button-mic-toggle-full"
          >
            {isActive ? "🎙️ Live" : "Tap to Speak"}
          </button>
        </div>

        {isActive && (
          <>
            <canvas
              ref={waveformCanvasRef}
              width={400}
              height={60}
              className="w-full rounded-lg"
              style={{ height: 60 }}
              data-testid="canvas-mic-waveform"
            />
            <div className="flex gap-2 items-end">
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[8px] text-white/30 uppercase">VU</span>
                <div className="w-4 h-20 bg-white/5 rounded-full overflow-hidden flex flex-col-reverse">
                  <div
                    className="w-full rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.min(volume * 100, 100)}%`,
                      background: volume > 0.8 ? "#ff453a" : volume > 0.5 ? "#ffd60a" : "#30d158",
                      boxShadow: `0 0 8px ${volume > 0.8 ? "#ff453a" : volume > 0.5 ? "#ffd60a" : "#30d158"}80`,
                    }}
                    data-testid="meter-mic-vu"
                  />
                </div>
                <span className="text-[8px] text-white/40 font-mono">{Math.round(volume * 100)}</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-end gap-0.5 h-8 bg-black/20 rounded-lg px-2 py-1">
                  {Array.from({ length: 20 }, (_, i) => {
                    const thresh = i / 20;
                    const active = volume > thresh;
                    return (
                      <div key={i} className="flex-1 rounded-full transition-all duration-75" style={{
                        height: `${40 + i * 3}%`,
                        background: active ? (i > 16 ? "#ff453a" : i > 12 ? "#ffd60a" : "#30d158") : "rgba(255,255,255,0.06)",
                      }} />
                    );
                  })}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold" style={{
                    color: volume > 0.6 ? "#ff453a" : volume > 0.3 ? "#ffd60a" : "#30d158",
                  }}>
                    {hypeLabel}
                  </span>
                  {duckActiveRef.current && (
                    <span className="text-[9px] text-[#ff2d78] ml-2">↓ Talkover Active</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <input
                    type="range" min={0} max={2} step={0.05} value={micGain}
                    onChange={(e) => setMicGain(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer slider-neon"
                    data-testid="slider-mic-gain"
                  />
                  <span className="text-[10px] text-white/40 font-mono w-8">{Math.round(micGain * 100)}%</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#30d158] text-center">
              🎙️ Live! Music auto-ducks when you speak (Deck {activeDeck}).
            </p>
          </>
        )}
        {error && <p className="text-[10px] text-[#ff453a] text-center">{error}</p>}
        {!isActive && <p className="text-[10px] text-white/30 text-center">Tap "Speak" — music auto-ducks when you talk!</p>}
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(255,45,120,0.15)" }}>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#ff2d78]" />
          <span className="text-sm font-bold text-white/70">Vocal FX</span>
          {!isActive && <span className="text-[9px] text-white/30 ml-auto">Enable mic first</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["echo", "reverb", "pitchUp", "pitchDown", "robot"] as BooleanFXKey[]).map((key) => {
            const labels: Record<BooleanFXKey, string> = {
              echo: "Echo", reverb: "Reverb", pitchUp: "Pitch ▲", pitchDown: "Pitch ▼", robot: "Robot",
            };
            return (
              <button
                key={key}
                onClick={() => toggleBoolFX(key)}
                disabled={!isActive}
                className={`py-2 rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 ${
                  fx[key] ? "text-white" : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
                style={fx[key] ? { background: "rgba(255,45,120,0.35)", boxShadow: "0 0 12px rgba(255,45,120,0.4)" } : {}}
                data-testid={`button-mic-fx-${key}`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
        {(fx.echo || fx.reverb) && isActive && (
          <div className="space-y-2">
            {fx.echo && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-14">Echo</span>
                <input type="range" min={0.1} max={0.9} step={0.05} value={fx.echoDepth}
                  onChange={(e) => setNumberFX("echoDepth", parseFloat(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
                  data-testid="slider-mic-echo-depth"
                />
              </div>
            )}
            {fx.reverb && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/40 w-14">Reverb</span>
                <input type="range" min={0.1} max={0.9} step={0.05} value={fx.reverbDepth}
                  onChange={(e) => setNumberFX("reverbDepth", parseFloat(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer slider-neon"
                  data-testid="slider-mic-reverb-depth"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(255,45,120,0.15)" }}>
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-[#bf5af2]" />
          <span className="text-sm font-bold text-white/70">Loop Sampler</span>
        </div>
        <div className="flex gap-2">
          {!isLooping && !hasLoop && (
            <button
              onClick={startLoopRecord}
              disabled={!isActive}
              className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-[#bf5af2]/20 text-[#bf5af2] border border-[#bf5af2]/30 hover:bg-[#bf5af2]/30 transition-all disabled:opacity-30"
              data-testid="button-loop-record-start"
            >
              ⏺ Record Loop
            </button>
          )}
          {isLooping && (
            <button
              onClick={stopLoopRecord}
              className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-[#ff453a]/30 text-[#ff453a] border border-[#ff453a]/40 animate-pulse"
              data-testid="button-loop-record-stop"
            >
              ⏹ Stop & Loop
            </button>
          )}
          {hasLoop && (
            <>
              <div className="flex-1 py-2 rounded-xl text-[10px] font-bold text-center bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30 flex items-center justify-center gap-1">
                <Repeat className="w-3 h-3" /> Looping
              </div>
              <button
                onClick={clearLoop}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                data-testid="button-loop-clear"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/40" />
              </button>
            </>
          )}
        </div>
        {!isActive && <p className="text-[9px] text-white/20 text-center">Enable mic to record a loop</p>}
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(0,170,255,0.15)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#0af]" />
            <span className="text-sm font-bold text-white/70">Voice Commands</span>
            <span className="text-[9px] text-white/30">→ Deck {activeDeck}</span>
          </div>
          <button
            onClick={toggleVoiceCommands}
            className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${
              voiceCmdsEnabled ? "bg-[#0af]/30 text-[#0af] border border-[#0af]/40" : "bg-white/5 text-white/30 border border-white/10 hover:text-white/50"
            }`}
            data-testid="button-voice-commands-toggle"
          >
            {voiceCmdsEnabled ? "ON" : "OFF"}
          </button>
        </div>
        {voiceCmdsEnabled && (
          <div className="space-y-2">
            {transcript && (
              <div className="bg-white/5 rounded-lg px-3 py-2 text-[10px] text-white/60 italic min-h-[28px]" data-testid="text-voice-transcript">
                &quot;{transcript}&quot;
              </div>
            )}
            {cmdFeedback && (
              <div className="bg-[#0af]/10 border border-[#0af]/20 rounded-lg px-3 py-2 text-[10px] text-[#0af] font-bold" data-testid="text-voice-feedback">
                ✓ {cmdFeedback}
              </div>
            )}
            {!transcript && !cmdFeedback && (
              <p className="text-[9px] text-white/30 text-center">Listening... try "add reverb", "drop the bass", "add echo"</p>
            )}
            <div className="flex flex-wrap gap-1">
              {Object.keys(VOICE_COMMANDS).slice(0, 5).map(cmd => (
                <span key={cmd} className="text-[8px] bg-white/5 text-white/25 px-1.5 py-0.5 rounded">{cmd}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
