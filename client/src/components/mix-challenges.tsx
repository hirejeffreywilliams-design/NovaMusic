import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Star, Target, Play, CheckCircle2, XCircle, Timer,
} from "lucide-react";

export interface MixChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  type: "beatmatch" | "transition" | "eq" | "creative";
  criteria: string[];
  timeLimit: number;
}

export interface ChallengeResult {
  challengeId: string;
  score: number;
  maxScore: number;
  completedCriteria: boolean[];
  timestamp: number;
}

export interface MixFeedback {
  beatAlignment: number;
  volumeConsistency: number;
  transitionSmoothness: number;
  overallScore: number;
  tips: string[];
}

const CHALLENGES: MixChallenge[] = [
  {
    id: "beatmatch-basic",
    title: "Basic Beatmatch",
    description: "Match the BPM of Deck B to Deck A within 2 BPM",
    difficulty: "easy",
    type: "beatmatch",
    criteria: ["Load tracks on both decks", "Analyze both tracks", "Match BPMs within 2 BPM"],
    timeLimit: 60,
  },
  {
    id: "smooth-transition",
    title: "Smooth Transition",
    description: "Perform a clean 16-bar crossfade transition",
    difficulty: "medium",
    type: "transition",
    criteria: ["Both decks playing", "Crossfade moves smoothly", "No volume spikes", "Transition takes 15-30 seconds"],
    timeLimit: 120,
  },
  {
    id: "eq-mixing",
    title: "EQ Mixing",
    description: "Use EQ to blend bass from one track to another",
    difficulty: "medium",
    type: "eq",
    criteria: ["Cut bass on incoming track", "Gradually bring in bass", "Cut bass on outgoing track", "Maintain energy level"],
    timeLimit: 90,
  },
  {
    id: "key-harmony",
    title: "Harmonic Mixing",
    description: "Mix two tracks that are harmonically compatible",
    difficulty: "hard",
    type: "creative",
    criteria: ["Both tracks analyzed", "Keys are compatible on Camelot wheel", "Clean transition with EQ", "Use effects for texture"],
    timeLimit: 120,
  },
  {
    id: "quick-mix",
    title: "Quick Drop",
    description: "Perform a quick cut transition on the beat",
    difficulty: "easy",
    type: "transition",
    criteria: ["Both decks loaded", "Crossfade snaps on beat", "No dead air"],
    timeLimit: 30,
  },
  {
    id: "fx-master",
    title: "FX Master",
    description: "Use at least 2 effects during a transition",
    difficulty: "hard",
    type: "creative",
    criteria: ["Enable filter sweep", "Use reverb or delay", "Smooth volume throughout", "Creative effect timing"],
    timeLimit: 90,
  },
];

interface MixChallengesProps {
  results: ChallengeResult[];
  mixFeedback: MixFeedback | null;
  onStartChallenge: (challenge: MixChallenge) => void;
  activeChallenge: MixChallenge | null;
  challengeTimeLeft: number;
  onCompleteChallenge: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-400",
  medium: "text-yellow-400",
  hard: "text-red-400",
};

export function MixChallenges({
  results, mixFeedback,
  onStartChallenge, activeChallenge,
  challengeTimeLeft, onCompleteChallenge,
}: MixChallengesProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="mix-challenges">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Mix Challenges</CardTitle>
          <Badge variant="secondary" className="text-xs font-mono">
            {results.length} completed
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeChallenge && (
          <div className="p-3 rounded-md border border-primary/30 bg-primary/5 space-y-2" data-testid="active-challenge">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{activeChallenge.title}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.floor(challengeTimeLeft / 60)}:{(challengeTimeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{activeChallenge.description}</p>
            <div className="space-y-1">
              {activeChallenge.criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={onCompleteChallenge}
              data-testid="button-complete-challenge"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Submit
            </Button>
          </div>
        )}

        {mixFeedback && (
          <div className="p-3 rounded-md border border-border/50 space-y-3" data-testid="mix-feedback">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Mix Feedback</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {Math.round(mixFeedback.overallScore * 100)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Beat Alignment</span>
                  <span className="text-xs font-mono">{Math.round(mixFeedback.beatAlignment * 100)}%</span>
                </div>
                <Progress value={mixFeedback.beatAlignment * 100} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Volume Consistency</span>
                  <span className="text-xs font-mono">{Math.round(mixFeedback.volumeConsistency * 100)}%</span>
                </div>
                <Progress value={mixFeedback.volumeConsistency * 100} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Transition Smoothness</span>
                  <span className="text-xs font-mono">{Math.round(mixFeedback.transitionSmoothness * 100)}%</span>
                </div>
                <Progress value={mixFeedback.transitionSmoothness * 100} className="h-1.5" />
              </div>
            </div>
            {mixFeedback.tips.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium">Tips:</span>
                {mixFeedback.tips.map((tip, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                    <Star className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!activeChallenge && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHALLENGES.map((challenge) => {
              const completed = results.find(r => r.challengeId === challenge.id);
              return (
                <div
                  key={challenge.id}
                  className="p-2.5 rounded-md border border-border/50 space-y-1.5 hover-elevate"
                  data-testid={`challenge-${challenge.id}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium">{challenge.title}</span>
                    <span className={`text-[10px] font-mono uppercase ${DIFFICULTY_COLORS[challenge.difficulty]}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{challenge.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    {completed ? (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                        {Math.round((completed.score / completed.maxScore) * 100)}%
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{challenge.timeLimit}s</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px]"
                      onClick={() => onStartChallenge(challenge)}
                      data-testid={`button-start-challenge-${challenge.id}`}
                    >
                      <Play className="w-3 h-3 mr-0.5" />
                      {completed ? "Retry" : "Start"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
