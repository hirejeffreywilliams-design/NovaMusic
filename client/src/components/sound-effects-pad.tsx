import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Upload, Play, Square, Trash2, Plus, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SoundClip {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  blob: Blob | null;
  pitchShift: boolean;
  reverbEnabled: boolean;
  color: string;
}

interface StoredClip {
  name: string;
  base64: string | null;
  mimeType: string | null;
  pitchShift: boolean;
  reverbEnabled: boolean;
}

interface ClipPack {
  name: string;
  clips: StoredClip[];
}

const LS_KEY = "dj_sound_packs_v2";

function savePersistPacks(packs: ClipPack[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(packs));
  } catch {}
}

function loadPersistedPacks(): ClipPack[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ClipPack[];
  } catch {}
  return [];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

const PAD_COLORS = [
  "#ff2d78", "#ff9500", "#ffd60a", "#30d158",
  "#0af", "#bf5af2", "#64d2ff", "#ff453a",
  "#ff6b6b", "#c8ff00", "#00ffc8", "#ff00aa",
];

function trimSilence(buffer: AudioBuffer, threshold = 0.01): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }
  let startSample = 0;
  outer1: for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      if (Math.abs(channels[ch][i]) > threshold) { startSample = i; break outer1; }
    }
  }
  let endSample = length - 1;
  outer2: for (let i = length - 1; i >= startSample; i--) {
    for (let ch = 0; ch < numChannels; ch++) {
      if (Math.abs(channels[ch][i]) > threshold) { endSample = i; break outer2; }
    }
  }
  const trimmedLength = Math.max(1, endSample - startSample + 1);
  const offCtx = new OfflineAudioContext(numChannels, trimmedLength, sampleRate);
  const trimmed = offCtx.createBuffer(numChannels, trimmedLength, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    trimmed.copyToChannel(channels[ch].slice(startSample, endSample + 1), ch);
  }
  return trimmed;
}

function createReverbImpulse(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 1.5;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
  }
  return buf;
}

function WaveformCanvas({ buffer, color }: { buffer: AudioBuffer | null; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!buffer) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const idx = x * step + j;
        if (idx < data.length) max = Math.max(max, Math.abs(data[idx]));
      }
      const y = ((1 - max) / 2) * canvas.height;
      const h = max * canvas.height;
      if (x === 0) ctx.moveTo(x, y + h / 2);
      else ctx.lineTo(x, y + h / 2);
    }
    ctx.stroke();
  }, [buffer, color]);
  return <canvas ref={canvasRef} width={100} height={28} className="w-full rounded" style={{ display: "block" }} />;
}

interface SoundEffectsPadProps {
  audioCtxGetter: () => AudioContext;
  getMasterNode?: () => AudioNode | null;
}

