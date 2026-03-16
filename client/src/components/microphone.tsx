import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface MicrophoneProps {
  audioCtxGetter: () => AudioContext;
  masterNode: AudioNode | null;
  compact?: boolean;
}

export function Microphone({ audioCtxGetter, masterNode, compact = false }: MicrophoneProps) {
  const [isActive, setIsActive] = useState(false);
  const [micGain, setMicGain] = useState(0.8);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  const startMic = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = audioCtxGetter();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = micGain;
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;

      source.connect(gain);
      gain.connect(analyzer);
      if (masterNode) {
        gain.connect(masterNode);
      } else {
        gain.connect(ctx.destination);
      }

      streamRef.current = stream;
      sourceRef.current = source;
      gainRef.current = gain;
      analyzerRef.current = analyzer;
      setIsActive(true);

      const updateVolume = () => {
        if (!analyzerRef.current) return;
        const data = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setVolume((sum / data.length) / 255);
        animRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err: any) {
      setError("Mic access denied. Please allow microphone in your browser settings.");
    }
  }, [audioCtxGetter, masterNode, micGain]);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (_) {}
      sourceRef.current = null;
    }
    gainRef.current = null;
    analyzerRef.current = null;
    setIsActive(false);
    setVolume(0);
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = micGain;
    }
  }, [micGain]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      stopMic();
    };
  }, [stopMic]);

  const bars = 12;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={isActive ? stopMic : startMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isActive
              ? "bg-[#ff2d78] animate-neon-pulse"
              : "bg-white/10 border border-white/20 hover:bg-white/15"
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
                <div
                  key={i}
                  className="w-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${30 + i * 5}%`,
                    background: active ? (i > 9 ? "#ff453a" : i > 6 ? "#ffd60a" : "#30d158") : "rgba(255,255,255,0.1)",
                  }}
                />
              );
            })}
          </div>
        )}
        {error && <p className="text-[9px] text-[#ff453a] text-center max-w-[120px]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(255,45,120,0.2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#ff2d78]" />
          <span className="text-sm font-bold text-white/80">Microphone</span>
        </div>
        <button
          onClick={isActive ? stopMic : startMic}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            isActive
              ? "bg-[#ff2d78] text-white"
              : "bg-white/10 text-white/60 hover:bg-white/15 border border-white/10"
          }`}
          style={isActive ? { boxShadow: "0 0 15px rgba(255,45,120,0.4)" } : {}}
          data-testid="button-mic-toggle-full"
        >
          {isActive ? "🎙️ Live" : "Tap to Speak"}
        </button>
      </div>

      {isActive && (
        <>
          <div className="flex items-end gap-1 h-10 justify-center">
            {Array.from({ length: 20 }, (_, i) => {
              const thresh = (i / 20);
              const active = volume > thresh;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${40 + i * 3}%`,
                    background: active
                      ? (i > 16 ? "#ff453a" : i > 12 ? "#ffd60a" : "#30d158")
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Volume2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="range" min={0} max={2} step={0.05} value={micGain}
              onChange={(e) => setMicGain(parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer slider-neon"
              data-testid="slider-mic-gain"
            />
            <span className="text-[10px] text-white/40 font-mono w-8">{Math.round(micGain * 100)}%</span>
          </div>
          <p className="text-[10px] text-[#30d158] text-center">
            🎙️ You're live! Your voice is mixing with the music.
          </p>
        </>
      )}

      {error && (
        <p className="text-[10px] text-[#ff453a] text-center">{error}</p>
      )}

      {!isActive && (
        <p className="text-[10px] text-white/30 text-center">
          Tap "Speak" to talk over the music like a real DJ!
        </p>
      )}
    </div>
  );
}
