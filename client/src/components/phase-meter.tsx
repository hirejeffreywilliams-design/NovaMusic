import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PhaseMeterProps {
  bpmA: number | null;
  bpmB: number | null;
  keyA: string | null;
  keyB: string | null;
  currentTimeA: number;
  currentTimeB: number;
  rateA: number;
  rateB: number;
}

const CAMELOT: Record<string, string> = {
  "C Major": "8B", "A Minor": "8A",
  "G Major": "9B", "E Minor": "9A",
  "D Major": "10B", "B Minor": "10A",
  "A Major": "11B", "F# Minor": "11A",
  "E Major": "12B", "C# Minor": "12A",
  "B Major": "1B", "G# Minor": "1A",
  "F# Major": "2B", "D# Minor": "2A",
  "Db Major": "3B", "Bb Minor": "3A",
  "Ab Major": "4B", "F Minor": "4A",
  "Eb Major": "5B", "C Minor": "5A",
  "Bb Major": "6B", "G Minor": "6A",
  "F Major": "7B", "D Minor": "7A",
};

function isHarmonicMatch(keyA: string | null, keyB: string | null): boolean {
  if (!keyA || !keyB) return false;
  const cA = CAMELOT[keyA];
  const cB = CAMELOT[keyB];
  if (!cA || !cB) return false;
  const numA = parseInt(cA);
  const numB = parseInt(cB);
  const letterA = cA.slice(-1);
  const letterB = cB.slice(-1);
  if (numA === numB) return true;
  if (letterA === letterB && (Math.abs(numA - numB) === 1 || Math.abs(numA - numB) === 11)) return true;
  return false;
}

function getBeatPhase(bpm: number | null, currentTime: number): number {
  if (!bpm || bpm <= 0) return 0;
  const beatDuration = 60 / bpm;
  return (currentTime % beatDuration) / beatDuration;
}

export function PhaseMeter({ bpmA, bpmB, keyA, keyB, currentTimeA, currentTimeB, rateA, rateB }: PhaseMeterProps) {
  const effectiveBpmA = bpmA ? bpmA * rateA : null;
  const effectiveBpmB = bpmB ? bpmB * rateB : null;
  const phaseA = getBeatPhase(effectiveBpmA, currentTimeA);
  const phaseB = getBeatPhase(effectiveBpmB, currentTimeB);
  const phaseDiff = Math.abs(phaseA - phaseB);
  const alignment = 1 - Math.min(phaseDiff, 1 - phaseDiff) * 2;
  const harmonic = isHarmonicMatch(keyA, keyB);
  const bpmDiff = effectiveBpmA && effectiveBpmB ? Math.abs(effectiveBpmA - effectiveBpmB) : null;
  const camelotA = keyA ? CAMELOT[keyA] : null;
  const camelotB = keyB ? CAMELOT[keyB] : null;

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="phase-meter">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Beat Sync</span>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${alignment * 100}%`,
                  backgroundColor: alignment > 0.8 ? "#22c55e" : alignment > 0.5 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{Math.round(alignment * 100)}%</span>
          </div>

          {bpmDiff !== null && (
            <Badge
              variant={bpmDiff < 3 ? "secondary" : "outline"}
              className="text-[10px] font-mono"
              data-testid="badge-bpm-diff"
            >
              {bpmDiff < 0.5 ? "BPM Match" : `${bpmDiff.toFixed(1)} BPM off`}
            </Badge>
          )}

          {keyA && keyB && (
            <Badge
              variant={harmonic ? "secondary" : "outline"}
              className="text-[10px] font-mono"
              style={harmonic ? { borderColor: "#22c55e44" } : { borderColor: "#ef444444" }}
              data-testid="badge-harmonic"
            >
              {camelotA} / {camelotB} {harmonic ? "- Harmonic" : "- Clash"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
