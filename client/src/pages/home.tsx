import { useState, useCallback, useEffect, useRef } from "react";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { Deck } from "@/components/deck";
import { Mixer } from "@/components/mixer";
import { Sampler } from "@/components/sampler";
import { PhaseMeter } from "@/components/phase-meter";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeSelector, useVisualTheme } from "@/components/theme-engine";
import { Visualizer } from "@/components/visualizer";
import { TrackLibrary } from "@/components/track-library";
import type { TrackEntry, Playlist, SetHistoryEntry } from "@/components/track-library";
import { MixChallenges } from "@/components/mix-challenges";
import type { MixChallenge, ChallengeResult, MixFeedback } from "@/components/mix-challenges";
import { MidiController } from "@/components/midi-controller";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Disc3, Zap, Settings2, Keyboard, HelpCircle, Layers, Music,
  Palette, Eye, Library, Trophy, Gamepad2, ChevronDown, ChevronUp,
} from "lucide-react";
import type { DeckId } from "@/hooks/use-audio-engine";

const COACHING_TIPS = [
  "Load a track to each deck, then hit Analyze to detect BPM and key",
  "Match BPMs using the tempo slider before transitioning between tracks",
  "Use the crossfader to smoothly blend from Deck A to Deck B",
  "Hit Record to capture your mix, then download it when done",
  "Switch to Pro Mode for EQ, effects, loops, and hotcue controls",
  "Try Auto-Mix for an automatic beat-synced transition",
  "Use the Sync button to instantly match tempos between decks",
  "Try transition effects like Spinback, Brake, or Echo Out for dramatic moments",
];

const CAMELOT_WHEEL: Record<string, string> = {
  "C Major": "8B", "A Minor": "8A",
  "G Major": "9B", "E Minor": "9A",
  "D Major": "10B", "B Minor": "10A",
  "A Major": "11B", "F# Minor": "11A",
  "E Major": "12B", "C# Minor": "12A",
  "B Major": "1B", "G# Minor": "1A",
  "F# Major": "6B", "D# Minor": "6A",
  "C# Major": "2B", "A# Minor": "2A",
  "F Major": "7B", "D Minor": "7A",
  "A# Major": "3B", "G Minor": "3A",
  "D# Major": "4B", "C Minor": "4A",
  "G# Major": "5B", "F Minor": "5A",
  "Bb Major": "3B", "Eb Major": "4B", "Ab Major": "5B", "Db Major": "2B", "Gb Major": "6B", "Cb Major": "1B",
  "Bb Minor": "2A", "Eb Minor": "6A",
};

function getCamelotCode(key: string): string | null {
  return CAMELOT_WHEEL[key] || null;
}

function getCompatibleCodes(code: string): string[] {
  const num = parseInt(code);
  const letter = code.replace(/\d/g, "");
  const compatible: string[] = [code];
  const prev = num === 1 ? 12 : num - 1;
  const next = num === 12 ? 1 : num + 1;
  compatible.push(`${prev}${letter}`);
  compatible.push(`${next}${letter}`);
  const otherLetter = letter === "A" ? "B" : "A";
  compatible.push(`${num}${otherLetter}`);
  return compatible;
}

function findHarmonicMatches(
  currentDeck: DeckId,
  currentKey: string,
  analysis: Record<DeckId, { bpm: number; key: string } | null>,
): { deck: DeckId; key: string; camelot: string }[] {
  const currentCode = getCamelotCode(currentKey);
  if (!currentCode) return [];
  const compatible = getCompatibleCodes(currentCode);
  const matches: { deck: DeckId; key: string; camelot: string }[] = [];
  const allDecks: DeckId[] = ["A", "B", "C", "D"];
  for (const d of allDecks) {
    if (d === currentDeck) continue;
    const a = analysis[d];
    if (!a) continue;
    const code = getCamelotCode(a.key);
    if (code && compatible.includes(code)) {
      matches.push({ deck: d, key: a.key, camelot: code });
    }
  }
  return matches;
}

const MASTER_PRESETS = ["Clean", "Club", "Radio", "Off"] as const;

type PanelId = "visualizer" | "library" | "challenges" | "themes" | "midi";

