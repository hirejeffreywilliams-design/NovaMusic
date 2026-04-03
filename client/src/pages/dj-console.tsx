import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { DeckPanel } from "@/components/deck-panel";
import { MixerPanel } from "@/components/mixer-panel";
import { SoundboardPanel } from "@/components/soundboard-panel";
import { VisualizerPanel } from "@/components/visualizer-panel";
import { FXPanel } from "@/components/fx-panel";
import { CrowdHub } from "@/components/crowd-hub";
import { ArrowLeft, Disc3, Maximize2, Minimize2, LayoutGrid, Waves, Music, Sliders, Mic2, Settings, Sparkles, Circle, Download, Users } from "lucide-react";
import { Microphone } from "@/components/microphone";
import { AudioOutput } from "@/components/audio-output";
import { PlatformSync } from "@/components/platform-sync";
import { AIDJAssistant } from "@/components/ai-dj-assistant";
import { useMutation } from "@tanstack/react-query";
import { getStableDjId } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ViewTab = "decks" | "soundboard" | "visualizer" | "fx" | "mic" | "ai" | "crowd" | "settings";

interface ActiveEvent {
  id: string;
  code: string;
  name: string;
  djId: string;
  djName: string;
}

function EventSetup({ onEventCreated }: { onEventCreated: (event: ActiveEvent) => void }) {
  const { toast } = useToast();
  const [eventName, setEventName] = useState("");
  const [djName, setDjName] = useState("");
  const [battleMode, setBattleMode] = useState(false);
  const [deckADjName, setDeckADjName] = useState("");
  const [deckBDjName, setDeckBDjName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/events", {
      name: eventName,
      djId: getStableDjId(),
      djName: djName || "DJ",
      battleMode,
      deckADjName: battleMode ? deckADjName : undefined,
      deckBDjName: battleMode ? deckBDjName : undefined,
    }).then(r => r.json()),
    onSuccess: (data: any) => {
      toast({ title: "Event created!", description: `Code: ${data.code}` });
      onEventCreated(data as ActiveEvent);
    },
    onError: () => toast({ title: "Failed to create event", variant: "destructive" }),
  });

  return (
    <div className="max-w-md mx-auto pt-6 space-y-4 px-4">
      <div className="text-center space-y-1">
        <div className="text-2xl">🎪</div>
        <h2 className="text-base font-black text-white">Create a Live Event</h2>
        <p className="text-xs text-white/40">Share the event code with your crowd</p>
      </div>
      <div className="space-y-3">
        <input
          value={eventName}
          onChange={e => setEventName(e.target.value)}
          placeholder="Event name (e.g. Friday Night Party)..."
          className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#bf5af2]"
          data-testid="input-event-name"
        />
        <input
          value={djName}
          onChange={e => setDjName(e.target.value)}
          placeholder="Your DJ name..."
          className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#bf5af2]"
          data-testid="input-dj-name"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={battleMode} onChange={e => setBattleMode(e.target.checked)} className="w-4 h-4 rounded" data-testid="checkbox-battle-mode" />
          <span className="text-xs text-white/60">⚔️ Enable DJ Battle Mode</span>
        </label>
        {battleMode && (
          <div className="space-y-2 pl-6">
            <input
              value={deckADjName}
              onChange={e => setDeckADjName(e.target.value)}
              placeholder="Deck A DJ name..."
              className="w-full px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-[#ff2d78]"
              data-testid="input-deck-a-dj-name"
            />
            <input
              value={deckBDjName}
              onChange={e => setDeckBDjName(e.target.value)}
              placeholder="Deck B DJ name..."
              className="w-full px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-[#0af]"
              data-testid="input-deck-b-dj-name"
            />
          </div>
        )}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!eventName.trim() || createMutation.isPending}
          className="w-full py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78)", boxShadow: "0 0 25px rgba(191,90,242,0.3)" }}
          data-testid="button-create-event"
        >
          {createMutation.isPending ? "Creating..." : "🚀 Create Event & Go Live"}
        </button>
      </div>
    </div>
  );
}

function formatRecTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DJConsole() {
  const [, navigate] = useLocation();
  const engine = useAudioEngine();
  const [activeTab, setActiveTab] = useState<ViewTab>("decks");
  const [deckLayout, setDeckLayout] = useState<2 | 4>(2);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeDeck, setActiveDeck] = useState<DeckId>("A");
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const tabs: { id: ViewTab; label: string; icon: any; badge?: number }[] = [
    { id: "decks", label: "Decks", icon: LayoutGrid },
    { id: "fx", label: "FX Rack", icon: Sliders },
    { id: "soundboard", label: "Pads", icon: Music },
    { id: "visualizer", label: "Visual", icon: Waves },
    { id: "mic", label: "Mic", icon: Mic2 },
    { id: "ai", label: "AI DJ", icon: Sparkles },
    { id: "crowd", label: "Crowd Hub", icon: Users },
    { id: "settings", label: "Setup", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0519] flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#bf5af2]/10 bg-[#0a0519]/95 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <Disc3 className="w-6 h-6 text-[#bf5af2] animate-vinyl-spin" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider neon-text-purple" data-testid="text-console-title">DJ HYBRID PRO</span>
            {activeEvent && (
              <span className="text-[9px] text-[#30d158] font-bold">🔴 LIVE: {activeEvent.name} · {activeEvent.code}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? "bg-[#bf5af2] text-white shadow-lg"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              } ${id === "crowd" && activeEvent ? "ring-1 ring-[#30d158]/50" : ""}`}
              style={activeTab === id ? { boxShadow: "0 0 15px rgba(191,90,242,0.4)" } : {}}
              data-testid={`tab-${id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{label}</span>
              {id === "crowd" && activeEvent && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse absolute -top-0.5 -right-0.5" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
            <button
              onClick={() => engine.isRecording ? engine.stopRecording() : engine.startRecording()}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                engine.isRecording ? "bg-[#ff453a] text-white" : "text-[#ff453a] hover:bg-[#ff453a]/20"
              }`}
              style={engine.isRecording ? { animation: "pulse 1.5s infinite", boxShadow: "0 0 12px rgba(255,69,58,0.5)" } : {}}
              data-testid="button-rec-header"
            >
              <Circle className={`w-3 h-3 ${engine.isRecording ? "text-white" : "text-[#ff453a]"}`} fill={engine.isRecording ? "white" : "none"} />
              <span>{engine.isRecording ? formatRecTime(engine.recordingElapsed || 0) : "REC"}</span>
            </button>
            {engine.recordingUrl && (
              <a
                href={engine.recordingUrl}
                download="dj-session.webm"
                className="p-1 rounded-md hover:bg-white/10 transition-all"
                title="Download Recording"
                data-testid="link-download-recording-header"
              >
                <Download className="w-3 h-3 text-white/40" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
            <span className="text-[9px] text-white/30">Active</span>
            {(["A", "B"] as DeckId[]).map(id => (
              <button
                key={id}
                onClick={() => setActiveDeck(id)}
                className={`w-5 h-5 rounded-full text-[9px] font-black transition-all ${
                  activeDeck === id ? "bg-[#bf5af2] text-white" : "bg-white/10 text-white/40 hover:bg-white/20"
                }`}
                style={activeDeck === id ? { boxShadow: "0 0 8px rgba(191,90,242,0.5)" } : {}}
                data-testid={`button-active-deck-${id}`}
              >
                {id}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{ background: "rgba(255,214,10,0.1)", color: "#ffd60a", border: "1px solid rgba(255,214,10,0.2)" }}
            data-testid="button-upgrade"
          >
            ⭐ Upgrade
          </button>
          <button
            onClick={() => setDeckLayout(deckLayout === 2 ? 4 : 2)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all hidden sm:block"
            data-testid="button-toggle-deck-layout"
          >
            {deckLayout === 2 ? "4 Decks" : "2 Decks"}
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-fullscreen">
            {fullscreen ? <Minimize2 className="w-4 h-4 text-white/60" /> : <Maximize2 className="w-4 h-4 text-white/60" />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-2 md:p-3">
        {activeTab === "decks" && (
          <div className="h-full flex flex-col gap-2">
            <div className={`flex-1 grid gap-2 ${deckLayout === 4 ? "grid-cols-2 grid-rows-2" : "grid-cols-2 grid-rows-1"}`}>
              <DeckPanel deckId="A" engine={engine} color="#bf5af2" />
              <DeckPanel deckId="B" engine={engine} color="#0af" />
              {deckLayout === 4 && (
                <>
                  <DeckPanel deckId="C" engine={engine} color="#ff2d78" />
                  <DeckPanel deckId="D" engine={engine} color="#30d158" />
                </>
              )}
            </div>
            <MixerPanel engine={engine} deckLayout={deckLayout} />
          </div>
        )}

        {activeTab === "fx" && <FXPanel engine={engine} />}
        {activeTab === "soundboard" && <SoundboardPanel engine={engine} />}
        {activeTab === "visualizer" && <VisualizerPanel engine={engine} />}
        {activeTab === "mic" && (
          <div className="max-w-lg mx-auto pt-4 overflow-y-auto pb-4">
            <Microphone
              audioCtxGetter={engine.getCtx}
              getMasterNode={engine.getMasterInputNode}
              onDuckRequest={engine.setTalkoverDuck}
              engine={engine}
              activeDeck={activeDeck}
            />
          </div>
        )}
        {activeTab === "ai" && (
          <div className="max-w-lg mx-auto pt-4 overflow-y-auto pb-4">
            <AIDJAssistant
              deckA={{
                fileName: engine.decks.A.fileName,
                isPlaying: engine.decks.A.isPlaying,
                bpm: engine.decks.A.bpm || undefined,
                key: engine.decks.A.detectedKey || undefined,
                duration: engine.decks.A.duration,
                buffer: engine.decks.A.buffer,
              }}
              deckB={{
                fileName: engine.decks.B.fileName,
                isPlaying: engine.decks.B.isPlaying,
                bpm: engine.decks.B.bpm || undefined,
                key: engine.decks.B.detectedKey || undefined,
                duration: engine.decks.B.duration,
                buffer: engine.decks.B.buffer,
              }}
              queue={[]}
              engine={engine}
            />
          </div>
        )}

        {activeTab === "crowd" && (
          <div className="max-w-2xl mx-auto pt-2 pb-4 overflow-y-auto h-full">
            {!activeEvent ? (
              <EventSetup onEventCreated={ev => { setActiveEvent(ev); }} />
            ) : (
              <CrowdHub
                eventId={activeEvent.id}
                eventCode={activeEvent.code}
                eventName={activeEvent.name}
                djId={activeEvent.djId}
                djName={activeEvent.djName}
              />
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-lg mx-auto pt-4 space-y-5 overflow-y-auto pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">🔵 Bluetooth & Audio Output</h3>
              <AudioOutput audioCtxGetter={engine.getCtx} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">🎵 Music Sources & Platforms</h3>
              <PlatformSync />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">🔗 Quick Links</h3>
              <a href="/pricing" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:bg-white/5" style={{ background: "rgba(255,214,10,0.06)", border: "1px solid rgba(255,214,10,0.15)" }}>
                ⭐ Subscription Plans
              </a>
              <a href="/admin" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:bg-white/5" style={{ background: "rgba(191,90,242,0.06)", border: "1px solid rgba(191,90,242,0.15)" }}>
                🔐 Admin Dashboard
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
