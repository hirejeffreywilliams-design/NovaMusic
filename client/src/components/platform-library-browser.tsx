import { useState, useEffect, useRef, useCallback } from "react";
import {
  Music, Search, Play, Plus, ExternalLink, Info, AlertTriangle, Check, X,
  Loader2, ChevronRight, ChevronDown, Radio, Mic2, Youtube, Globe, BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformTrack {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  bpm?: number;
  key?: string;
  artwork?: string;
  platform: "spotify" | "apple" | "youtube" | "soundcloud" | "local";
  platformId: string;
  previewUrl?: string;
  embedUrl?: string;
  streamUrl?: string;
  isVideo?: boolean;
  isIndependent?: boolean;
}

interface PlatformLibraryBrowserProps {
  activeDeck?: string;
  onAddToQueue?: (track: PlatformTrack) => void;
}

// ─── Session ID (persists across re-renders) ─────────────────────────────────

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = localStorage.getItem("platform_session_id");
    if (!_sessionId) {
      _sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      localStorage.setItem("platform_session_id", _sessionId);
    }
  }
  return _sessionId;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function msToTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function secToTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const CAMELOT: Record<number, string[]> = {
  0: ["C Major","8B"], 1: ["C# Major","3B"], 2: ["D Major","10B"], 3: ["Eb Major","5B"],
  4: ["E Major","12B"], 5: ["F Major","7B"], 6: ["F# Major","2B"], 7: ["G Major","9B"],
  8: ["Ab Major","4B"], 9: ["A Major","11B"], 10: ["Bb Major","6B"], 11: ["B Major","1B"],
};

function keyName(k: number | undefined): string {
  if (k === undefined || k === null) return "";
  return CAMELOT[k]?.[0] || "";
}

// ─── Audio Effects Disclaimer Banner ─────────────────────────────────────────

