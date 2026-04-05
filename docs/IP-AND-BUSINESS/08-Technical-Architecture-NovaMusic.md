# TECHNICAL ARCHITECTURE DOCUMENT

**Title:** Technical Architecture — NovaMusic Social AI Music Experience Platform

**Owner:** Jeffrey W. Williams / Jeffrey W. Williams LLC
**Entity:** OmniDLOS Holdings
**Date:** April 4, 2026
**Codebase:** 28,871 lines of production code, 131 source files
**Classification:** CONFIDENTIAL — Owner Eyes Only

© 2026 OmniDLOS Holdings. All Rights Reserved.

---

## EXECUTIVE SUMMARY

NovaMusic is a full-stack TypeScript web application implementing a Social AI Music Experience platform. The system is architecturally divided into three primary layers: a React 18 frontend delivering three distinct user experiences (AI DJ Mode, DJ Console, Party Mode), a Node.js/Express.js backend providing AI processing, authentication, real-time communication, and business logic, and a PostgreSQL database (with in-memory development runtime) for persistent data storage.

The platform's most architecturally distinctive element is its use of the browser's native Web Audio API for professional-grade audio processing — enabling a four-deck mixer with the full signal chain of a professional DAW (Digital Audio Workstation) without any native code, plugins, or desktop installation. This architecture, combined with native WebRTC for peer-to-peer audio broadcast and WebSocket for real-time crowd engagement, constitutes a genuinely novel browser-native entertainment platform stack.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSERS                               │
│                                                                     │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ AI DJ Mode │  │   DJ Console   │  │     Party Mode /       │   │
│  │ (React SPA)│  │ (React SPA +   │  │     Crowd Page         │   │
│  │            │  │  Web Audio API │  │   (React SPA)          │   │
│  └────────────┘  └──────┬─────────┘  └──────────┬─────────────┘   │
│                         │ Web Audio API           │ WebSocket       │
│                         │ (audio graph)           │ (crowd events)  │
│                         │ WebRTC (broadcast)      │                 │
└─────────────────────────┼─────────────────────────┼─────────────────┘
                          │ HTTPS REST API           │ WebSocket /ws
                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NODE.JS / EXPRESS.JS SERVER                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  AI DJ API   │  │  Crowd Hub   │  │   Artist Marketplace     │ │
│  │  /api/ai-dj  │  │  API +       │  │   API + Royalty Engine   │ │
│  │  (GPT-4.1-   │  │  WebSocket   │  │   /api/tracks            │ │
│  │   mini)      │  │  /ws         │  │   /api/play-events       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Auth API    │  │  Platform    │  │  Admin Royalty API       │ │
│  │  Passport.js │  │  Integration │  │  /api/admin/royalties    │ │
│  │  /api/auth   │  │  Spotify,    │  │                          │ │
│  │              │  │  Apple,YT,SC │  │                          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM → PostgreSQL / MemStorage            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────────────┐
           ▼              ▼                      ▼
    ┌──────────┐  ┌──────────────┐      ┌──────────────┐
    │ OpenAI   │  │  DuckDuckGo  │      │  Jamendo API │
    │ GPT-4.1- │  │  Search API  │      │  (music      │
    │ mini     │  │  (trending)  │      │   catalog)   │
    └──────────┘  └──────────────┘      └──────────────┘
```

---

## FRONTEND ARCHITECTURE

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 18.x | Component-based UI |
| Language | TypeScript | 5.x | Type safety |
| Routing | Wouter | latest | Lightweight client-side router |
| Server State | TanStack React Query | v5 | API data fetching + caching |
| UI Components | shadcn/ui (Radix UI) | latest | Accessible component library |
| Styling | Tailwind CSS | v3 | Utility-first CSS |
| Animation | Framer Motion | v11 | Fluid UI animations |
| Build Tool | Vite | v7 | Fast bundling + HMR |
| Fonts | Oxanium | external | Galactic header font |

### Audio Processing Layer (Client-Side)

| API | Purpose |
|---|---|
| Web Audio API (native) | Complete 4-deck DJ audio signal chain |
| Canvas API (native) | Waveform rendering, visualizers, QR codes |
| MediaRecorder API (native) | Mix recording to downloadable audio blob |
| MediaStream API (native) | Audio capture for WebRTC broadcast |

### Real-Time Communication (Client-Side)

| API | Purpose |
|---|---|
| WebSocket (native browser) | Crowd engagement events, DJ coaching, mood sync |
| WebRTC RTCPeerConnection | Peer-to-peer DJ audio broadcast to crowd phones |

### Client-Side Pages and Routes

| Route | Component | Description |
|---|---|---|
| `/` | Landing | Animated Hyperspace Warp Vortex + Retrowave Grid |
| `/ai-dj` | AI DJ Mode | Upload → Analyze → Setlist → Playing |
| `/console` | DJ Console | Full 4-deck professional mixer |
| `/party/:code?` | Party/Crowd | Party Mode + Crowd Page (QR code + engagement) |
| `/compliance` | Compliance | PRO licensing education |
| `/terms` | Terms | Terms of Service |
| `/privacy` | Privacy | Privacy Policy |
| `/dmca` | DMCA | Takedown notice submission |
| `/signup` | Signup | DJ / Artist account creation |
| `/pricing` | Pricing | Subscription tier selection |
| `/artist/dashboard` | Artist Dashboard | Track catalog, earnings, payouts |
| `/marketplace` | Marketplace | Browse/search artist tracks |
| `/admin/royalties` | Admin | Royalty management |
| `/event-history` | Event History | Play log + CSV export |
| `/setup-guide` | Setup Guide | Platform integration guide |
| `/setlist/:code` | Setlist | Read-only event recap |

### Key Frontend Components

| Component | File | Description |
|---|---|---|
| useAudioEngine | `use-audio-engine.ts` | Core Web Audio API hook — 4-deck signal chains, key detection, landmark detection, recording |
| useWebRTCBroadcast | `use-webrtc-broadcast.ts` | WebRTC DJ broadcast hook — per-listener RTCPeerConnections |
| AIAssistant | `ai-dj-assistant.tsx` | AI DJ panel — Live Hype Score, Energy Curve, Global Trend Radar, DJ Jeff Chat |
| CrowdHub | `crowd-hub.tsx` | DJ crowd management panel — RPM meter, request queue, tip overlay, mood board, battle |
| DJConsole | `dj-console.tsx` | Full DJ mixer — 4 decks, crossfaders, EQ, FX, visualizers, waveforms, hot cues |
| JamendoLibrary | `jamendo-music-library.tsx` | Royalty-free music browser with BPM/key filtering and deck auto-loading |
| LyricsPanel | `lyrics-panel.tsx` | DJ lyrics view + crowd sing-along broadcast |
| TipAnimationOverlay | `tip-animation-overlay.tsx` | Tiered tip visualization with confetti particle system |
| EmojiStormOverlay | `party-mode.tsx::EmojiStormOverlay` | CSS keyframe emoji particle animations |
| VibeMeter | `party-mode.tsx::VibeMeter` | Sine-wave-animated crowd energy gauge |
| GenreRoulette | `party-mode.tsx::GenreRoulette` | Decelerating-tick genre randomizer animation |

---

## BACKEND ARCHITECTURE

### Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | JavaScript server runtime |
| Language | TypeScript | 5.x | Type safety |
| Framework | Express.js | v5 | HTTP server framework |
| ORM | Drizzle ORM | v0.39 | Type-safe PostgreSQL access |
| Database | PostgreSQL | 16.x (prod) | Persistent data storage |
| Dev Database | MemStorage | in-memory | Development runtime |
| File Handling | Multer | v2 | Audio file uploads (up to 100MB) |
| AI | OpenAI API | GPT-4.1-mini | Track analysis, coaching, chat |
| Audio Metadata | music-metadata | npm | BPM, key, title from audio headers |
| Auth | Passport.js | local strategy | Username/password authentication |
| Sessions | express-session + memorystore | — | Server-side session management |
| JWT | jsonwebtoken | — | Token-based API access |
| WebSocket | ws | v8 | Native Node.js WebSocket server |
| QR Codes | qrcode | npm | Event QR code generation |

### API Architecture

#### AI DJ Endpoints

```
POST /api/ai-dj/analyze-tracks
  → Multer upload (max 50 files, 100MB each)
  → music-metadata extraction per file
  → GPT-4.1-mini analysis with genre BPM priors
  → DuckDuckGo trend verification
  → Returns: AnalyzedTrack[] with fire zones, BPM, key, energy, genre, isTrending

POST /api/ai-dj/build-setlist
  → Takes AnalyzedTrack[]
  → Executes scoreMixTransition() for all pairs
  → Runs buildOptimalOrder() greedy algorithm
  → Returns: ordered TrackInfo[], TransitionPlan[], AI commentary (SSE stream)

POST /api/ai-dj/auto-mix-plan
  → Takes ordered AnalyzedTrack[]
  → Generates millisecond-timestamped mixer action sequence
  → Returns: {actions: MixerAction[]}

POST /api/ai-dj/chat (SSE)
  → Receives {message, deckContext} — deck context includes current track names and BPMs
  → Streams GPT-4.1-mini DJ Jeff response via Server-Sent Events
  → Domain-restricted to music/DJing

POST /api/ai-dj/transition-advice (SSE)
  → Receives current tracks on two decks
  → Streams specific transition technique advice

POST /api/ai-dj/vibe-tips (SSE)
  → Receives vibe type (chill/hype/balanced)
  → Streams 3 vibe-specific DJ tips
```

#### WebSocket Protocol (ws v8)

The WebSocket server handles real-time bidirectional communication for the crowd engagement system:

```typescript
// Room structure
const rooms: Map<string, Set<WebSocketClient>> = new Map();

// Message types (client → server):
"ping"                  → keepalive
"join_event"            → join event room with type (dj/crowd/battle-dj)
"request_offer"         → WebRTC signaling: listener requests SDP offer
"rtc_answer"            → WebRTC signaling: listener sends SDP answer
"rtc_ice"               → WebRTC signaling: ICE candidate exchange

// Message types (server → client):
"pong"                  → keepalive response
"listener_update"       → connected listener count + list
"new_request"           → new song request (DJ only)
"priority_request"      → new paid priority request (DJ only)
"request_updated"       → request status change
"new_reaction"          → emoji reaction (DJ display)
"new_poll_vote"         → poll vote update
"new_shoutout"          → new paid shoutout (DJ only)
"new_tip"               → new tip with tier info (DJ only)
"tip_goal_reached"      → tip goal achievement trigger
"mood_update"           → mood color/keyword broadcast (ALL clients)
"crowd_sing"            → lyric line broadcast (ALL clients)
"lyrics_line"           → DJ's current lyric line index (ALL clients)
"crowd_coach"           → AI coaching message (DJ only)
"rtc_broadcasting"      → DJ is broadcasting (triggers listener offer request)
"rtc_offer"             → WebRTC SDP offer (crowd client)
"rtc_ice"               → WebRTC ICE candidate (crowd client)
"battle_vote_update"    → real-time battle vote counts (ALL clients)
```

#### AI Crowd Coach (Server-Side Scheduled Function)

```typescript
// Runs every 60 seconds server-side:
setInterval(async () => {
  for (const [eventId, event] of activeEvents) {
    const rpm = getReactionRPM(eventId);  // reactions in last 60 seconds
    if (rpm < 3) {
      const topRequests = getTopPendingRequests(eventId, 3);
      const coachingMessage = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: buildCoachingPrompt(rpm, crowdSize, topRequests) }]
      });
      broadcastToDJOnly(eventId, { type: "crowd_coach", message: coachingMessage });
    }
  }
}, 60000);
```

---

## DATABASE ARCHITECTURE

### Persisted Tables (PostgreSQL via Drizzle ORM)

```sql
-- USERS (authentication + account type)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'dj',  -- 'dj' | 'artist'
  tos_acknowledged_at TEXT,
  venue_license_acknowledged_at TEXT          -- PRO compliance timestamp
);

