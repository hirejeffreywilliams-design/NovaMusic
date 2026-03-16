import { useState, useEffect, useCallback } from "react";
import { Bluetooth, Volume2, RefreshCw, Speaker, Check, Info } from "lucide-react";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
}

interface AudioOutputProps {
  audioCtxGetter: () => AudioContext;
}

export function AudioOutput({ audioCtxGetter }: AudioOutputProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const scanDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const all = await navigator.mediaDevices.enumerateDevices();
      const outputs = all
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || (d.deviceId === "default" ? "System Default" : `Speaker ${d.deviceId.slice(0, 4)}`),
          kind: d.kind,
        }));
      setDevices(outputs);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Allow microphone access to see audio output devices.");
      } else {
        setError("Could not list audio devices.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctx = audioCtxGetter as any;
    if (typeof AudioContext !== "undefined") {
      const testCtx = new AudioContext();
      if (typeof (testCtx as any).setSinkId !== "function") {
        setSupported(false);
      }
      testCtx.close();
    }
    scanDevices();
  }, [scanDevices]);

  const switchOutput = useCallback(async (deviceId: string) => {
    try {
      const ctx = audioCtxGetter();
      if (typeof (ctx as any).setSinkId === "function") {
        await (ctx as any).setSinkId(deviceId);
        setSelectedId(deviceId);
      }
    } catch (err) {
      setError("Could not switch to this device. Try reconnecting it.");
    }
  }, [audioCtxGetter]);

  const isBluetoothDevice = (label: string) =>
    label.toLowerCase().includes("bluetooth") ||
    label.toLowerCase().includes("airpod") ||
    label.toLowerCase().includes("headphone") ||
    label.toLowerCase().includes("wireless") ||
    label.toLowerCase().includes("speaker");

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(0,170,255,0.15)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-[#0af]" />
            <span className="text-sm font-bold text-white/80">Audio Output</span>
          </div>
          <button
            onClick={scanDevices}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
            data-testid="button-refresh-devices"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!supported && (
          <div className="flex items-start gap-2 bg-[#ffd60a]/8 border border-[#ffd60a]/20 rounded-xl px-3 py-2.5">
            <Info className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/50 leading-relaxed">
              Your browser supports automatic Bluetooth routing. Connect your Bluetooth speaker or headphones in your phone's settings and audio will flow there automatically. For best results, use <strong className="text-white/60">Chrome on Android</strong>.
            </p>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-[#ff453a]">{error}</p>
        )}

        {devices.length > 0 && supported ? (
          <div className="space-y-1.5">
            {devices.map((device) => {
              const isBT = isBluetoothDevice(device.label);
              const isSelected = device.deviceId === selectedId;
              return (
                <button
                  key={device.deviceId}
                  onClick={() => switchOutput(device.deviceId)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                    isSelected ? "border-[#0af]/40" : "border-transparent hover:bg-white/5 border-white/5"
                  }`}
                  style={isSelected ? { background: "rgba(0,170,255,0.12)" } : {}}
                  data-testid={`button-audio-device-${device.deviceId}`}
                >
                  {isBT ? (
                    <Bluetooth className="w-4 h-4 text-[#0af] shrink-0" />
                  ) : (
                    <Speaker className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">{device.label}</p>
                    {isBT && <p className="text-[9px] text-[#0af]/60">Bluetooth Device</p>}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0af] shrink-0" />}
                </button>
              );
            })}
          </div>
        ) : devices.length === 0 && !loading && !error ? (
          <p className="text-[10px] text-white/25 text-center py-3">
            No audio devices found. Click refresh to scan again.
          </p>
        ) : null}
      </div>

      <div className="glass-panel rounded-2xl p-4 space-y-3" style={{ borderColor: "rgba(48,209,88,0.15)" }}>
        <div className="flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-[#30d158]" />
          <span className="text-sm font-bold text-white/80">How to Use Bluetooth</span>
        </div>
        <div className="space-y-2">
          {[
            { step: "1", text: "Turn on your Bluetooth speaker or headphones and put them in pairing mode." },
            { step: "2", text: "Go to your phone's Settings → Bluetooth and connect your device." },
            { step: "3", text: "Come back here and press play — the music will go to your Bluetooth device automatically!" },
            { step: "4", text: "If it doesn't switch automatically, tap Refresh above and select your device from the list." },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5"
                style={{ background: "rgba(48,209,88,0.25)", border: "1px solid rgba(48,209,88,0.35)" }}
              >
                {step}
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
