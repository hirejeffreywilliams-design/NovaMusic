import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

// In-memory session store for platform tokens (per session ID)
// In production this should be a persistent store like Redis
const platformSessions = new Map<string, {
  spotify?: { accessToken: string; refreshToken: string; expiresAt: number };
  soundcloud?: { accessToken: string };
}>();

function getSession(sessionId: string) {
  if (!platformSessions.has(sessionId)) {
    platformSessions.set(sessionId, {});
  }
  return platformSessions.get(sessionId)!;
}

export function registerPlatformRoutes(app: Express) {
  // ─── Spotify OAuth ────────────────────────────────────────────────────────

  app.get("/api/platform/spotify/auth-url", (req: Request, res: Response) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "Spotify integration not configured. See /setup-guide for instructions." });
    }
    const sessionId = req.query.sessionId as string || randomUUID();
    const redirectUri = `${req.protocol}://${req.get("host")}/api/platform/spotify/callback`;
    const scopes = [
      "user-library-read",
      "playlist-read-private",
      "playlist-read-collaborative",
      "streaming",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-email",
      "user-read-private",
    ].join(" ");
    const state = Buffer.from(JSON.stringify({ sessionId })).toString("base64");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });
    return res.json({ url: `https://accounts.spotify.com/authorize?${params}`, sessionId });
  });

  app.get("/api/platform/spotify/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query;
    if (error || !code) {
      return res.send(`<script>window.opener?.postMessage({type:'spotify_auth_error',error:'${error || "cancelled"}'},'*');window.close();</script>`);
    }
    try {
      const { sessionId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.SPOTIFY_CLIENT_ID!;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/platform/spotify/callback`;
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code: code as string, redirect_uri: redirectUri }),
      });
      const tokenData = await tokenRes.json() as any;
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      const session = getSession(sessionId);
      session.spotify = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
      };
      return res.send(`<script>window.opener?.postMessage({type:'spotify_auth_success',sessionId:'${sessionId}'},'*');window.close();</script>`);
    } catch (e: any) {
      return res.send(`<script>window.opener?.postMessage({type:'spotify_auth_error',error:'${e.message}'},'*');window.close();</script>`);
    }
  });

  async function getSpotifyToken(sessionId: string, req: Request): Promise<string | null> {
    const session = getSession(sessionId);
    if (!session.spotify) return null;
    if (Date.now() > session.spotify.expiresAt - 60000) {
      try {
        const clientId = process.env.SPOTIFY_CLIENT_ID!;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
        const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.spotify.refreshToken }),
        });
        const tokenData = await tokenRes.json() as any;
        if (!tokenData.error) {
          session.spotify.accessToken = tokenData.access_token;
          session.spotify.expiresAt = Date.now() + tokenData.expires_in * 1000;
        }
      } catch (_) {}
    }
    return session.spotify.accessToken;
  }

  app.get("/api/platform/spotify/playlists", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const token = await getSpotifyToken(sessionId as string, req);
    if (!token) return res.status(401).json({ error: "Not authenticated with Spotify" });
    try {
      const r = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/spotify/playlist/:playlistId/tracks", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const token = await getSpotifyToken(sessionId as string, req);
    if (!token) return res.status(401).json({ error: "Not authenticated with Spotify" });
    try {
      const r = await fetch(`https://api.spotify.com/v1/playlists/${req.params.playlistId}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/spotify/saved-tracks", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const token = await getSpotifyToken(sessionId as string, req);
    if (!token) return res.status(401).json({ error: "Not authenticated with Spotify" });
    try {
      const r = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/spotify/search", async (req: Request, res: Response) => {
    const { sessionId, q } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    if (!q) return res.status(400).json({ error: "Query required" });
    const token = await getSpotifyToken(sessionId as string, req);
    if (!token) return res.status(401).json({ error: "Not authenticated with Spotify" });
    try {
      const r = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q as string)}&type=track&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/spotify/audio-features/:trackId", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const token = await getSpotifyToken(sessionId as string, req);
    if (!token) return res.status(401).json({ error: "Not authenticated with Spotify" });
    try {
      const r = await fetch(`https://api.spotify.com/v1/audio-features/${req.params.trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/platform/spotify/disconnect", (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (sessionId) {
      const session = getSession(sessionId as string);
      delete session.spotify;
    }
    return res.json({ success: true });
  });

  app.get("/api/platform/spotify/status", (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.json({ connected: false });
    const session = getSession(sessionId as string);
    return res.json({ connected: !!session.spotify });
  });

  // ─── Apple Music Token ────────────────────────────────────────────────────

  app.get("/api/platform/apple/token", (req: Request, res: Response) => {
    const teamId = process.env.APPLE_TEAM_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY;
    if (!teamId || !keyId || !privateKey) {
      return res.status(503).json({ error: "Apple Music integration not configured. See /setup-guide for instructions." });
    }
    try {
      const token = jwt.sign({}, privateKey.replace(/\\n/g, "\n"), {
        algorithm: "ES256",
        expiresIn: "180d",
        issuer: teamId,
        header: { alg: "ES256", kid: keyId },
      });
      return res.json({ token });
    } catch (e: any) {
      return res.status(500).json({ error: `Failed to generate Apple Music token: ${e.message}` });
    }
  });

  // ─── YouTube Search ───────────────────────────────────────────────────────

  app.get("/api/platform/youtube/search", async (req: Request, res: Response) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "YouTube integration not configured. See /setup-guide for instructions." });
    }
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query required" });
    try {
      const params = new URLSearchParams({
        part: "snippet",
        q: q as string,
        type: "video",
        videoCategoryId: "10",
        maxResults: "20",
        key: apiKey,
      });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/youtube/status", (req: Request, res: Response) => {
    return res.json({ configured: !!process.env.YOUTUBE_API_KEY });
  });

  // ─── SoundCloud OAuth ─────────────────────────────────────────────────────

  app.get("/api/platform/soundcloud/auth-url", (req: Request, res: Response) => {
    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "SoundCloud integration not configured. See /setup-guide for instructions." });
    }
    const sessionId = req.query.sessionId as string || randomUUID();
    const redirectUri = `${req.protocol}://${req.get("host")}/api/platform/soundcloud/callback`;
    const state = Buffer.from(JSON.stringify({ sessionId })).toString("base64");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "non-expiring",
      state,
    });
    return res.json({ url: `https://soundcloud.com/connect?${params}`, sessionId });
  });

  app.get("/api/platform/soundcloud/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query;
    if (error || !code) {
      return res.send(`<script>window.opener?.postMessage({type:'soundcloud_auth_error',error:'${error || "cancelled"}'},'*');window.close();</script>`);
    }
    try {
      const { sessionId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.SOUNDCLOUD_CLIENT_ID!;
      const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET!;
      const redirectUri = `${req.protocol}://${req.get("host")}/api/platform/soundcloud/callback`;
      const tokenRes = await fetch("https://api.soundcloud.com/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code as string,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      const session = getSession(sessionId);
      session.soundcloud = { accessToken: tokenData.access_token };
      return res.send(`<script>window.opener?.postMessage({type:'soundcloud_auth_success',sessionId:'${sessionId}'},'*');window.close();</script>`);
    } catch (e: any) {
      return res.send(`<script>window.opener?.postMessage({type:'soundcloud_auth_error',error:'${e.message}'},'*');window.close();</script>`);
    }
  });

  app.get("/api/platform/soundcloud/me/tracks", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const session = getSession(sessionId as string);
    if (!session.soundcloud) return res.status(401).json({ error: "Not authenticated with SoundCloud" });
    try {
      const r = await fetch(`https://api.soundcloud.com/me/favorites?limit=50&oauth_token=${session.soundcloud.accessToken}`);
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/soundcloud/me/playlists", async (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(401).json({ error: "No session" });
    const session = getSession(sessionId as string);
    if (!session.soundcloud) return res.status(401).json({ error: "Not authenticated with SoundCloud" });
    try {
      const r = await fetch(`https://api.soundcloud.com/me/playlists?limit=20&oauth_token=${session.soundcloud.accessToken}`);
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/platform/soundcloud/discover", async (req: Request, res: Response) => {
    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "SoundCloud integration not configured." });
    }
    try {
      const r = await fetch(`https://api.soundcloud.com/tracks?tags=dj-friendly&limit=20&client_id=${clientId}&order=hotness`);
      const data = await r.json() as any;
      return res.json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/platform/soundcloud/disconnect", (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (sessionId) {
      const session = getSession(sessionId as string);
      delete session.soundcloud;
    }
    return res.json({ success: true });
  });

  app.get("/api/platform/soundcloud/status", (req: Request, res: Response) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.json({ connected: false });
    const session = getSession(sessionId as string);
    return res.json({ connected: !!session.soundcloud });
  });
}