-- ARTIST PROFILES
CREATE TABLE artist_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  stage_name TEXT NOT NULL,
  bio TEXT,
  payout_info_placeholder TEXT,
  created_at TEXT NOT NULL
);

-- TRACKS (Artist Marketplace)
CREATE TABLE tracks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id VARCHAR NOT NULL REFERENCES artist_profiles(id),
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  genre TEXT,
  bpm INTEGER,
  key TEXT,
  isrc TEXT,                                  -- International Standard Recording Code
  license_type TEXT NOT NULL,                 -- 'free' | 'royalty' | 'promo'
  royalty_rate REAL,                          -- Artist-set rate: $0.01 - $1.00
  file_url TEXT NOT NULL,
  preview_url TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL
);

-- PLAY EVENTS (PRO compliance + royalty accounting)
CREATE TABLE play_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id VARCHAR,
  event_id TEXT,
  dj_user_id TEXT,
  track_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  label TEXT,
  isrc TEXT,                                  -- For PRO reporting
  license_type TEXT,
  duration INTEGER,
  royalty_amount REAL,
  played_at TEXT NOT NULL,
  event_name TEXT,                            -- Venue/event attribution
  venue_name TEXT
);

-- ROYALTY PAYOUTS
CREATE TABLE royalty_payouts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id VARCHAR NOT NULL,
  period TEXT NOT NULL,                       -- e.g., "2026-04"
  total_plays INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  platform_fee REAL NOT NULL,                 -- 15% of total_amount
  net_amount REAL NOT NULL,                   -- 85% of total_amount
  status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'paid'
  created_at TEXT NOT NULL,
  paid_at TEXT
);
```

### In-Memory Data Structures (Development Runtime)

```typescript
// Real-time event state (not yet persisted to PostgreSQL)
interface Event {
  id: string; code: string; name: string;
  djId: string; djName: string;
  status: "active" | "ended";
  battleMode: boolean;
  deckADjName?: string; deckBDjName?: string;
  moodColor?: string; moodKeyword?: string;
  nowPlaying?: string;
  createdAt: string; endedAt?: string;
}

