import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import fs from "fs";
import os from "os";
import { registerAIDJRoutes } from "./ai-dj";

const upload = multer({ dest: os.tmpdir() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/analyze", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const filePath = req.file.path;

      const result = {
        bpm: 0,
        key: "",
        sections: [] as { type: string; start: number; end: number }[],
        beatgrid: [] as number[],
        suggestedCuePoints: [] as number[],
        confidence: 0,
        message: "Server-side analysis is a placeholder. Use the Analyze button on each deck for instant client-side BPM/key detection with full accuracy.",
      };

      try { fs.unlinkSync(filePath); } catch (_) {}

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  app.post("/api/mix-suggestion", (req, res) => {
    const { bpmA, bpmB, keyA, keyB, durationA, durationB } = req.body || {};

    const compatibleKeys = getHarmonicCompatibility(keyA, keyB);
    const bpmDiff = bpmA && bpmB ? Math.abs(bpmA - bpmB) : 0;
    const tempoCompatible = bpmDiff < 10;

    let transitionType: "smooth" | "cut" | "echo" = "smooth";
    if (bpmDiff > 8) transitionType = "echo";
    if (bpmDiff > 15) transitionType = "cut";

    const rateMultiplier = bpmA && bpmB && tempoCompatible ? bpmA / bpmB : 1;
    const transitionBeats = tempoCompatible ? 16 : 8;
    const beatDuration = bpmA ? 60 / bpmA : 0.5;
    const transitionDuration = transitionBeats * beatDuration;

    const suggestion = {
      transition: {
        type: transitionType,
        durationBeats: transitionBeats,
        durationSeconds: transitionDuration,
        crossfadeCurve: tempoCompatible ? "smooth-s" : "linear",
        rateMultiplierB: Math.round(rateMultiplier * 1000) / 1000,
      },
      harmonic: {
        compatible: compatibleKeys,
        bpmDifference: bpmDiff,
        tempoSync: tempoCompatible,
      },
      suggestedFX: transitionType === "echo"
        ? [{ name: "delay", time: beatDuration, feedback: 0.4 }]
        : transitionType === "cut"
        ? [{ name: "filter", type: "highpass", freq: 500 }]
        : [],
      confidence: tempoCompatible && compatibleKeys ? 0.9 : tempoCompatible ? 0.7 : 0.4,
    };

    return res.json(suggestion);
  });

  registerAIDJRoutes(app);

  return httpServer;
}

function getHarmonicCompatibility(keyA?: string, keyB?: string): boolean {
  if (!keyA || !keyB) return false;

  const camelotMap: Record<string, string> = {
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

  const cA = camelotMap[keyA];
  const cB = camelotMap[keyB];
  if (!cA || !cB) return false;

  const numA = parseInt(cA);
  const numB = parseInt(cB);
  const letterA = cA.slice(-1);
  const letterB = cB.slice(-1);

  if (numA === numB) return true;
  if (letterA === letterB && (Math.abs(numA - numB) === 1 || Math.abs(numA - numB) === 11)) return true;

  return false;
}
