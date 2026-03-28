import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAudioEngine, DeckId } from "@/hooks/use-audio-engine";
import { DeckPanel } from "@/components/deck-panel";
import { MixerPanel } from "@/components/mixer-panel";
import { SoundboardPanel } from "@/components/soundboard-panel";
import { VisualizerPanel } from "@/components/visualizer-panel";
import { FXPanel } from "@/components/fx-panel";
import { ArrowLeft, Disc3, Maximize2, Minimize2, LayoutGrid, Waves, Music, Sliders, Mic2, Settings, Sparkles } from "lucide-react";
import { Microphone } from "@/components/microphone";
import { AudioOutput } from "@/components/audio-output";
import { PlatformSync } from "@/components/platform-sync";
import { AIDJAssistant } from "@/components/ai-dj-assistant";

type ViewTab = "decks" | "soundboard" | "visualizer" | "fx" | "mic" | "ai" | "settings";

export default function DJConsole() {
  const [, navigate] = useLocation();
  const engine = useAudioEngine();
  const [activeTab, setActiveTab] = useState<ViewTab>("decks");
  const [deckLayout, setDeckLayout] = useState<2 | 4>(2);
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const tabs: { id: ViewTab; label: string; icon: any }[] = [
    { id: "decks", label: "Decks", icon: LayoutGrid },
    { id: "fx", label: "FX Rack", icon: Sliders },
    { id: "soundboard", label: "Pads", icon: Music },
    { id: "visualizer", label: "Visual", icon: Waves },
    { id: "mic", label: "Mic", icon: Mic2 },
    { id: "ai", label: "AI DJ", icon: Sparkles },
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
          <span className="text-sm font-bold tracking-wider neon-text-purple" data-testid="text-console-title">DJ HYBRID PRO</span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === id
                  ? "bg-[#bf5af2] text-white shadow-lg"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
              style={activeTab === id ? { boxShadow: "0 0 15px rgba(191,90,242,0.4)" } : {}}
              data-testid={`tab-${id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeckLayout(deckLayout === 2 ? 4 : 2)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
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
          <div className="max-w-md mx-auto pt-4">
            <Microphone audioCtxGetter={engine.getCtx} masterNode={null} />
          </div>
        )}
        {activeTab === "ai" && (
          <div className="max-w-lg mx-auto pt-4 overflow-y-auto pb-4">
            <AIDJAssistant
              deckA={{
                fileName: engine.decks.A.fileName,
                isPlaying: engine.decks.A.isPlaying,
                bpm: undefined,
                key: undefined,
                duration: engine.decks.A.duration,
                buffer: engine.decks.A.buffer,
              }}
              deckB={{
                fileName: engine.decks.B.fileName,
                isPlaying: engine.decks.B.isPlaying,
                bpm: undefined,
                key: undefined,
                duration: engine.decks.B.duration,
                buffer: engine.decks.B.buffer,
              }}
              queue={[]}
              engine={engine}
            />
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
          </div>
        )}
      </main>
    </div>
  );
}
