import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DeckState, DeckId } from "@/hooks/use-audio-engine";
import { BarChart3, Activity, Zap, Clock, ChevronDown, ChevronUp } from "lucide-react";

interface AnalyticsDashboardProps {
  decks: Record<DeckId, DeckState>;
  analysis: Record<DeckId, { bpm: number; key: string } | null>;
  sessionStartTime: number;
}

interface EnergyPoint {
  time: number;
  level: number;
}

export function AnalyticsDashboard({ decks, analysis, sessionStartTime }: AnalyticsDashboardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [energyHistory, setEnergyHistory] = useState<EnergyPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);

  const activeDecks = (["A", "B", "C", "D"] as DeckId[]).filter(id => decks[id].isPlaying);
  const avgEnergy = activeDecks.length > 0
    ? activeDecks.reduce((s, id) => s + decks[id].vuLevel, 0) / activeDecks.length
    : 0;

  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
  const sessionMin = Math.floor(sessionDuration / 60);
  const sessionSec = sessionDuration % 60;

  const peakEnergy = energyHistory.length > 0
    ? Math.max(...energyHistory.map(e => e.level))
    : 0;

  const tracksLoaded = (["A", "B", "C", "D"] as DeckId[]).filter(id => decks[id].buffer).length;

  useEffect(() => {
    if (avgEnergy > 0) {
      setEnergyHistory(prev => {
        const now = Date.now();
        const next = [...prev, { time: now, level: avgEnergy }];
        const cutoff = now - 120000;
        return next.filter(p => p.time > cutoff);
      });
    }
  }, [avgEnergy]);

  const drawEnergyCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || energyHistory.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const now = Date.now();
    const windowMs = 120000;

    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.1)");
    gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.2)");
    gradient.addColorStop(1, "rgba(239, 68, 68, 0.3)");

    ctx.beginPath();
    ctx.moveTo(0, h);
    energyHistory.forEach((point, i) => {
      const x = ((point.time - (now - windowMs)) / windowMs) * w;
      const y = h - point.level * h;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    energyHistory.forEach((point, i) => {
      const x = ((point.time - (now - windowMs)) / windowMs) * w;
      const y = h - point.level * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [energyHistory]);

  const drawHeatmap = useCallback(() => {
    const canvas = heatmapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    activeDecks.forEach((deckId, di) => {
      const deck = decks[deckId];
      if (!deck.analyzerData) return;
      const bandHeight = h / Math.max(activeDecks.length, 1);
      const y0 = di * bandHeight;

      const bands = 32;
      const bandWidth = w / bands;
      const data = deck.analyzerData;
      const step = Math.floor(data.length / bands);

      for (let b = 0; b < bands; b++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += Math.abs(data[b * step + j] || 0);
        }
        const avg = sum / step;
        const intensity = Math.min(avg * 5, 1);

        const r = Math.round(intensity * 255);
        const g = Math.round((1 - intensity) * 100 + intensity * 50);
        const bl = Math.round((1 - intensity) * 200);
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${0.3 + intensity * 0.7})`;
        ctx.fillRect(b * bandWidth, y0, bandWidth - 1, bandHeight - 1);
      }
    });
  }, [activeDecks, decks]);

  useEffect(() => {
    const interval = setInterval(() => {
      drawEnergyCurve();
      drawHeatmap();
    }, 100);
    return () => clearInterval(interval);
  }, [drawEnergyCurve, drawHeatmap]);

  if (collapsed) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm" data-testid="analytics-dashboard">
        <CardContent className="p-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs"
            onClick={() => setCollapsed(false)}
            data-testid="button-expand-analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Analytics
            <ChevronDown className="w-3.5 h-3.5 ml-auto" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="analytics-dashboard">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Analytics</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">
              <Clock className="w-3 h-3 mr-1" />
              {sessionMin}:{sessionSec.toString().padStart(2, "0")}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {tracksLoaded} tracks
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCollapsed(true)}
              data-testid="button-collapse-analytics"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase">Energy</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{
                color: avgEnergy > 0.6 ? "#ef4444" : avgEnergy > 0.3 ? "#f59e0b" : "#22c55e"
              }} />
              <span className="text-sm font-mono font-bold">{Math.round(avgEnergy * 100)}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase">Peak</span>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm font-mono font-bold">{Math.round(peakEnergy * 100)}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase">Active</span>
            <span className="text-sm font-mono font-bold">{activeDecks.length} deck{activeDecks.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">Energy Curve (2 min)</span>
          <canvas
            ref={canvasRef}
            className="w-full h-12 rounded-md bg-muted/30"
            data-testid="canvas-energy-curve"
          />
        </div>

        {activeDecks.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase">Spectral Heatmap</span>
            <canvas
              ref={heatmapRef}
              className="w-full h-8 rounded-md bg-muted/30"
              data-testid="canvas-heatmap"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