// Crowd engagement data (persisted to PostgreSQL in production roadmap)
SongRequest  { id, eventId, crowdName, trackTitle, priorityPaid, priorityAmount, status, createdAt }
Reaction     { id, eventId, crowdName, emoji, createdAt }
Poll         { id, eventId, question, options, votes, active, createdAt }
Shoutout     { id, eventId, fromName, message, paid, amount, announced, createdAt }
Tip          { id, eventId, fromName, amount, platformCut, djShare, createdAt }
SetlistEntry { id, eventId, trackTitle, addedBy, playedAt }
Subscription { id, djId, tier, status, startedAt, expiresAt, dayPass, eventId }
BattleVote   { id, eventId, crowdName, deck, createdAt }
```

---

## AUDIO ENGINE ARCHITECTURE

### Web Audio API Signal Chain (Per Deck)

```
AudioBufferSourceNode (loaded decoded audio buffer)
        │
        ├─[bypass]──────────────────────────────────────────────────────┐
        │                                                                │
        └─[stems enabled]──►  StemsNode (router)                        │
                               ├── bassFilter (BiquadFilter: lowpass 250Hz)
                               │       └── bassGain (GainNode)
                               ├── midFilter (BiquadFilter: bandpass 1000Hz Q=0.7)
                               │       └── midGain (GainNode)
                               ├── highFilter (BiquadFilter: highpass 2000Hz)
                               │       └── highGain (GainNode)
                               └── vocalsFilter (BiquadFilter: bandpass 1500Hz Q=0.8)
                                       └── vocalsGain (GainNode)
                                           │
                                           ▼ (merged at mixer node)
                                    ┌──────────────┐
                                    │   EQ Chain   │
                                    │              │
                                    │  eqLow       │ (BiquadFilter: lowshelf 320Hz)
                                    │  eqMid       │ (BiquadFilter: peaking 1000Hz Q=0.5)
                                    │  eqHigh      │ (BiquadFilter: highshelf 3200Hz)
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ Variable     │
                                    │ Filter       │ (BiquadFilter: LP/HP switchable)
                                    └──────┬───────┘
                                           │
                          ┌────────────────┴──────────────────────┐
                          │                                        │
                       delayDry                             delayNode (DelayNode)
                     (GainNode)                                    │
                          │                               delayFeedback (GainNode) ◄─┐
                          │                                    delayWet │             │
                          │                                   (GainNode)             │
                          │                                        └──────────────────┘
                          └──────────────────┬─────────────────────┘
                                             │
                          ┌──────────────────┴──────────────────────┐
                          │                                         │
                       reverbDry                         reverbConvolver
                     (GainNode)                          (ConvolverNode)
                          │                               reverbWet
                          │                              (GainNode)
                          └──────────────────┬──────────────────────┘
                                             │
                                         gain (GainNode)
                                             │
                                      analyzer (AnalyserNode)
                                       fftSize: 2048
                                       smoothingTimeConstant: 0.8
                                             │
                                      talkoverGain (GainNode)
                                             │
                                    DynamicsCompressor
                                             │
                                       masterGain (GainNode)
                                             │
                                   masterAnalyzer (AnalyserNode)
                                       fftSize: 1024
                                             │
                            AudioContext.destination (speakers)
                                             │
                            MediaStreamAudioDestinationNode
                            (captures output for WebRTC broadcast
                             and MediaRecorder mix recording)
