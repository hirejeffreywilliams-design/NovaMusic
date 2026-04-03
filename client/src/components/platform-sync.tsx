import { useState } from "react";
import { Music, ExternalLink, Check, Lock, Info, Upload, X, AlertTriangle } from "lucide-react";

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: "available" | "coming" | "upload";
  description: string;
  action?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "files",
    name: "Your Music Files",
    icon: "📁",
    color: "#bf5af2",
    status: "available",
    description: "Upload MP3, WAV, FLAC or any audio file directly from your device. Works offline, no account needed.",
    action: "Already supported — use the Load or Playlist buttons on each deck!",
  },
  {
    id: "folder",
    name: "Music Folder / Playlist",
    icon: "🗂️",
    color: "#0af",
    status: "available",
    description: "Select your entire Music folder or a playlist folder and all songs load automatically into the queue.",
    action: "Use the 'Add Folder' button inside each deck's playlist.",
  },
  {
    id: "apple",
    name: "Apple Music",
    icon: "🍎",
    color: "#fc3c44",
    status: "coming",
    description: "Connect your Apple Music library to browse and load songs directly. Requires an active Apple Music subscription.",
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎧",
    color: "#1db954",
    status: "coming",
    description: "Import your Spotify playlists and queue songs from your library. Requires a Spotify Premium account.",
  },
  {
    id: "youtube",
    name: "YouTube Music",
    icon: "▶️",
    color: "#ff0000",
    status: "coming",
    description: "Pull in songs from YouTube Music playlists. Requires a YouTube Premium account.",
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "☁️",
    color: "#ff5500",
    status: "coming",
    description: "Access your SoundCloud likes and playlists for mixing.",
  },
];

function SpotifyDisclaimerModal({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "#0d0520", border: "1px solid rgba(29,185,84,0.25)" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#1db954] shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-white text-sm mb-1">Spotify Integration Notice</div>
            <p className="text-[11px] text-white/55 leading-relaxed">
              Spotify integration is for personal library access only. Using Spotify audio in commercial DJ performances may require a separate agreement with Spotify. By connecting, you acknowledge this limitation.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/40 border border-white/10 hover:bg-white/5 transition-colors"
            data-testid="button-spotify-disclaimer-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all"
            style={{ background: "#1db954" }}
            data-testid="button-spotify-disclaimer-accept"
          >
            I Understand, Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function AppleMusicNotice({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "#0d0520", border: "1px solid rgba(252,60,68,0.25)" }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#fc3c44] shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-white text-sm mb-1">Apple Music Notice</div>
            <p className="text-[11px] text-white/55 leading-relaxed">
              Apple Music playback requires an active Apple Music subscription. All licensing terms from Apple apply to content played through this integration.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-xs font-black text-white transition-all"
          style={{ background: "#fc3c44" }}
          data-testid="button-apple-notice-ok"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

export function PlatformSync() {
  const [expanded, setExpanded] = useState<string | null>("files");
  const [showSpotifyDisclaimer, setShowSpotifyDisclaimer] = useState(false);
  const [showAppleNotice, setShowAppleNotice] = useState(false);

  const handlePlatformClick = (platformId: string) => {
    if (platformId === "spotify") {
      setShowSpotifyDisclaimer(true);
      return;
    }
    if (platformId === "apple") {
      setShowAppleNotice(true);
      return;
    }
    setExpanded(expanded === platformId ? null : platformId);
  };

  return (
    <>
      {showSpotifyDisclaimer && (
        <SpotifyDisclaimerModal
          onAccept={() => {
            setShowSpotifyDisclaimer(false);
            setExpanded("spotify");
          }}
          onClose={() => setShowSpotifyDisclaimer(false)}
        />
      )}
      {showAppleNotice && (
        <AppleMusicNotice onClose={() => { setShowAppleNotice(false); setExpanded("apple"); }} />
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-2 bg-[#ffd60a]/8 border border-[#ffd60a]/20 rounded-xl px-3 py-2.5">
          <Info className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
          <p className="text-[10px] text-white/50 leading-relaxed">
            <strong className="text-white/70">Your own music files work right now!</strong> Platform streaming (Apple Music, Spotify) is coming soon — it requires account connections we're building out.
          </p>
        </div>

        <div className="space-y-2">
          {PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className="glass-panel rounded-2xl overflow-hidden"
              style={{ borderColor: `${platform.color}${expanded === platform.id ? "25" : "12"}` }}
            >
              <button
                onClick={() => handlePlatformClick(platform.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                data-testid={`button-platform-${platform.id}`}
              >
                <span className="text-lg">{platform.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/80">{platform.name}</span>
                    {platform.status === "available" && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30">
                        READY
                      </span>
                    )}
                    {platform.status === "coming" && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/10 text-white/30 border border-white/10">
                        COMING SOON
                      </span>
                    )}
                  </div>
                </div>
                {platform.status === "available" ? (
                  <Check className="w-4 h-4 shrink-0" style={{ color: platform.color }} />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-white/20 shrink-0" />
                )}
              </button>

              {expanded === platform.id && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[10px] text-white/40 leading-relaxed">{platform.description}</p>
                  {platform.action && (
                    <div
                      className="flex items-start gap-2 rounded-xl px-3 py-2"
                      style={{ background: `${platform.color}12`, border: `1px solid ${platform.color}25` }}
                    >
                      <Check className="w-3 h-3 shrink-0 mt-0.5" style={{ color: platform.color }} />
                      <p className="text-[10px] leading-relaxed" style={{ color: platform.color }}>
                        {platform.action}
                      </p>
                    </div>
                  )}
                  {platform.status === "coming" && (
                    <div className="flex items-center gap-2 text-[10px] text-white/25 pt-1">
                      <Lock className="w-3 h-3" />
                      <span>We're working on adding this integration. Check back soon!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