function EffectsBanner({ platform }: { platform: string }) {
  return (
    <div className="flex items-start gap-2 bg-[#ffd60a]/8 border border-[#ffd60a]/20 rounded-xl px-3 py-2 mb-3">
      <Info className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
      <p className="text-[10px] text-white/50 leading-relaxed">
        <strong className="text-white/70">Audio effects &amp; BPM sync</strong> are available for your own files and Marketplace tracks.
        Platform-streamed music plays through <strong className="text-white/70">{platform}'s player</strong> — effects and Web Audio routing are not available for streamed content.
      </p>
    </div>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({ track, onAdd, color }: { track: PlatformTrack; onAdd: (t: PlatformTrack) => void; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/10"
      data-testid={`track-row-${track.platform}-${track.id}`}
    >
      {track.artwork ? (
        <img src={track.artwork} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Music className="w-3.5 h-3.5 text-white/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-white/80 truncate">{track.title}</p>
          {track.isVideo && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">VIDEO</span>
          )}
          {track.isIndependent && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 shrink-0">INDIE</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
          {track.duration !== undefined && (
            <span className="text-[9px] text-white/25 shrink-0">
              {track.platform === "spotify" ? msToTime(track.duration) : secToTime(track.duration)}
            </span>
          )}
          {track.bpm !== undefined && track.bpm > 0 && (
            <span className="text-[9px] text-white/25 shrink-0">{Math.round(track.bpm)} BPM</span>
          )}
          {track.key && (
            <span className="text-[9px] text-white/25 shrink-0">{track.key}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onAdd(track)}
        className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:scale-110 active:scale-95"
        style={{ background: `${color}20`, color }}
        data-testid={`button-add-track-${track.id}`}
        title="Add to deck queue"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Spotify Tab ──────────────────────────────────────────────────────────────

function SpotifyTab({ onAdd, color }: { onAdd: (t: PlatformTrack) => void; color: string }) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [tracks, setTracks] = useState<PlatformTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PlatformTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionId = getSessionId();

  useEffect(() => {
    fetch(`/api/platform/spotify/status?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setConnected(true);
          loadPlaylists();
        }
      })
      .catch(() => {});
  }, []);

  function loadPlaylists() {
    setLoading(true);
    fetch(`/api/platform/spotify/playlists?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        setPlaylists(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function connect() {
    fetch(`/api/platform/spotify/auth-url?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast({ title: "Spotify not configured", description: d.error, variant: "destructive" }); return; }
        const popup = window.open(d.url, "spotify-auth", "width=500,height=700");
        const handler = (e: MessageEvent) => {
          if (e.data?.type === "spotify_auth_success") {
            window.removeEventListener("message", handler);
            setConnected(true);
            loadPlaylists();
            popup?.close();
          } else if (e.data?.type === "spotify_auth_error") {
            window.removeEventListener("message", handler);
            toast({ title: "Spotify login failed", description: e.data.error, variant: "destructive" });
          }
        };
        window.addEventListener("message", handler);
      })
      .catch(() => toast({ title: "Failed to start Spotify auth", variant: "destructive" }));
  }

  function disconnect() {
    fetch(`/api/platform/spotify/disconnect?sessionId=${sessionId}`, { method: "DELETE" })
      .then(() => { setConnected(false); setPlaylists([]); setTracks([]); setSearchResults([]); });
  }

  function loadPlaylistTracks(playlistId: string) {
    setSelectedPlaylist(playlistId);
    setLoading(true);
    fetch(`/api/platform/spotify/playlist/${playlistId}/tracks?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        const items: PlatformTrack[] = (d.items || [])
          .filter((i: any) => i.track)
          .map((i: any) => ({
            id: i.track.id,
            title: i.track.name,
            artist: i.track.artists?.map((a: any) => a.name).join(", ") || "",
            duration: i.track.duration_ms,
            artwork: i.track.album?.images?.[0]?.url,
            platform: "spotify" as const,
            platformId: i.track.id,
            previewUrl: i.track.preview_url,
          }));
        setTracks(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function doSearch() {
    if (!search.trim()) return;
    setSearching(true);
    fetch(`/api/platform/spotify/search?sessionId=${sessionId}&q=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => {
        const items: PlatformTrack[] = (d.tracks?.items || []).map((t: any) => ({
          id: t.id,
          title: t.name,
          artist: t.artists?.map((a: any) => a.name).join(", ") || "",
          duration: t.duration_ms,
          artwork: t.album?.images?.[0]?.url,
          platform: "spotify" as const,
          platformId: t.id,
          previewUrl: t.preview_url,
        }));
        setSearchResults(items);
        setSearching(false);
      })
      .catch(() => setSearching(false));
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-[#ff453a]/8 border border-[#ff453a]/20 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#ff453a] shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/50 leading-relaxed">
            <strong className="text-white/70">Commercial Use Disclaimer:</strong> Spotify integration is for personal library browsing.
            Commercial use of Spotify in DJ performances requires a separate agreement with Spotify.{" "}
            <a href="https://developer.spotify.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#1db954] underline">Learn more</a>
          </p>
        </div>
        <div className="text-center py-6 space-y-3">
          <div className="text-4xl">🎧</div>
          <p className="text-xs text-white/50">Connect your Spotify account to browse playlists and saved tracks.</p>
          <p className="text-[10px] text-white/30">Requires Spotify Premium for full playback.</p>
          <button
            onClick={connect}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "#1db954" }}
            data-testid="button-connect-spotify"
          >
            Connect Spotify
          </button>
          <div className="pt-1">
            <Link href="/setup-guide" className="text-[10px] text-white/30 hover:text-white/50 underline">
              Need API keys? See the Setup Guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayTracks = searchResults.length > 0 ? searchResults : tracks;

  return (
    <div className="space-y-3">
      <EffectsBanner platform="Spotify" />
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) setSearchResults([]); }}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search Spotify catalog..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
            data-testid="input-spotify-search"
          />
        </div>
        <button
          onClick={doSearch}
          disabled={searching}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: "#1db954" }}
          data-testid="button-spotify-search"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
        <button
          onClick={disconnect}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          title="Disconnect Spotify"
          data-testid="button-disconnect-spotify"
        >
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>

      {!searchResults.length && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {playlists.map(p => (
            <button
              key={p.id}
              onClick={() => loadPlaylistTracks(p.id)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
              style={selectedPlaylist === p.id
                ? { background: "#1db95420", color: "#1db954", border: "1px solid #1db95440" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid transparent" }
              }
              data-testid={`button-spotify-playlist-${p.id}`}
            >
              {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-4 h-4 rounded" />}
              <span className="max-w-[80px] truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
          {displayTracks.map(track => (
            <TrackRow key={track.id} track={track} onAdd={onAdd} color="#1db954" />
          ))}
          {displayTracks.length === 0 && selectedPlaylist && (
            <p className="text-center text-[10px] text-white/25 py-6">No tracks found</p>
          )}
          {displayTracks.length === 0 && !selectedPlaylist && (
            <p className="text-center text-[10px] text-white/25 py-6">Select a playlist or search to browse tracks</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Apple Music Tab ──────────────────────────────────────────────────────────

function AppleMusicTab({ onAdd, color }: { onAdd: (t: PlatformTrack) => void; color: string }) {
  const { toast } = useToast();
  const [musicKitReady, setMusicKitReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<PlatformTrack[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PlatformTrack[]>([]);

  useEffect(() => {
    // Load MusicKit JS
    if ((window as any).MusicKit) { setMusicKitReady(true); return; }
    fetch("/api/platform/apple/token")
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        const script = document.createElement("script");
        script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
        script.onload = () => {
          (window as any).MusicKit?.configure({
            developerToken: d.token,
            app: { name: "DJ Platform", build: "1.0" },
          });
          setMusicKitReady(true);
        };
        document.head.appendChild(script);
      })
      .catch(() => {});
  }, []);

  function connect() {
    if (!musicKitReady) {
      toast({ title: "Apple Music not configured", description: "See Setup Guide for Apple Music API key instructions.", variant: "destructive" });
      return;
    }
    const mk = (window as any).MusicKit?.getInstance?.();
    if (!mk) return;
    mk.authorize()
      .then(() => {
        setConnected(true);
        loadLibrary(mk);
      })
      .catch((e: any) => toast({ title: "Apple Music login failed", description: String(e), variant: "destructive" }));
  }

  function loadLibrary(mk: any) {
    setLoading(true);
    mk.api.library.songs({ limit: 50 })
      .then((songs: any[]) => {
        const items: PlatformTrack[] = songs.map(s => ({
          id: s.id,
          title: s.attributes?.name || "",
          artist: s.attributes?.artistName || "",
          duration: s.attributes?.durationInMillis ? s.attributes.durationInMillis / 1000 : undefined,
          artwork: s.attributes?.artwork ? (window as any).MusicKit?.formatArtworkURL(s.attributes.artwork, 80, 80) : undefined,
          bpm: undefined,
          key: undefined,
          platform: "apple" as const,
          platformId: s.id,
        }));
        setTracks(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function doSearch() {
    if (!search.trim()) return;
    const mk = (window as any).MusicKit?.getInstance?.();
    if (!mk) return;
    mk.api.search(search, { limit: 20, types: "songs" })
      .then((results: any) => {
        const songs = results?.songs?.data || [];
        const items: PlatformTrack[] = songs.map((s: any) => ({
          id: s.id,
          title: s.attributes?.name || "",
          artist: s.attributes?.artistName || "",
          duration: s.attributes?.durationInMillis ? s.attributes.durationInMillis / 1000 : undefined,
          artwork: s.attributes?.artwork ? (window as any).MusicKit?.formatArtworkURL(s.attributes.artwork, 80, 80) : undefined,
          platform: "apple" as const,
          platformId: s.id,
        }));
        setSearchResults(items);
      });
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <Info className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/40 leading-relaxed">
            Apple Music requires an active Apple Music subscription and developer setup.
            Playback uses Apple's MusicKit player.
          </p>
        </div>
        <div className="text-center py-6 space-y-3">
          <div className="text-4xl">🍎</div>
          <p className="text-xs text-white/50">Connect your Apple Music library to browse and queue tracks.</p>
          <button
            onClick={connect}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "#fc3c44" }}
            data-testid="button-connect-apple"
          >
            Connect Apple Music
          </button>
          <div className="pt-1">
            <Link href="/setup-guide" className="text-[10px] text-white/30 hover:text-white/50 underline">
              Need API keys? See the Setup Guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayTracks = searchResults.length > 0 ? searchResults : tracks;

  return (
    <div className="space-y-3">
      <EffectsBanner platform="Apple Music" />
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) setSearchResults([]); }}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search Apple Music..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
            data-testid="input-apple-search"
          />
        </div>
        <button
          onClick={doSearch}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: "#fc3c44" }}
          data-testid="button-apple-search"
        >Search</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
          {displayTracks.map(track => (
            <TrackRow key={track.id} track={track} onAdd={onAdd} color="#fc3c44" />
          ))}
          {displayTracks.length === 0 && (
            <p className="text-center text-[10px] text-white/25 py-6">Your Apple Music library will appear here</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── YouTube Tab ──────────────────────────────────────────────────────────────

function YouTubeTab({ onAdd, color }: { onAdd: (t: PlatformTrack) => void; color: string }) {
  const { toast } = useToast();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PlatformTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/platform/youtube/status")
      .then(r => r.json())
      .then(d => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  function doSearch() {
    if (!search.trim()) return;
    setLoading(true);
    fetch(`/api/platform/youtube/search?q=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast({ title: "YouTube search failed", description: d.error, variant: "destructive" }); setLoading(false); return; }
        const items: PlatformTrack[] = (d.items || []).map((item: any) => ({
          id: item.id?.videoId || item.id,
          title: item.snippet?.title || "",
          artist: item.snippet?.channelTitle || "",
          artwork: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          platform: "youtube" as const,
          platformId: item.id?.videoId || item.id,
          embedUrl: `https://www.youtube.com/embed/${item.id?.videoId}`,
          isVideo: true,
        }));
        setResults(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/40 leading-relaxed">
          YouTube search uses the YouTube Data API v3. Videos play embedded in the deck using YouTube's official player.
          This is <strong className="text-white/60">video playback</strong> — audio effects are not available for YouTube content.
        </p>
      </div>

      {configured === false && (
        <div className="flex items-start gap-2 bg-[#ff453a]/8 border border-[#ff453a]/20 rounded-xl px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#ff453a] shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/50">
            YouTube API key not configured.{" "}
            <Link href="/setup-guide" className="text-[#ff453a] underline">See Setup Guide</Link>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/10">
          <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search YouTube for music..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
            data-testid="input-youtube-search"
          />
        </div>
        <button
          onClick={doSearch}
          disabled={loading || !search.trim()}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: "#ff0000" }}
          data-testid="button-youtube-search"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </div>

      <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
        {results.map(track => (
          <TrackRow key={track.id} track={track} onAdd={onAdd} color="#ff0000" />
        ))}
        {results.length === 0 && !loading && (
          <p className="text-center text-[10px] text-white/25 py-6">Search for a song or artist to get started</p>
        )}
      </div>
    </div>
  );
}

// ─── SoundCloud Tab ───────────────────────────────────────────────────────────

function SoundCloudTab({ onAdd, color }: { onAdd: (t: PlatformTrack) => void; color: string }) {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<PlatformTrack[]>([]);
  const [discoverTracks, setDiscoverTracks] = useState<PlatformTrack[]>([]);
  const [view, setView] = useState<"liked" | "discover">("liked");
  const sessionId = getSessionId();

  useEffect(() => {
    fetch(`/api/platform/soundcloud/status?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.connected) { setConnected(true); loadTracks(); }
      })
      .catch(() => {});
    loadDiscover();
  }, []);

  function loadTracks() {
    setLoading(true);
    fetch(`/api/platform/soundcloud/me/tracks?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        const items = Array.isArray(d) ? d : [];
        const mapped: PlatformTrack[] = items.map((t: any) => ({
          id: String(t.id),
          title: t.title || "",
          artist: t.user?.username || "",
          duration: t.duration ? t.duration / 1000 : undefined,
          artwork: t.artwork_url || undefined,
          platform: "soundcloud" as const,
          platformId: String(t.id),
          streamUrl: t.stream_url,
          isIndependent: true,
        }));
        setTracks(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function loadDiscover() {
    fetch("/api/platform/soundcloud/discover")
      .then(r => r.json())
      .then(d => {
        const items = Array.isArray(d) ? d : [];
        const mapped: PlatformTrack[] = items.map((t: any) => ({
          id: String(t.id),
          title: t.title || "",
          artist: t.user?.username || "",
          duration: t.duration ? t.duration / 1000 : undefined,
          artwork: t.artwork_url || undefined,
          platform: "soundcloud" as const,
          platformId: String(t.id),
          streamUrl: t.stream_url,
          isIndependent: true,
        }));
        setDiscoverTracks(mapped);
      })
      .catch(() => {});
  }

  function connect() {
    fetch(`/api/platform/soundcloud/auth-url?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast({ title: "SoundCloud not configured", description: d.error, variant: "destructive" }); return; }
        const popup = window.open(d.url, "soundcloud-auth", "width=500,height=700");
        const handler = (e: MessageEvent) => {
          if (e.data?.type === "soundcloud_auth_success") {
            window.removeEventListener("message", handler);
            setConnected(true);
            loadTracks();
            popup?.close();
          } else if (e.data?.type === "soundcloud_auth_error") {
            window.removeEventListener("message", handler);
            toast({ title: "SoundCloud login failed", description: e.data.error, variant: "destructive" });
          }
        };
        window.addEventListener("message", handler);
      })
      .catch(() => toast({ title: "Failed to start SoundCloud auth", variant: "destructive" }));
  }

  function disconnect() {
    fetch(`/api/platform/soundcloud/disconnect?sessionId=${sessionId}`, { method: "DELETE" })
      .then(() => { setConnected(false); setTracks([]); });
  }

  const displayTracks = view === "liked" ? tracks : discoverTracks;

  return (
    <div className="space-y-3">
      <EffectsBanner platform="SoundCloud" />
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => setView("liked")}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={view === "liked"
              ? { background: "#ff5500", color: "white" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            data-testid="button-soundcloud-liked"
          >
            My Likes
          </button>
          <button
            onClick={() => setView("discover")}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={view === "discover"
              ? { background: "#ff5500", color: "white" }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
            data-testid="button-soundcloud-discover"
          >
            DJ-Friendly Discover
          </button>
        </div>
        {connected && (
          <button
            onClick={disconnect}
            className="ml-auto p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            title="Disconnect SoundCloud"
            data-testid="button-disconnect-soundcloud"
          >
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        )}
      </div>

      {view === "discover" && discoverTracks.length > 0 && (
        <div className="flex items-start gap-2 bg-purple-500/8 border border-purple-500/20 rounded-xl px-3 py-2">
          <Radio className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/50">
            Tracks tagged "DJ-Friendly" by independent artists — explicitly shared for mixing use.
            <span className="ml-1 text-purple-400">INDIE</span> badge indicates emerging/independent artists.
          </p>
        </div>
      )}

      {view === "liked" && !connected && (
        <div className="text-center py-6 space-y-3">
          <div className="text-4xl">☁️</div>
          <p className="text-xs text-white/50">Connect your SoundCloud account to access your liked tracks and playlists.</p>
          <button
            onClick={connect}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: "#ff5500" }}
            data-testid="button-connect-soundcloud"
          >
            Connect SoundCloud
          </button>
          <div className="pt-1">
            <Link href="/setup-guide" className="text-[10px] text-white/30 hover:text-white/50 underline">
              Need API keys? See the Setup Guide
            </Link>
          </div>
        </div>
      )}

      {(view === "discover" || connected) && (
        loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {displayTracks.map(track => (
              <TrackRow key={track.id} track={track} onAdd={onAdd} color="#ff5500" />
            ))}
            {displayTracks.length === 0 && (
              <p className="text-center text-[10px] text-white/25 py-6">
                {view === "liked" ? "No liked tracks found" : "No DJ-friendly tracks found at this time"}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ─── Local Files Tab ──────────────────────────────────────────────────────────

function LocalFilesTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-[#30d158]/8 border border-[#30d158]/20 rounded-xl px-3 py-2.5">
        <Check className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/60 leading-relaxed">
          <strong className="text-white/80">Full audio engine available!</strong> Your uploaded files support BPM sync, EQ, effects, stem separation and all deck features.
        </p>
      </div>
      <div className="space-y-2 text-[10px] text-white/50">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-lg">📁</span>
          <div>
            <p className="font-bold text-white/70">Your Music Files</p>
            <p>Upload MP3, WAV, FLAC, or any audio file. Use the <strong>Load</strong> or <strong>Add Songs</strong> buttons on each deck.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-lg">🗂️</span>
          <div>
            <p className="font-bold text-white/70">Music Folder</p>
            <p>Use the <strong>Add Folder</strong> button inside the deck playlist to load an entire music folder at once.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Platform Library Browser ───────────────────────────────────────────

const TABS = [
  { id: "local", label: "Local Files", icon: "📁", color: "#bf5af2" },
  { id: "spotify", label: "Spotify", icon: "🎧", color: "#1db954" },
  { id: "apple", label: "Apple Music", icon: "🍎", color: "#fc3c44" },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "#ff0000" },
  { id: "soundcloud", label: "SoundCloud", icon: "☁️", color: "#ff5500" },
] as const;

type TabId = typeof TABS[number]["id"];

export function PlatformLibraryBrowser({ activeDeck, onAddToQueue }: PlatformLibraryBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabId>("local");
  const { toast } = useToast();

  function handleAddToQueue(track: PlatformTrack) {
    onAddToQueue?.(track);
    toast({
      title: `Added to Deck ${activeDeck ?? "A"}`,
      description: `${track.title} — ${track.artist}`,
    });
  }

  const tab = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-white/40" />
          <span className="text-xs font-bold text-white/60">Library Browser</span>
        </div>
        <Link href="/setup-guide">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/8 transition-all"
            data-testid="button-setup-guide"
          >
            <BookOpen className="w-3 h-3" />
            Setup Guide
          </button>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:scale-105"
            style={activeTab === t.id
              ? { background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}40` }
              : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }
            }
            data-testid={`button-tab-${t.id}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass-panel rounded-2xl p-3" style={{ borderColor: `${tab.color}15` }}>
        {activeTab === "local" && <LocalFilesTab />}
        {activeTab === "spotify" && <SpotifyTab onAdd={handleAddToQueue} color="#1db954" />}
        {activeTab === "apple" && <AppleMusicTab onAdd={handleAddToQueue} color="#fc3c44" />}
        {activeTab === "youtube" && <YouTubeTab onAdd={handleAddToQueue} color="#ff0000" />}
        {activeTab === "soundcloud" && <SoundCloudTab onAdd={handleAddToQueue} color="#ff5500" />}
      </div>
    </div>
  );
}

// Re-export legacy PlatformSync name for backward compat
export { PlatformLibraryBrowser as PlatformSync };