```

### Canvas Visualizer Modes

The DJ Console implements six canvas rendering visualizer modes drawn on `requestAnimationFrame`:

| Mode | Description | Algorithm |
|---|---|---|
| Bars | Classic frequency bars | FFT → bar heights mapped to frequencyBinCount |
| Circular | Radial bar display | Polar coordinates from FFT bins |
| Particles | Audio-reactive particle system | Particles spawned at frequency peaks |
| Wave | Waveform oscilloscope | Time-domain data from AnalyserNode.getByteTimeDomainData |
| Spectrum | Gradient spectrum waterfall | FFT scrolled vertically over time |
| Matrix | "Digital rain" effect | Character columns falling at audio-reactive speeds |

---

## PLATFORM INTEGRATION ARCHITECTURE

### External Platform Integrations

| Platform | Protocol | Features | Module |
|---|---|---|---|
| Spotify | OAuth 2.0 (authorization code + PKCE) | Playlist browse, saved tracks, search, audio features | `server/platform-routes.ts` |
| Apple Music | JWT (ES256 developer token) | Apple MusicKit JS on client | `server/platform-routes.ts` |
| YouTube | YouTube Data API v3 | Video search for DJ track discovery | `server/platform-routes.ts` |
| SoundCloud | (integration) | Track discovery | `server/platform-routes.ts` |
| Jamendo | REST API (proxied) | Royalty-free music catalog, BPM/key filtering | `client/src/components/jamendo-music-library.tsx` |
| DuckDuckGo | Instant Answer API | Real-time chart trend verification for AI DJ analysis | `server/ai-dj.ts` |
| OpenAI | REST API | GPT-4.1-mini for track analysis, coaching, chat, briefings | `server/ai-dj.ts` |
| Lyrist | REST API | Primary lyrics source | `client/src/components/lyrics-panel.tsx` |
| lyrics.ovh | REST API | Fallback lyrics source | `client/src/components/lyrics-panel.tsx` |

### Spotify Integration Flow

```
1. DJ clicks "Connect Spotify"
2. Browser → GET /api/platform/spotify/auth-url
3. Server returns Spotify OAuth authorization URL with scopes:
   user-read-private, user-library-read, playlist-read-private, streaming
