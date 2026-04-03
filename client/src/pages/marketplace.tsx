import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Music, Search, Play, Pause, Download, Check, Filter, Shield, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  isrc: string | null;
  licenseType: string;
  royaltyRate: number | null;
  playCount: number;
  fileUrl: string;
  previewUrl: string | null;
  available: boolean;
  createdAt: string;
}

const LICENSE_COLORS: Record<string, string> = { free: "#30d158", royalty: "#ffd60a", promo: "#0af" };
const LICENSE_LABELS: Record<string, string> = { free: "Free", royalty: "Royalty", promo: "Promo" };
const LICENSE_DESCRIPTIONS: Record<string, string> = {
  free: "Free for DJ use — no royalty required",
  royalty: "Royalty per play — rate charged when played at events",
  promo: "Exclusive Promo — credit artist in your setlist",
};

const GENRES = ["All", "Electronic", "House", "Techno", "Hip-Hop", "Pop", "R&B", "Afrobeats", "Reggaeton", "Jazz", "Other"];

export default function MarketplacePage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [licenseType, setLicenseType] = useState("All");
  const [minBpm, setMinBpm] = useState("");
  const [maxBpm, setMaxBpm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const queryParams = new URLSearchParams();
  if (genre !== "All") queryParams.set("genre", genre);
  if (licenseType !== "All") queryParams.set("licenseType", licenseType);
  if (minBpm) queryParams.set("minBpm", minBpm);
  if (maxBpm) queryParams.set("maxBpm", maxBpm);
  const queryString = queryParams.toString();

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/tracks${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Failed to load tracks");
      return res.json();
    },
  });

  const filtered = tracks.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artistName.toLowerCase().includes(q) || t.genre?.toLowerCase().includes(q);
  });

  const handlePreview = (track: Track) => {
    if (previewingId === track.id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const url = track.previewUrl || track.fileUrl;
    audioRef.current = new Audio(url);
    audioRef.current.play().catch(() => {});
    setPreviewingId(track.id);
    audioRef.current.addEventListener("ended", () => setPreviewingId(null));
  };

  const handleAddToDeck = async (track: Track) => {
    try {
      await fetch("/api/play-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          trackTitle: track.title,
          artistName: track.artistName,
          isrc: track.isrc,
          licenseType: track.licenseType,
          royaltyAmount: track.licenseType === "royalty" ? (track.royaltyRate || 0) : 0,
          eventName: "Marketplace Download",
        }),
      });
    } catch {}
    setDownloadedIds((prev) => new Set(prev).add(track.id));
    setAddedIds((prev) => new Set(prev).add(track.id));
    setTimeout(() => {
      setAddedIds((prev) => { const n = new Set(prev); n.delete(track.id); return n; });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <audio ref={audioRef} className="hidden" />
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <Music className="w-6 h-6 text-[#ffd60a]" />
          <h1 className="text-lg font-black text-[#ffd60a]">MUSIC MARKETPLACE</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/artist/dashboard")} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#ffd60a] bg-[#ffd60a]/10 hover:bg-[#ffd60a]/20 transition-colors" data-testid="button-artist-dashboard">
            Artist Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-[#0af]/5 border border-[#0af]/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-[#0af] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#0af] mb-1">About Marketplace Tracks</p>
              <p className="text-xs text-white/60 leading-relaxed">
                All tracks are uploaded by independent artists who own the rights to their music. Venue performance licenses (ASCAP/BMI/SESAC) remain your responsibility as a DJ. The marketplace license covers only the artist-to-DJ arrangement.{" "}
                <button onClick={() => navigate("/compliance")} className="text-[#0af] hover:underline">Learn more</button>
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tracks, artists, genres..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors" data-testid="input-search-tracks" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${showFilters ? "bg-[#ffd60a] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`} data-testid="button-toggle-filters">
            <Filter className="w-4 h-4" />Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40">Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" data-testid="select-genre-filter">
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40">License</label>
              <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" data-testid="select-license-filter">
                <option value="All">All Licenses</option>
                <option value="free">Free</option>
                <option value="royalty">Royalty</option>
                <option value="promo">Promo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40">Min BPM</label>
              <input value={minBpm} onChange={(e) => setMinBpm(e.target.value)} type="number" placeholder="e.g. 120" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" data-testid="input-min-bpm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40">Max BPM</label>
              <input value={maxBpm} onChange={(e) => setMaxBpm(e.target.value)} type="number" placeholder="e.g. 140" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none" data-testid="input-max-bpm" />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16">
            <Music className="w-10 h-10 text-white/20 mx-auto mb-3 animate-pulse" />
            <p className="text-white/30 text-sm">Loading tracks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No tracks found.</p>
            <p className="text-white/20 text-xs mt-2">Are you an artist? <button onClick={() => navigate("/artist/dashboard")} className="text-[#ffd60a] hover:underline">Upload your tracks</button></p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-white/30">{filtered.length} track{filtered.length !== 1 ? "s" : ""} available</p>
            {filtered.map((track) => (
              <div key={track.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-colors" data-testid={`track-card-${track.id}`}>
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handlePreview(track)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
                    style={{ background: previewingId === track.id ? LICENSE_COLORS[track.licenseType] : `${LICENSE_COLORS[track.licenseType]}20`, border: `1.5px solid ${LICENSE_COLORS[track.licenseType]}40` }}
                    data-testid={`button-preview-${track.id}`}
                  >
                    {previewingId === track.id ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4" style={{ color: LICENSE_COLORS[track.licenseType] }} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${LICENSE_COLORS[track.licenseType]}20`, color: LICENSE_COLORS[track.licenseType] }}>
                        {LICENSE_LABELS[track.licenseType]}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-1">{track.artistName}</p>
                    <p className="text-[10px] text-white/30">
                      {[track.genre, track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(" · ")}
                      {track.isrc && ` · ISRC: ${track.isrc}`}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: LICENSE_COLORS[track.licenseType] }}>
                      {LICENSE_DESCRIPTIONS[track.licenseType]}
                      {track.licenseType === "royalty" && track.royaltyRate && ` — $${track.royaltyRate.toFixed(2)}/play`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-[10px] text-white/30">{track.playCount} plays</p>
                    <button
                      onClick={() => handleAddToDeck(track)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
                      style={downloadedIds.has(track.id) ? { background: "#30d15820", color: "#30d158" } : { background: `${LICENSE_COLORS[track.licenseType]}20`, color: LICENSE_COLORS[track.licenseType] }}
                      data-testid={`button-add-to-deck-${track.id}`}
                    >
                      {addedIds.has(track.id) ? (
                        <><Check className="w-3 h-3" /> Added!</>
                      ) : downloadedIds.has(track.id) ? (
                        <><Download className="w-3 h-3" /> Download Again</>
                      ) : (
                        <><Download className="w-3 h-3" /> Add to Deck</>
                      )}
                    </button>
                  </div>
                </div>

                {previewingId === track.id && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5 items-end h-4">
                        {[1,2,3,4,5,6,7,8].map((i) => (
                          <div key={i} className="w-1 rounded-full animate-pulse" style={{ height: `${30 + Math.random() * 70}%`, background: LICENSE_COLORS[track.licenseType], animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                      <p className="text-xs text-white/40">Previewing (30s clip)...</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-xs text-white/30 mb-2">Are you an artist? Share your music with DJs worldwide.</p>
          <button onClick={() => navigate("/artist/dashboard")} className="px-6 py-2.5 rounded-xl font-bold text-black text-xs bg-[#ffd60a] hover:scale-[1.02] transition-all" data-testid="button-become-artist">
            Upload Your Music
          </button>
        </div>
      </main>
    </div>
  );
}