export function SoundEffectsPad({ audioCtxGetter, getMasterNode }: SoundEffectsPadProps) {
  const { toast } = useToast();
  const [clips, setClips] = useState<SoundClip[]>(
    Array.from({ length: 8 }, (_, i) => ({
      id: `pad-${i}`,
      name: `Pad ${i + 1}`,
      buffer: null,
      blob: null,
      pitchShift: false,
      reverbEnabled: false,
      color: PAD_COLORS[i % PAD_COLORS.length],
    }))
  );
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const [editingPad, setEditingPad] = useState<string | null>(null);
  const [showPackSave, setShowPackSave] = useState(false);
  const [packName, setPackName] = useState("");
  const [savedPacks, setSavedPacks] = useState<ClipPack[]>(() => loadPersistedPacks());
  const [showPacks, setShowPacks] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  const decodeBlob = useCallback(async (blob: Blob): Promise<AudioBuffer> => {
    const ctx = audioCtxGetter();
    const ab = await blob.arrayBuffer();
    return ctx.decodeAudioData(ab);
  }, [audioCtxGetter]);

  const startRecording = useCallback(async (padId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        try {
          const rawBuffer = await decodeBlob(blob);
          const buffer = trimSilence(rawBuffer);
          setClips(prev => prev.map(c =>
            c.id === padId ? { ...c, buffer, blob } : c
          ));
          toast({ title: "Clip recorded!", description: "Tap the pad to play." });
        } catch {
          toast({ title: "Could not decode recording", variant: "destructive" });
        }
        setRecording(null);
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(padId);
    } catch {
      toast({ title: "Mic access denied", variant: "destructive" });
    }
  }, [decodeBlob, toast]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const padId = uploadTargetRef.current;
    if (!file || !padId) return;
    const blob = new Blob([file], { type: file.type });
    decodeBlob(blob).then(rawBuffer => {
      const buffer = trimSilence(rawBuffer);
      const nameParts = file.name.split(".");
      nameParts.pop();
      const name = nameParts.join(".").slice(0, 12);
      setClips(prev => prev.map(c =>
        c.id === padId ? { ...c, buffer, blob, name } : c
      ));
      toast({ title: "Clip loaded!", description: name });
    }).catch(() => {
      toast({ title: "Could not decode audio file", variant: "destructive" });
    });
    e.target.value = "";
  }, [decodeBlob, toast]);

  const playClip = useCallback((padId: string) => {
    const clip = clips.find(c => c.id === padId);
    if (!clip?.buffer) return;
    const ctx = audioCtxGetter();
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.8;

    let chain: AudioNode = gainNode;

    if (clip.pitchShift) {
      const hiShelf = ctx.createBiquadFilter();
      hiShelf.type = "highshelf";
      hiShelf.frequency.value = 1000;
      hiShelf.gain.value = 6;
      const loShelf = ctx.createBiquadFilter();
      loShelf.type = "lowshelf";
      loShelf.frequency.value = 500;
      loShelf.gain.value = -4;
      gainNode.connect(hiShelf);
      hiShelf.connect(loShelf);
      chain = loShelf;
    }

    if (clip.reverbEnabled) {
      const convolver = ctx.createConvolver();
      convolver.buffer = createReverbImpulse(ctx);
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      const dry = ctx.createGain(); dry.gain.value = 0.65;
      chain.connect(dry);
      chain.connect(convolver);
      convolver.connect(wet);
      const out = ctx.createGain();
      dry.connect(out);
      wet.connect(out);
      chain = out;
    }

    const master = getMasterNode ? getMasterNode() : null;
    chain.connect(master || ctx.destination);
    src.connect(gainNode);
    src.start();

    setActiveClip(padId);
    const dur = Math.min(clip.buffer.duration, 5);
    setTimeout(() => setActiveClip(c => c === padId ? null : c), dur * 1000 + 200);
  }, [clips, audioCtxGetter, getMasterNode]);

  const deleteClip = useCallback((padId: string) => {
    setClips(prev => prev.map(c =>
      c.id === padId ? { ...c, buffer: null, blob: null, name: `Pad ${parseInt(c.id.split("-")[1]) + 1}` } : c
    ));
    setEditingPad(null);
  }, []);

  const toggleFX = useCallback((padId: string, fx: "pitchShift" | "reverbEnabled") => {
    setClips(prev => prev.map(c =>
      c.id === padId ? { ...c, [fx]: !c[fx] } : c
    ));
  }, []);

  const savePack = useCallback(async () => {
    if (!packName.trim()) return;
    const storedClips = await Promise.all(clips.map(async c => {
      if (!c.blob) return { name: c.name, base64: null, mimeType: null, pitchShift: c.pitchShift, reverbEnabled: c.reverbEnabled };
      try {
        const base64 = await blobToBase64(c.blob);
        return { name: c.name, base64, mimeType: c.blob.type || "audio/webm", pitchShift: c.pitchShift, reverbEnabled: c.reverbEnabled };
      } catch {
        return { name: c.name, base64: null, mimeType: null, pitchShift: c.pitchShift, reverbEnabled: c.reverbEnabled };
      }
    }));
    const pack: ClipPack = { name: packName.trim(), clips: storedClips };
    setSavedPacks(prev => {
      const updated = [...prev, pack];
      savePersistPacks(updated);
      return updated;
    });
    setShowPackSave(false);
    setPackName("");
    toast({ title: `Pack "${pack.name}" saved!`, description: "8 clip slots saved & persisted." });
  }, [clips, packName, toast]);

  const loadPack = useCallback(async (pack: ClipPack) => {
    const newClips = await Promise.all(pack.clips.map(async (pc, i) => {
      const base = clips[i];
      if (!pc.base64 || !pc.mimeType) return { ...base, name: pc.name, pitchShift: pc.pitchShift, reverbEnabled: pc.reverbEnabled };
      try {
        const blob = base64ToBlob(pc.base64, pc.mimeType);
        const buffer = await decodeBlob(blob);
        return { ...base, name: pc.name, buffer, blob, pitchShift: pc.pitchShift, reverbEnabled: pc.reverbEnabled };
      } catch {
        return { ...base, name: pc.name, pitchShift: pc.pitchShift, reverbEnabled: pc.reverbEnabled };
      }
    }));
    setClips(newClips);
    setShowPacks(false);
    toast({ title: `Pack "${pack.name}" loaded!` });
  }, [clips, decodeBlob, toast]);

  const deletePack = useCallback((i: number) => {
    setSavedPacks(prev => {
      const updated = prev.filter((_, idx) => idx !== i);
      savePersistPacks(updated);
      return updated;
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎛️</span>
          <span className="text-sm font-black text-white/80">Sound Pad</span>
          <span className="text-[9px] text-white/30">8 custom clips</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowPacks(v => !v)}
            className="px-2 py-1 rounded-lg text-[9px] font-bold text-white/50 border border-white/10 hover:bg-white/5"
            data-testid="button-soundpad-packs"
          >
            {showPacks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Packs
          </button>
          <button
            onClick={() => setShowPackSave(v => !v)}
            className="px-2 py-1 rounded-lg text-[9px] font-bold text-[#bf5af2] border border-[#bf5af2]/30 hover:bg-[#bf5af2]/10"
            data-testid="button-soundpad-save-pack"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showPackSave && (
        <div className="flex gap-2">
          <input
            value={packName}
            onChange={e => setPackName(e.target.value)}
            placeholder="Pack name (e.g. Hype Pack)..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-[#bf5af2]"
            data-testid="input-pack-name"
          />
          <button
            onClick={savePack}
            disabled={!packName.trim()}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
            style={{ background: "rgba(191,90,242,0.3)", border: "1px solid rgba(191,90,242,0.4)" }}
            data-testid="button-pack-save-confirm"
          >Save</button>
        </div>
      )}

      {showPacks && savedPacks.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Saved Packs (persisted across sessions)</div>
          {savedPacks.map((pack, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => loadPack(pack)}
                className="flex-1 text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-white/5 border border-white/10"
                data-testid={`button-load-pack-${i}`}
              >
                📦 {pack.name} <span className="text-white/30 ml-1">({pack.clips.filter(c => c.base64).length} clips)</span>
              </button>
              <button
                onClick={() => deletePack(i)}
                className="p-1.5 rounded-lg text-[#ff453a]/60 hover:text-[#ff453a] border border-[#ff453a]/20 hover:bg-[#ff453a]/10"
                title="Delete pack"
                data-testid={`button-delete-pack-${i}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showPacks && savedPacks.length === 0 && (
        <div className="text-xs text-white/25 text-center py-2">No saved packs yet. Save your clips to reuse them!</div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {clips.map((clip) => {
          const isActive = activeClip === clip.id;
          const isRecordingThis = recording === clip.id;
          const isEditing = editingPad === clip.id;
          return (
            <div key={clip.id} className="space-y-1">
              <button
                onClick={() => {
                  if (!clip.buffer) return;
                  playClip(clip.id);
                }}
                onContextMenu={e => { e.preventDefault(); setEditingPad(isEditing ? null : clip.id); }}
                className="w-full rounded-2xl p-2 flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{
                  background: isActive ? `${clip.color}40` : clip.buffer ? `${clip.color}12` : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${isActive ? clip.color : clip.buffer ? clip.color + "40" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: isActive ? `0 0 20px ${clip.color}60` : "none",
                  minHeight: 80,
                  opacity: !clip.buffer ? 0.5 : 1,
                }}
                data-testid={`button-soundpad-${clip.id}`}
              >
                {clip.buffer ? (
                  <WaveformCanvas buffer={clip.buffer} color={clip.color} />
                ) : (
                  <div className="w-full h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-[9px] text-white/20">empty</span>
                  </div>
                )}
                <span className="text-[8px] font-black truncate w-full text-center" style={{ color: clip.buffer ? clip.color : "rgba(255,255,255,0.2)" }}>
                  {clip.name}
                </span>
              </button>

              {isEditing && (
                <div className="rounded-xl p-2 space-y-1" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <button
                    onClick={() => {
                      if (isRecordingThis) stopRecording();
                      else startRecording(clip.id);
                    }}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-white transition-all"
                    style={{ background: isRecordingThis ? "rgba(255,69,58,0.4)" : "rgba(255,45,120,0.2)", border: "1px solid rgba(255,45,120,0.3)" }}
                    data-testid={`button-record-${clip.id}`}
                  >
                    {isRecordingThis ? <Square className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    {isRecordingThis ? "Stop" : "Record"}
                  </button>
                  <button
                    onClick={() => { uploadTargetRef.current = clip.id; fileInputRef.current?.click(); }}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold text-white/70 border border-white/15 hover:bg-white/5"
                    data-testid={`button-upload-${clip.id}`}
                  >
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  {clip.buffer && (
                    <>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleFX(clip.id, "pitchShift")}
                          className="flex-1 py-1 rounded text-[8px] font-bold transition-all"
                          style={{ background: clip.pitchShift ? "rgba(0,170,255,0.3)" : "rgba(255,255,255,0.05)", border: `1px solid ${clip.pitchShift ? "rgba(0,170,255,0.5)" : "rgba(255,255,255,0.1)"}`, color: clip.pitchShift ? "#0af" : "rgba(255,255,255,0.4)" }}
                          data-testid={`button-pitch-${clip.id}`}
                        >Pitch+</button>
                        <button
                          onClick={() => toggleFX(clip.id, "reverbEnabled")}
                          className="flex-1 py-1 rounded text-[8px] font-bold transition-all"
                          style={{ background: clip.reverbEnabled ? "rgba(191,90,242,0.3)" : "rgba(255,255,255,0.05)", border: `1px solid ${clip.reverbEnabled ? "rgba(191,90,242,0.5)" : "rgba(255,255,255,0.1)"}`, color: clip.reverbEnabled ? "#bf5af2" : "rgba(255,255,255,0.4)" }}
                          data-testid={`button-reverb-${clip.id}`}
                        >Reverb</button>
                      </div>
                      <button
                        onClick={() => deleteClip(clip.id)}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded text-[8px] font-bold text-[#ff453a] border border-[#ff453a]/20 hover:bg-[#ff453a]/10"
                        data-testid={`button-delete-clip-${clip.id}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Clear
                      </button>
                    </>
                  )}
                </div>
              )}

              {!isEditing && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingPad(clip.id)}
                    className="flex-1 py-1 rounded text-[8px] text-white/30 border border-white/10 hover:bg-white/5 flex items-center justify-center"
                    data-testid={`button-edit-pad-${clip.id}`}
                  >
                    {clip.buffer ? "edit" : <Plus className="w-2.5 h-2.5" />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {recording && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,69,58,0.15)", border: "1px solid rgba(255,69,58,0.3)" }}>
          <div className="w-2 h-2 rounded-full bg-[#ff453a] animate-pulse" />
          <span className="text-xs text-[#ff453a] font-bold">Recording... Tap Stop on the pad to finish.</span>
        </div>
      )}

      <div className="text-[9px] text-white/20 text-center">Long-press or tap Edit (•) to load clips. Tap pad to trigger.</div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