4. Browser redirects to Spotify OAuth
5. Spotify redirects to /api/platform/spotify/callback?code=...
6. Server exchanges code for access_token + refresh_token
7. Tokens stored in session
8. DJ can browse playlists, saved tracks, search Spotify
9. On token expiry: server refreshes token automatically
```

---

## SECURITY ARCHITECTURE

### Authentication

| Mechanism | Implementation |
|---|---|
| Session Auth | express-session + memorystore (in-memory session storage) |
| Password Hashing | bcrypt (implicit in Passport.js local strategy) |
| JWT | jsonwebtoken for API token-based access |
| OAuth | Passport.js with Spotify OAuth callback handling |

### Data Protection

| Area | Implementation |
|---|---|
| Audio File Storage | server/uploads/tracks/ (server filesystem) |
| DMCA Notices | Stored in-memory (to be persisted in production) |
| PRO Compliance Timestamps | tos_acknowledged_at + venue_license_acknowledged_at stored per user in PostgreSQL |
| Royalty Records | Immutable play_events records in PostgreSQL |

### WebSocket Security

- DJ WebSocket connections are verified as authenticated users (session-based)
- DJ-type vs. crowd-type connections distinguished by join message type
- DJ-only messages are filtered server-side to DJ-type connections only (coaching, priority request alerts)
- WeakSet tracking of DJ-type WebSocket objects for selective broadcast

---

## DEPLOYMENT ARCHITECTURE

### Production Environment (Recommended)

```
CDN (Cloudflare / Fastly)
        │