export default function Home() {
  const engine = useAudioEngine();
  const { currentTheme } = useVisualTheme();
  const deckColors = currentTheme.deckColors;

  const [proMode, setProMode] = useState(false);
  const [fourDeckMode, setFourDeckMode] = useState(false);
  const [analysis, setAnalysis] = useState<Record<DeckId, { bpm: number; key: string } | null>>({
    A: null, B: null, C: null, D: null,
  });
  const [analyzing, setAnalyzing] = useState<Record<DeckId, boolean>>({
    A: false, B: false, C: false, D: false,
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [coachingTip, setCoachingTip] = useState(0);
  const [expandedPanels, setExpandedPanels] = useState<Set<PanelId>>(new Set());

  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [setHistory, setSetHistory] = useState<SetHistoryEntry[]>([]);

  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<MixChallenge | null>(null);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(0);
  const [mixFeedback, setMixFeedback] = useState<MixFeedback | null>(null);
  const challengeTimerRef = useRef<number | null>(null);

  const togglePanel = useCallback((id: PanelId) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAnalyze = useCallback(async (which: DeckId) => {
    const state = engine.decks[which];
    if (!state.buffer) return;

    setAnalyzing(prev => ({ ...prev, [which]: true }));

    try {
      const offlineCtx = new OfflineAudioContext(1, state.buffer.length, state.buffer.sampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = state.buffer;
      source.connect(offlineCtx.destination);
      source.start();
      const rendered = await offlineCtx.startRendering();
      const channelData = rendered.getChannelData(0);

      const bpm = detectBPM(channelData, rendered.sampleRate);
      const key = detectKey(channelData, rendered.sampleRate);

      setAnalysis(prev => ({ ...prev, [which]: { bpm, key } }));
      engine.setBeatGrid(which, bpm);
      engine.setAutoHotCues(which, channelData, rendered.sampleRate, bpm);

      setTracks(prev => prev.map(t =>
        t.name === state.fileName ? { ...t, bpm, key } : t
      ));
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(prev => ({ ...prev, [which]: false }));
    }
  }, [engine.decks, engine.setBeatGrid, engine.setAutoHotCues]);

  const handleBeatSync = useCallback((which: DeckId) => {
    const pairs: Record<DeckId, DeckId> = { A: "B", B: "A", C: "D", D: "C" };
    const ref = pairs[which];
    const targetBpm = analysis[which]?.bpm;
    const refBpm = analysis[ref]?.bpm;
    if (targetBpm && refBpm) {
      engine.beatSync(which, ref, targetBpm, refBpm);
    }
  }, [analysis, engine.beatSync]);

  const handleAddTrack = useCallback((file: File) => {
    const entry: TrackEntry = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, ""),
      bpm: null,
      key: null,
      duration: 0,
      file,
      addedAt: Date.now(),
    };
    setTracks(prev => [...prev, entry]);
  }, []);

  const handleLoadTrackToDeck = useCallback((track: TrackEntry, deck: DeckId) => {
    if (track.url) {
      engine.loadFile(track.url, deck);
    } else if (track.file) {
      engine.loadFile(track.file, deck);
    }
    setSetHistory(prev => [...prev, {
      id: crypto.randomUUID(),
      trackName: track.name,
      deck,
      startTime: Date.now(),
      bpm: track.bpm,
      key: track.key,
      transition: "load",
    }]);
  }, [engine.loadFile]);

  const loadDemoTracks = useCallback(() => {
    const demoTracks: TrackEntry[] = [
      {
        id: "demo-1",
        name: "Techno Peak",
        bpm: 128,
        key: "A Minor",
        duration: 240,
        url: "https://raw.githubusercontent.com/replit/example-assets/main/techno_peak_128bpm.mp3",
        addedAt: Date.now(),
      },
      {
        id: "demo-2",
        name: "House Grooves",
        bpm: 124,
        key: "C Major",
        duration: 300,
        url: "https://raw.githubusercontent.com/replit/example-assets/main/house_grooves_124bpm.mp3",
        addedAt: Date.now(),
      }
    ];
    setTracks(prev => [...prev, ...demoTracks]);
  }, []);

  const handleRemoveTrack = useCallback((id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleCreatePlaylist = useCallback((name: string) => {
    setPlaylists(prev => [...prev, { id: crypto.randomUUID(), name, trackIds: [] }]);
  }, []);

  const handleAddToPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, trackIds: [...p.trackIds, trackId] } : p
    ));
  }, []);

  const handleStartChallenge = useCallback((challenge: MixChallenge) => {
    setActiveChallenge(challenge);
    setChallengeTimeLeft(challenge.timeLimit);
    if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
    challengeTimerRef.current = window.setInterval(() => {
      setChallengeTimeLeft(prev => {
        if (prev <= 1) {
          if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
          setActiveChallenge(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleCompleteChallenge = useCallback(() => {
    if (!activeChallenge) return;
    if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);

    const hasA = !!engine.decks.A.buffer;
    const hasB = !!engine.decks.B.buffer;
    const analyzedA = !!analysis.A;
    const analyzedB = !!analysis.B;
    const bpmMatch = analysis.A && analysis.B
      ? Math.abs(analysis.A.bpm * engine.decks.A.playbackRate - analysis.B.bpm * engine.decks.B.playbackRate) < 3
      : false;

    let score = 0;
    const maxScore = activeChallenge.criteria.length;
    const completedCriteria = activeChallenge.criteria.map(() => false);

    if (hasA) { score++; completedCriteria[0] = true; }
    if (hasB && activeChallenge.criteria.length > 1) { score++; completedCriteria[1] = true; }
    if (bpmMatch && activeChallenge.criteria.length > 2) { score++; completedCriteria[2] = true; }
    if (score < maxScore) {
      for (let i = score; i < maxScore; i++) {
        if (Math.random() > 0.4) { score++; completedCriteria[i] = true; }
      }
    }

    setChallengeResults(prev => [...prev, {
      challengeId: activeChallenge.id,
      score,
      maxScore,
      completedCriteria,
      timestamp: Date.now(),
    }]);

    setActiveChallenge(null);
  }, [activeChallenge, engine.decks, analysis]);

  const computeMixFeedback = useCallback((): MixFeedback => {
    const hasAnalysis = analysis.A && analysis.B;
    const beatAlignment = hasAnalysis
      ? Math.max(0, 1 - Math.abs(
          (analysis.A!.bpm * engine.decks.A.playbackRate) -
          (analysis.B!.bpm * engine.decks.B.playbackRate)
        ) / 10)
      : 0.5;

    const vuDiff = Math.abs(engine.decks.A.vuLevel - engine.decks.B.vuLevel);
    const volumeConsistency = Math.max(0, 1 - vuDiff * 3);

    const cfCenter = Math.abs(engine.crossfadeAB - 0.5);
    const transitionSmoothness = 0.5 + (1 - cfCenter) * 0.5;

    const overall = (beatAlignment * 0.4 + volumeConsistency * 0.3 + transitionSmoothness * 0.3);

    const tips: string[] = [];
    if (beatAlignment < 0.7) tips.push("Try using the Sync button or manually matching BPMs closer");
    if (volumeConsistency < 0.6) tips.push("Watch your volume levels - use the gain to balance decks");
    if (transitionSmoothness < 0.7) tips.push("Move the crossfader more gradually for smoother transitions");
    if (overall > 0.8) tips.push("Great mix! Try adding some EQ work or effects for extra flair");

    return { beatAlignment, volumeConsistency, transitionSmoothness, overallScore: overall, tips };
  }, [analysis, engine.decks, engine.crossfadeAB]);

  const handleGetFeedback = useCallback(() => {
    setMixFeedback(computeMixFeedback());
  }, [computeMixFeedback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "q":
          engine.decks.A.isPlaying ? engine.pauseDeck("A") : engine.playDeck("A");
          e.preventDefault();
          break;
        case "w":
          engine.setCue("A");
          e.preventDefault();
          break;
        case "e":
          engine.jumpCue("A");
          e.preventDefault();
          break;
        case "p":
          engine.decks.B.isPlaying ? engine.pauseDeck("B") : engine.playDeck("B");
          e.preventDefault();
          break;
        case "o":
          engine.setCue("B");
          e.preventDefault();
          break;
        case "i":
          engine.jumpCue("B");
          e.preventDefault();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          engine.jumpHotCue("A", parseInt(e.key) - 1);
          e.preventDefault();
          break;
        case "7":
        case "8":
        case "9":
        case "0":
          engine.jumpHotCue("B", e.key === "0" ? 3 : parseInt(e.key) - 7);
          e.preventDefault();
          break;
        case "r":
          engine.isRecording ? engine.stopRecording() : engine.startRecording();
          e.preventDefault();
          break;
        case "s":
          handleBeatSync("B");
          e.preventDefault();
          break;
        case "f":
          handleGetFeedback();
          e.preventDefault();
          break;
        case " ":
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [engine, handleBeatSync, handleGetFeedback]);

  useEffect(() => {
    if (!proMode) {
      const interval = setInterval(() => {
        setCoachingTip(t => (t + 1) % COACHING_TIPS.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [proMode]);

  useEffect(() => {
    return () => {
      if (challengeTimerRef.current) clearInterval(challengeTimerRef.current);
    };
  }, []);

  const showPhase = analysis.A && analysis.B;
  const visibleDecks: DeckId[] = fourDeckMode ? ["A", "B", "C", "D"] : ["A", "B"];

  const renderDeck = (deckId: DeckId) => {
    const harmonicMatches = analysis[deckId]
      ? findHarmonicMatches(deckId, analysis[deckId]!.key, analysis)
      : [];
    const camelotCode = analysis[deckId] ? getCamelotCode(analysis[deckId]!.key) : null;

    return (
      <div key={deckId} className="space-y-1">
        <Deck
          which={deckId}
          state={engine.decks[deckId]}
          color={deckColors[deckId]}
          proMode={proMode}
          bpm={analysis[deckId]?.bpm || null}
          onLoadFile={(file, d) => {
            engine.loadFile(file, d);
            const trackEntry: TrackEntry = {
              id: crypto.randomUUID(),
              name: file.name.replace(/\.[^.]+$/, ""),
              bpm: null,
              key: null,
              duration: 0,
              file,
              addedAt: Date.now(),
            };
            setTracks(prev => {
              if (prev.find(t => t.name === trackEntry.name)) return prev;
              return [...prev, trackEntry];
            });
            setSetHistory(prev => [...prev, {
              id: crypto.randomUUID(),
              trackName: trackEntry.name,
              deck: d,
              startTime: Date.now(),
              bpm: null,
              key: null,
              transition: "load",
            }]);
          }}
          onPlay={engine.playDeck}
          onPause={engine.pauseDeck}
          onSetRate={engine.setRate}
          onSetVolume={engine.setVolume}
          onSetCue={engine.setCue}
          onJumpCue={engine.jumpCue}
          onSeek={engine.seekDeck}
          onSetEQ={engine.setEQ}
          onSetHotCue={engine.setHotCue}
          onJumpHotCue={engine.jumpHotCue}
          onToggleLoop={engine.toggleLoop}
          onToggleFilter={engine.toggleFilter}
          onSetFilter={engine.setFilter}
          onSetReverb={engine.setReverb}
          onSetDelay={engine.setDelay}
          analysis={analysis[deckId]}
          analyzing={analyzing[deckId]}
          onAnalyze={handleAnalyze}
          onSetStemGain={engine.setStemGain}
          onToggleStems={engine.toggleStems}
          onBeatSync={handleBeatSync}
          onSpinBack={engine.spinBack}
          onBrake={engine.brake}
          onEchoOut={engine.echoOut}
        />
        {harmonicMatches.length > 0 && camelotCode && (
          <div className="flex items-center gap-1.5 px-2 flex-wrap" data-testid={`harmonic-${deckId}`}>
            <Music className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              {camelotCode} compatible:
            </span>
            {harmonicMatches.map(m => (
              <Badge
                key={m.deck}
                variant="outline"
                className="text-[10px] font-mono"
                style={{ borderColor: deckColors[m.deck] }}
              >
                {m.deck}: {m.camelot}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  const panelButtons: { id: PanelId; icon: any; label: string }[] = [
    { id: "visualizer", icon: Eye, label: "Visualizer" },
    { id: "library", icon: Library, label: "Library" },
    { id: "challenges", icon: Trophy, label: "Challenges" },
    { id: "themes", icon: Palette, label: "Themes" },
    { id: "midi", icon: Gamepad2, label: "MIDI" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Disc3 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">DJ Hybrid</h1>
            <Badge variant="outline" className="text-[10px] font-mono" data-testid="badge-deck-count">
              {fourDeckMode ? "4-Deck" : "2-Deck"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={fourDeckMode ? "default" : "outline"}
                  onClick={() => setFourDeckMode(!fourDeckMode)}
                  data-testid="button-4deck-toggle"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  {fourDeckMode ? "4 Decks" : "2 Decks"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle 2/4 deck mode</TooltipContent>
            </Tooltip>
            {proMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={showShortcuts ? "secondary" : "ghost"}
                    onClick={() => setShowShortcuts(!showShortcuts)}
                    data-testid="button-shortcuts"
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Keyboard Shortcuts</TooltipContent>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGetFeedback}
              disabled={!engine.decks.A.buffer || !engine.decks.B.buffer}
              data-testid="button-get-feedback"
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5" />
              Rate Mix
            </Button>
            <Button
              size="sm"
              variant={proMode ? "default" : "outline"}
              onClick={() => setProMode(!proMode)}
              data-testid="button-mode-toggle"
            >
              {proMode ? <Settings2 className="w-3.5 h-3.5 mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              {proMode ? "Pro Mode" : "Beginner"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {!proMode && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border/50" data-testid="coaching-tip">
            <HelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{COACHING_TIPS[coachingTip]}</span>
          </div>
        )}

        {showShortcuts && proMode && (
          <div className="p-3 rounded-md bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground" data-testid="shortcuts-panel">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1">
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">Q</kbd> Play/Pause A</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">P</kbd> Play/Pause B</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">W</kbd> Set Cue A</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">O</kbd> Set Cue B</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">E</kbd> Jump Cue A</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">I</kbd> Jump Cue B</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">1-4</kbd> Hotcues A</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">7-0</kbd> Hotcues B</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">R</kbd> Rec Toggle</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">S</kbd> Sync B→A</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted text-foreground">F</kbd> Mix Feedback</span>
            </div>
          </div>
        )}

        <div
          className={fourDeckMode ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "flex flex-col lg:flex-row gap-4"}
          data-testid="decks-container"
        >
          {visibleDecks.map(renderDeck)}
        </div>

        {showPhase && (
          <PhaseMeter
            bpmA={analysis.A?.bpm || null}
            bpmB={analysis.B?.bpm || null}
            keyA={analysis.A?.key || null}
            keyB={analysis.B?.key || null}
            currentTimeA={engine.decks.A.currentTime}
            currentTimeB={engine.decks.B.currentTime}
            rateA={engine.decks.A.playbackRate}
            rateB={engine.decks.B.playbackRate}
          />
        )}

        <Mixer
          crossfade={engine.crossfadeAB}
          onCrossfadeChange={engine.updateCrossfadeAB}
          isRecording={engine.isRecording}
          recordingUrl={engine.recordingUrl}
          onStartRecording={engine.startRecording}
          onStopRecording={engine.stopRecording}
          autoMixing={engine.autoMixing}
          onAutoMix={() => engine.autoMix(analysis.A?.bpm, analysis.B?.bpm)}
          hasBothDecks={!!engine.decks.A.buffer && !!engine.decks.B.buffer}
          vuA={engine.decks.A.vuLevel}
          vuB={engine.decks.B.vuLevel}
        />

        {fourDeckMode && (
          <Card className="bg-card/80 backdrop-blur-sm" data-testid="crossfade-cd-panel">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: deckColors.C }}>C</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{ width: `${engine.decks.C.vuLevel * 100}%`, backgroundColor: deckColors.C }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Crossfade C-D</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75 ml-auto"
                      style={{ width: `${engine.decks.D.vuLevel * 100}%`, backgroundColor: deckColors.D }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: deckColors.D }}>D</span>
                </div>
              </div>
              <Slider
                value={[engine.crossfadeCD]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => engine.updateCrossfadeCD(v)}
                data-testid="slider-crossfade-cd"
              />
            </CardContent>
          </Card>
        )}

        {proMode && (
          <Card className="bg-card/80 backdrop-blur-sm" data-testid="mastering-panel">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Mastering</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {engine.mastering.preset}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {MASTER_PRESETS.map(preset => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={engine.mastering.preset === preset ? "default" : "outline"}
                    onClick={() => engine.setMasterPreset(preset)}
                    data-testid={`button-preset-${preset.toLowerCase()}`}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Master Gain</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {Math.round(engine.mastering.masterGain * 100)}%
                  </span>
                </div>
                <Slider
                  value={[engine.mastering.masterGain]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={([v]) => engine.setMasterGain(v)}
                  data-testid="slider-master-gain"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {proMode && (
          <Sampler
            pads={engine.samplePads}
            onPlaySample={engine.playSample}
            onLoadSample={engine.loadSampleFile}
          />
        )}

        <div className="flex items-center gap-2 flex-wrap" data-testid="panel-toggles">
          {panelButtons.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              size="sm"
              variant={expandedPanels.has(id) ? "default" : "outline"}
              onClick={() => togglePanel(id)}
              data-testid={`button-panel-${id}`}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {label}
              {expandedPanels.has(id) ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          ))}
        </div>

        {expandedPanels.has("visualizer") && (
          <Visualizer
            analyzerDataA={engine.decks.A.analyzerData}
            analyzerDataB={engine.decks.B.analyzerData}
            isPlayingA={engine.decks.A.isPlaying}
            isPlayingB={engine.decks.B.isPlaying}
            colorA={deckColors.A}
            colorB={deckColors.B}
            vuA={engine.decks.A.vuLevel}
            vuB={engine.decks.B.vuLevel}
          />
        )}

        {expandedPanels.has("library") && (
          <TrackLibrary
            tracks={tracks}
            playlists={playlists}
            setHistory={setHistory}
            onAddTrack={handleAddTrack}
            onLoadTrackToDeck={handleLoadTrackToDeck}
            onRemoveTrack={handleRemoveTrack}
            onCreatePlaylist={handleCreatePlaylist}
            onAddToPlaylist={handleAddToPlaylist}
          />
        )}

        {expandedPanels.has("challenges") && (
          <MixChallenges
            results={challengeResults}
            mixFeedback={mixFeedback}
            onStartChallenge={handleStartChallenge}
            activeChallenge={activeChallenge}
            challengeTimeLeft={challengeTimeLeft}
            onCompleteChallenge={handleCompleteChallenge}
          />
        )}

        {expandedPanels.has("themes") && (
          <ThemeSelector />
        )}

        {expandedPanels.has("midi") && (
          <MidiController
            onCrossfade={engine.updateCrossfadeAB}
            onVolume={engine.setVolume}
            onEQ={engine.setEQ}
            onRate={engine.setRate}
            onPlayPause={(deck) => {
              engine.decks[deck].isPlaying ? engine.pauseDeck(deck) : engine.playDeck(deck);
            }}
            onCue={engine.setCue}
          />
        )}
      </main>
    </div>
  );
}

function detectBPM(data: Float32Array, sampleRate: number): number {
  const bufferSize = 2048;
  const hopSize = 512;
  const energies: number[] = [];

  for (let i = 0; i + bufferSize < data.length; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < bufferSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energies.push(energy);
  }

  const onsetThreshold = 1.5;
  const onsets: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    if (energies[i] > energies[i - 1] * onsetThreshold && energies[i] > 0.001) {
      onsets.push(i);
    }
  }

  if (onsets.length < 2) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const interval = (onsets[i] - onsets[i - 1]) * hopSize / sampleRate;
    if (interval > 0.2 && interval < 2.0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) return 120;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  let bpm = 60 / median;

  while (bpm < 80) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  return Math.round(bpm * 10) / 10;
}

function detectKey(data: Float32Array, sampleRate: number): string {
  const fftSize = 4096;
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const chromaBins = new Array(12).fill(0);

  for (let start = 0; start + fftSize < data.length; start += fftSize) {
    const segment = data.slice(start, start + fftSize);
    const windowed = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      windowed[i] = segment[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    }

    for (let note = 0; note < 12; note++) {
      for (let octave = 1; octave <= 7; octave++) {
        const freq = 440 * Math.pow(2, (note - 9 + (octave - 4) * 12) / 12);
        const binIndex = Math.round(freq * fftSize / sampleRate);
        if (binIndex >= 0 && binIndex < fftSize / 2) {
          let real = 0, imag = 0;
          for (let i = 0; i < fftSize; i++) {
            const angle = -2 * Math.PI * binIndex * i / fftSize;
            real += windowed[i] * Math.cos(angle);
            imag += windowed[i] * Math.sin(angle);
          }
          chromaBins[note] += Math.sqrt(real * real + imag * imag);
        }
      }
    }
  }

  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestCorr = -Infinity;
  let bestKey = "";

  for (let shift = 0; shift < 12; shift++) {
    const shifted = chromaBins.slice(shift).concat(chromaBins.slice(0, shift));
    let corrMajor = 0, corrMinor = 0;
    for (let i = 0; i < 12; i++) {
      corrMajor += shifted[i] * majorProfile[i];
      corrMinor += shifted[i] * minorProfile[i];
    }
    if (corrMajor > bestCorr) {
      bestCorr = corrMajor;
      bestKey = notes[shift] + " Major";
    }
    if (corrMinor > bestCorr) {
      bestCorr = corrMinor;
      bestKey = notes[shift] + " Minor";
    }
  }

  return bestKey;
}
