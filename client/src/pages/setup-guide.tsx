import { ArrowLeft, ExternalLink, Key, Music, Youtube, Radio, Apple } from "lucide-react";
import { Link } from "wouter";

interface Step {
  step: number;
  title: string;
  description: string;
}

interface PlatformGuide {
  id: string;
  name: string;
  icon: string;
  color: string;
  envVars: { name: string; description: string }[];
  applyUrl: string;
  applyLabel: string;
  steps: Step[];
  notes?: string[];
}

const GUIDES: PlatformGuide[] = [
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎧",
    color: "#1db954",
    envVars: [
      { name: "SPOTIFY_CLIENT_ID", description: "Your Spotify app Client ID" },
      { name: "SPOTIFY_CLIENT_SECRET", description: "Your Spotify app Client Secret" },
    ],
    applyUrl: "https://developer.spotify.com/dashboard",
    applyLabel: "Spotify Developer Dashboard",
    steps: [
      { step: 1, title: "Create a Spotify account", description: "Go to spotify.com and sign up if you don't already have an account. A Spotify Premium subscription is needed for full playback." },
      { step: 2, title: "Open the Developer Dashboard", description: "Visit developer.spotify.com/dashboard and log in with your Spotify account." },
      { step: 3, title: "Create a new app", description: "Click 'Create App'. Give it a name like 'My DJ Platform'. Set the redirect URI to: https://your-app-domain.com/api/platform/spotify/callback" },
      { step: 4, title: "Copy your credentials", description: "After creating the app, click 'Settings'. You'll see the Client ID. Click 'View client secret' to reveal the secret." },
      { step: 5, title: "Add to environment variables", description: "In Replit, click the padlock icon (Secrets) and add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET with the values you copied." },
    ],
    notes: [
      "Commercial use of Spotify in DJ performances requires a separate agreement with Spotify. See developer.spotify.com/terms",
      "New Spotify apps are in 'Development mode' — you can add up to 25 users. To open it to all users, apply for Extended Quota Mode.",
    ],
  },
  {
    id: "apple",
    name: "Apple Music",
    icon: "🍎",
    color: "#fc3c44",
    envVars: [
      { name: "APPLE_TEAM_ID", description: "Your Apple Developer Team ID (10 characters)" },
      { name: "APPLE_KEY_ID", description: "The Key ID of your MusicKit private key" },
      { name: "APPLE_PRIVATE_KEY", description: "The full content of your .p8 private key file" },
    ],
    applyUrl: "https://developer.apple.com",
    applyLabel: "Apple Developer Portal",
    steps: [
      { step: 1, title: "Join the Apple Developer Program", description: "Go to developer.apple.com and enroll. This requires an annual fee of $99/year. You need an Apple ID." },
      { step: 2, title: "Find your Team ID", description: "Log in to developer.apple.com, click your name in the top right, and go to 'Membership details'. Copy the 10-character Team ID." },
      { step: 3, title: "Create a MusicKit key", description: "In the Apple Developer portal, go to Certificates, Identifiers & Profiles → Keys. Click '+' to create a new key. Enable MusicKit and give it a name." },
      { step: 4, title: "Download the private key", description: "After creating the key, download the .p8 file (you can only download it once!). Also note the Key ID shown on the page." },
      { step: 5, title: "Add to environment variables", description: "In Replit Secrets, add APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY. For the private key, paste the entire contents of the .p8 file, replacing actual newlines with \\n." },
    ],
    notes: [
      "Users must have an active Apple Music subscription to use this integration.",
      "MusicKit JS only works in the browser — it uses Apple's own player for playback.",
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    color: "#ff0000",
    envVars: [
      { name: "YOUTUBE_API_KEY", description: "Your Google Cloud YouTube Data API v3 key" },
    ],
    applyUrl: "https://console.cloud.google.com",
    applyLabel: "Google Cloud Console",
    steps: [
      { step: 1, title: "Create a Google Cloud account", description: "Go to console.cloud.google.com and sign in with your Google account. New accounts get free credits." },
      { step: 2, title: "Create a project", description: "Click 'New Project' in the top menu. Give it a name like 'DJ Platform'. Click Create." },
      { step: 3, title: "Enable YouTube Data API v3", description: "Go to 'APIs & Services' → 'Library'. Search for 'YouTube Data API v3'. Click on it and then click 'Enable'." },
      { step: 4, title: "Create an API key", description: "Go to 'APIs & Services' → 'Credentials'. Click 'Create Credentials' → 'API Key'. Copy the generated key." },
      { step: 5, title: "Restrict the key (recommended)", description: "Click 'Edit API key'. Under 'API restrictions', select 'Restrict key' and choose 'YouTube Data API v3'. Save." },
      { step: 6, title: "Add to environment variables", description: "In Replit Secrets, add YOUTUBE_API_KEY with the key you created." },
    ],
    notes: [
      "The free tier allows 10,000 units per day. A search query costs 100 units, so you get ~100 searches per day for free.",
      "Only standard YouTube videos are supported — not YouTube Music (which has no public API).",
      "Videos play in an embedded player. Audio cannot be routed through the DJ effects engine.",
    ],
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "☁️",
    color: "#ff5500",
    envVars: [
      { name: "SOUNDCLOUD_CLIENT_ID", description: "Your SoundCloud app Client ID" },
      { name: "SOUNDCLOUD_CLIENT_SECRET", description: "Your SoundCloud app Client Secret" },
    ],
    applyUrl: "https://developers.soundcloud.com",
    applyLabel: "SoundCloud Developer Portal",
    steps: [
      { step: 1, title: "Create a SoundCloud account", description: "Go to soundcloud.com and create an account if you don't have one." },
      { step: 2, title: "Apply for API access", description: "Visit developers.soundcloud.com and click the button to apply for API access. Fill in the form with your app details and use case." },
      { step: 3, title: "Wait for approval", description: "SoundCloud reviews API applications manually. This can take a few days to a few weeks. You'll receive an email when approved." },
      { step: 4, title: "Create an app", description: "Once approved, log in to soundcloud.com/you/apps. Click 'Register a new application'. Enter your app name and the redirect URI: https://your-app-domain.com/api/platform/soundcloud/callback" },
      { step: 5, title: "Copy credentials", description: "After creating the app, you'll see the Client ID and Client Secret on the app settings page." },
      { step: 6, title: "Add to environment variables", description: "In Replit Secrets, add SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET." },
    ],
    notes: [
      "SoundCloud is the best platform for finding independent and emerging artist music for DJ use.",
      "Many SoundCloud tracks are explicitly tagged as 'Free Download' or 'DJ Friendly' by their creators.",
      "Public track discovery works without OAuth — only personal liked tracks require login.",
    ],
  },
];