Load Balancer (nginx / AWS ALB)
        │
App Server (Node.js / Express.js)
  ├── HTTP API endpoints
  ├── WebSocket server (/ws)
  ├── Static asset serving (Vite build output)
  └── File upload handling (Multer)
        │
PostgreSQL Database (AWS RDS / Supabase / Neon)
        │
External Services:
  ├── OpenAI API (GPT-4.1-mini)
  ├── Spotify API
  ├── Apple Music API
  ├── YouTube Data API
  └── DuckDuckGo API
```

### Environment Variables (Required for Production)

```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
SESSION_SECRET=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...
YOUTUBE_API_KEY=...
```

---

## PERFORMANCE CHARACTERISTICS

| Operation | Performance Target | Implementation |
|---|---|---|
| AI Track Analysis (per file) | < 3 seconds | Parallel OpenAI + DuckDuckGo calls |
| Setlist Generation (50 tracks) | < 5 seconds | O(n²) compatibility scoring, greedy ordering |
| Key Detection (30 seconds of audio) | < 2 seconds | Web Audio API + chromagram computation |
| WebSocket message delivery | < 50ms | Direct ws server broadcast, no message queue |
| Mood broadcast latency | < 100ms | WebSocket direct broadcast to all room clients |
| WebRTC audio latency | < 200ms | Standard WebRTC P2P with STUN servers |
| Page load time | < 1.5s FCP | Vite v7 code splitting + lazy loading |
| Audio playback start | < 500ms | AudioContext.decodeAudioData + BufferSource |

---

## SCALABILITY CONSIDERATIONS

| Component | Current State | Scaling Path |
|---|---|---|
| WebSocket rooms | In-memory Map | → Redis pub/sub for multi-server |
| Event data | In-memory storage | → PostgreSQL persistence (schema ready) |
| File uploads | Server filesystem | → AWS S3 / Cloudflare R2 |
| AI API calls | OpenAI REST API | → Response caching + rate limiting |
| Database | PostgreSQL (single) | → Read replicas for marketplace browsing |
| WebRTC signaling | Via WebSocket server | → TURN server for NAT traversal at scale |

---

## CODE ORGANIZATION

```
NovaMusic/
├── client/
│   └── src/
│       ├── components/       # Reusable UI components
│       │   ├── ai-dj-assistant.tsx    # AI DJ panel + DJ Jeff chat
│       │   ├── crowd-hub.tsx          # DJ crowd management panel
│       │   ├── dj-prep-studio.tsx     # Pre-gig setlist builder
│       │   ├── jamendo-music-library.tsx
│       │   ├── lyrics-panel.tsx
│       │   ├── tip-animation-overlay.tsx
│       │   └── ...
│       ├── hooks/            # Custom React hooks
│       │   ├── use-audio-engine.ts    # Core Web Audio API hook
│       │   └── use-webrtc-broadcast.ts
│       ├── pages/            # Route-level page components
│       │   ├── ai-dj.tsx              # AI DJ Mode
│       │   ├── dj-console.tsx         # Pro DJ Console
│       │   ├── party-mode.tsx         # Party Mode + Crowd Page
│       │   ├── artist-dashboard.tsx
│       │   ├── marketplace.tsx
│       │   └── ...
│       └── lib/              # Utilities and helpers
├── server/
│   ├── ai-dj.ts             # AI DJ Engine (analysis, setlist, coaching)
│   ├── routes.ts            # Main API routes + WebSocket server
│   ├── platform-routes.ts   # Spotify/Apple/YouTube integrations
│   ├── storage.ts           # Data access layer (MemStorage + DB)
│   └── db.ts                # Drizzle ORM configuration
├── shared/
│   └── schema.ts            # Drizzle schema + TypeScript types + constants
│                            # (PLATFORM_CUT = 0.15, DJ_CUT = 0.85)
└── scripts/                 # Utility scripts
```

---

## INTELLECTUAL PROPERTY ANCHORS IN CODE

The following source files contain the primary novel implementations corresponding to NovaMusic's patent claims:

| Patent Claim System | Primary Source Files |
|---|---|
| AI DJ Auto-Mix Engine (P-01–P-03, P-12, P-13, P-38) | `server/ai-dj.ts` |
| Real-Time Crowd Engagement Scoring (P-04, P-08–P-11) | `server/routes.ts` |
| Browser Spatial Audio Engine (P-05, P-06, P-34–P-36) | `client/src/hooks/use-audio-engine.ts` |
| Multi-Peer WebRTC Audio Broadcast (P-07) | `client/src/hooks/use-webrtc-broadcast.ts`, `server/routes.ts` |
| Mood Synchronization System (P-14) | `server/routes.ts`, `client/src/components/crowd-hub.tsx`, `client/src/pages/crowd-page.tsx` |
| Artist Marketplace + Royalty Engine (P-29) | `server/routes.ts`, `shared/schema.ts`, `client/src/pages/artist-dashboard.tsx` |
| Subscription Feature Gating (P-08) | `server/routes.ts` |
| Lyrics + Sing-Along System (P-15) | `client/src/components/lyrics-panel.tsx`, `server/routes.ts` |

---

*© 2026 OmniDLOS Holdings. All Rights Reserved.*
*Owner: Jeffrey W. Williams / Jeffrey W. Williams LLC*
*Entity: OmniDLOS Holdings*
*CONFIDENTIAL — Owner Eyes Only*

---

## OMNISCRIPT ARCHITECTURE INTEGRATION

> © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

### OmniScript as the Cognitive Layer of NovaMusic AI-Powered Music Creation & DJ Intelligence Platform

**NovaMusic AI-Powered Music Creation & DJ Intelligence Platform** is architected on **OmniScript** — the proprietary domain-specific language (`.omni`) of the OmniDLOS ecosystem. OmniScript compiles to an optimized TypeScript/JavaScript runtime and serves as the Cognitive Layer through which all platform computation, communication, and data persistence is expressed.

#### OmniScript System Architecture

```
NovaMusic AI-Powered Music Creation & DJ Intelligence Platform — OmniScript Architecture
├── universe SonicCreationUniverse/
│   ├── engine BeatFusionEngine.omni          ← Primary computation engine
│   ├── engine MixMasterEngine.omni                         ← Supporting engine
│   ├── engine SonicDNAEngine.omni                          ← Supporting engine
│   ├── engine CreatorRevenueEngine.omni                    ← Supporting engine
│   ├── service BeatGenerationService.omni                   ← Service layer
│   ├── service MixOptimizationService.omni                  ← Service layer
│   ├── service RoyaltyDistributionService.omni              ← Service layer
│   ├── portals/                               ← Nexus Point declarations
│   │   ├── open-portals.omni                  ← REST API (Open Portal) endpoints
│   │   └── pulse-channels.omni               ← WebSocket (Pulse Channel) connections
│   └── vaults/                               ← Data Vault schemas
│       ├── primary.vault.omni                 ← Primary data vault
│       └── archive.vault.omni                 ← Immutable legacy archive
├── omni.manifest                              ← OmniVault package manifest
└── .omnirc                                    ← OmniScript runtime configuration
```

#### OmniScript Engine Declarations

Each major subsystem of NovaMusic AI-Powered Music Creation & DJ Intelligence Platform is declared as an OmniScript `engine` — a typed, composable computation unit registered in the OmniVault package registry:

| Engine | Role | OmniScript Pattern |
|---|---|---|
| `BeatFusionEngine` | Primary computation — implements the core patented algorithm | `engine BeatFusionEngine implements Intelligent` |
| `MixMasterEngine` | Supporting computation unit | `engine MixMasterEngine` |
| `SonicDNAEngine` | Supporting computation unit | `engine SonicDNAEngine` |
| `CreatorRevenueEngine` | Supporting computation unit | `engine CreatorRevenueEngine` |

#### Nexus Point Architecture (OmniDLOS API Layer)

All external integrations are declared as **Nexus Points** in OmniScript — the proprietary OmniDLOS term for API interfaces:

| Nexus Point Type | OmniScript Declaration | Usage |
|---|---|---|
| Open Portal (REST) | `portal OpenPortal<NovaMusicAPI>` | Standard HTTP/REST communication |
| Pulse Channel (WebSocket) | `pulse PulseChannel<LiveFeed>` | Real-time bidirectional data streaming |
| Forge Link (internal RPC) | `portal ForgeLink<InternalBus>` | High-speed typed inter-service communication |
| Echo Signal (Webhook) | `portal EchoSignal<EventHook>` | Outbound event notification system |

#### Guardian Layer Security Model

All sensitive operations in NovaMusic AI-Powered Music Creation & DJ Intelligence Platform are protected by OmniScript's **Guardian Layer** decorator system:

```omni
// Guardian Layer access control
@Guardian(level: 5)         // Requires clearance level 5 of 10
@Dimension(Dimension.EMOTIONAL)
@Audit(trail: AuditTrail.FULL)
manifest flow sensitiveScoringOperation(userId: Text): flow<SecureResult> {
  // Operation protected by Guardian Layer — unauthorized access raises QuantumFault
}
```

| Guardian Level | Access Tier | Applied To |
|---|---|---|
| Level 1–2 | Public Nexus Points | Open data read operations |
| Level 3–4 | Authenticated user operations | Profile reads, standard queries |
| Level 5–6 | Premium / verified operations | Core algorithm execution |
| Level 7–8 | Admin operations | Configuration changes, data exports |
| Level 9–10 | Owner / root operations | Vault management, Guardian administration |

#### Cross-Dimensional Bus Integration

NovaMusic AI-Powered Music Creation & DJ Intelligence Platform participates in the OmniDLOS **Inter-Dimensional Bus** (`Nova.Bus`) — enabling real-time Signal exchange with all 12 other OmniDLOS platforms:

```omni
// Emit a Signal to the cross-dimensional bus
Nova.Bus.emit("platform.event.type", {
  platformId: "NovaMusic",
  universe: "SonicCreationUniverse",
  dimension: Dimension.EMOTIONAL,
  payload: eventData
})

