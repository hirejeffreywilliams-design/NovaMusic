import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";

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
        message: "Client-side analysis is preferred for this app. Use the Analyze button on each deck for instant BPM/key detection."
      };

      try {
        fs.unlinkSync(filePath);
      } catch (_) {}

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  return httpServer;
}
