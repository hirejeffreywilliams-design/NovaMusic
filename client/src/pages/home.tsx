import { useState, useCallback } from "react";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { Deck } from "@/components/deck";
import { Mixer } from "@/components/mixer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Disc3 } from "lucide-react";

const DECK_A_COLOR = "hsl(262, 83%, 58%)";
const DECK_B_COLOR = "hsl(340, 75%, 55%)";

export default function Home() {
  const engine = useAudioEngine();
  const [analysisA, setAnalysisA] = useState<{ bpm: number; key: string } | null>(null);
  const [analysisB, setAnalysisB] = useState<{ bpm: number; key: string } | null>(null);
  const [analyzingA, setAnalyzingA] = useState(false);
  const [analyzingB, setAnalyzingB] = useState(false);

  const handleAnalyze = useCallback(async (which: "A" | "B") => {
    const state = which === "A" ? engine.deckA : engine.deckB;
    if (!state.buffer) return;

    const setter = which === "A" ? setAnalyzingA : setAnalyzingB;
    const resultSetter = which === "A" ? setAnalysisA : setAnalysisB;
    setter(true);

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

      resultSetter({ bpm, key });
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setter(false);
    }
  }, [engine.deckA, engine.deckB]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Disc3 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">DJ Hybrid</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">2-Deck Mixer</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4" data-testid="decks-container">
          <Deck
            which="A"
            state={engine.deckA}
            color={DECK_A_COLOR}
            onLoadFile={engine.loadFile}
            onPlay={engine.playDeck}
            onPause={engine.pauseDeck}
            onSetRate={engine.setRate}
            onSetCue={engine.setCue}
            onJumpCue={engine.jumpCue}
            onSeek={engine.seekDeck}
            analysis={analysisA}
            analyzing={analyzingA}
            onAnalyze={handleAnalyze}
          />

          <Deck
            which="B"
            state={engine.deckB}
            color={DECK_B_COLOR}
            onLoadFile={engine.loadFile}
            onPlay={engine.playDeck}
            onPause={engine.pauseDeck}
            onSetRate={engine.setRate}
            onSetCue={engine.setCue}
            onJumpCue={engine.jumpCue}
            onSeek={engine.seekDeck}
            analysis={analysisB}
            analyzing={analyzingB}
            onAnalyze={handleAnalyze}
          />
        </div>

        <Mixer
          crossfade={engine.crossfade}
          onCrossfadeChange={engine.updateCrossfade}
          isRecording={engine.isRecording}
          recordingUrl={engine.recordingUrl}
          onStartRecording={engine.startRecording}
          onStopRecording={engine.stopRecording}
          autoMixing={engine.autoMixing}
          onAutoMix={engine.autoMix}
          hasBothDecks={!!engine.deckA.buffer && !!engine.deckB.buffer}
        />
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

  let maxIdx = 0;
  for (let i = 1; i < 12; i++) {
    if (chromaBins[i] > chromaBins[maxIdx]) maxIdx = i;
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