// Receive Signals from other dimensions
drift signal in Nova.Bus.receive(channel: "cross-dimensional") {
  when (signal.dimension == Dimension.EMOTIONAL) {
    handleIncomingSignal(signal)
  }
}
```

#### OmniScript Code Sample — Core Engine

```omni
// NovaMusic — Beat Fusion & Sonic DNA Engine
universe SonicCreationUniverse {
  dimension: Dimension.EMOTIONAL
  vibe: Vibe.SONIC

  engine BeatFusionEngine implements Intelligent {
    manifest flow generateBeat(emotionDNA: EmotionProfile, genre: Text): flow<BeatConstruct> {
      forge palette = sync SonicDNAEngine.mapEmotionToPalette(emotionDNA)
      forge beat    = sync BeatGenerationService.compose(palette, genre)
      Nova.Bus.emit("beat.created", { creatorId: emotionDNA.userId, beatId: beat.id })
      propagate beat
    }

    manifest flow optimizeMix(tracks: Constellation<AudioTrack>, targetVibe: Vibe): flow<MixPlan> {
      forge plan = sync MixOptimizationService.analyze(tracks, targetVibe)
      propagate plan
    }
  }

  service CreatorRevenueEngine {
    @Guardian(level: 3)
    manifest flow distributeRoyalties(beat: BeatConstruct, streams: Integer): flow<RevenueRecord> {
      forge revenue = sync RoyaltyDistributionService.compute(beat, streams)
      sync Nova.Vault.archive("royalty.record", revenue)
      propagate revenue
    }
  }
}
```

© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---