function PlatformGuideCard({ guide }: { guide: PlatformGuide }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden" style={{ borderColor: `${guide.color}20` }}>
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{guide.icon}</span>
          <div>
            <h2 className="text-sm font-black text-white">{guide.name}</h2>
            <a
              href={guide.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] hover:underline mt-0.5"
              style={{ color: guide.color }}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {guide.applyLabel}
            </a>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Environment Variables */}
        <div>
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Key className="w-3 h-3" />
            Required Environment Variables (Secrets)
          </p>
          <div className="space-y-1.5">
            {guide.envVars.map(v => (
              <div key={v.name} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
                <code className="text-[10px] font-mono shrink-0" style={{ color: guide.color }}>{v.name}</code>
                <span className="text-[10px] text-white/40">{v.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div>
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-3">Step-by-Step Setup</p>
          <div className="space-y-3">
            {guide.steps.map(s => (
              <div key={s.step} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                  style={{ background: `${guide.color}20`, color: guide.color }}
                >
                  {s.step}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/80">{s.title}</p>
                  <p className="text-[10px] text-white/45 leading-relaxed mt-0.5">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {guide.notes && guide.notes.length > 0 && (
          <div className="space-y-1.5">
            {guide.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#ffd60a]/5 border border-[#ffd60a]/15">
                <span className="text-[10px] text-[#ffd60a] shrink-0 mt-0.5">ℹ</span>
                <p className="text-[10px] text-white/45 leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupGuide() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link href="/console">
            <button className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors mb-4" data-testid="button-back-to-console">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to DJ Console
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#bf5af2] to-[#0af] flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Platform Integration Setup Guide</h1>
              <p className="text-xs text-white/40 mt-0.5">Step-by-step instructions for connecting Spotify, Apple Music, YouTube, and SoundCloud</p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="glass-panel rounded-2xl px-5 py-4 border-[#bf5af2]/20">
          <p className="text-[11px] text-white/55 leading-relaxed">
            Each platform integration requires API credentials from the platform's developer portal. This guide walks you through getting those credentials step-by-step — no technical experience required. All keys are stored securely as environment variables (Secrets) in Replit and are never exposed to the public.
          </p>
        </div>

        {/* Platform guides */}
        {GUIDES.map(guide => (
          <PlatformGuideCard key={guide.id} guide={guide} />
        ))}

        {/* .env.example reference */}
        <div className="glass-panel rounded-2xl px-5 py-4">
          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">All Environment Variables Reference</p>
          <p className="text-[10px] text-white/40 mb-3">A <code className="text-[#bf5af2]">.env.example</code> file in the project root documents all required variables.</p>
          <div className="space-y-1 font-mono text-[9px]">
            {[
              "SPOTIFY_CLIENT_ID=your_spotify_client_id",
              "SPOTIFY_CLIENT_SECRET=your_spotify_client_secret",
              "APPLE_TEAM_ID=your_apple_team_id",
              "APPLE_KEY_ID=your_apple_key_id",
              "APPLE_PRIVATE_KEY=your_apple_private_key_p8_contents",
              "YOUTUBE_API_KEY=your_youtube_data_api_v3_key",
              "SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id",
              "SOUNDCLOUD_CLIENT_SECRET=your_soundcloud_client_secret",
            ].map(line => (
              <div key={line} className="px-3 py-1 rounded bg-white/5 text-white/50">{line}</div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-white/20 pb-4">
          Back to{" "}
          <Link href="/console" className="text-[#bf5af2] hover:underline">DJ Console</Link>
        </p>
      </div>
    </div>
  );
}
