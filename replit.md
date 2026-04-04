# Nova Music - Galactic Sound System

## Overview

Nova Music (formerly DJ Hybrid) is a browser-based DJ mixing platform with three distinct experiences:

1. **AI DJ Mode** — Upload your music library, AI analyzes BPM/key/genre detection, Fire Zone identification, smart setlist planning, and automated mixing. Features: Global Trend Radar (2024–2025 genre heat rankings), Energy Curve Planner (visualizes set arc), and Live Hype Score (real-time crowd energy indicator).
2. **DJ Console (Pro)** — Full 4-deck mixer with advanced EQ, FX rack, soundboard pads, and 6-mode visualizer. Features: BPM Sync Ring (deck status indicator), Session Heat Map (energy timeline), and Key Match Badge (harmonic compatibility display).
3. **Party Mode** — Simplified, mobile-first DJ experience for parties. Features: VibeMeter (crowd energy gauge), Genre Roulette (spinning genre selector), and Emoji Storm (emoji burst overlays on FX pad presses).

The app uses a galactic/futuristic design with deep space backgrounds (#03030c), neon color palette (nova purple #e879f9, indigo #818cf8, sky blue #38bdf8, pink #ff2d78), animated cosmic effects, Oxanium font for headers, and the tagline "GALACTIC SOUND SYSTEM".

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter — routes: `/`, `/ai-dj`, `/console`, `/party`, `/compliance`, `/terms`, `/signup`, `/artist/dashboard`, `/marketplace`, `/admin/royalties`, `/event-history`
- **State Management**: React hooks and TanStack React Query
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with neon party theme (dark-first, purple/blue/pink/green accents)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Pages

- `client/src/pages/landing.tsx` — Animated landing page with particle effects, gradient text, and navigation to all experiences; footer links to compliance, terms, marketplace, signup, event history
- `client/src/pages/ai-dj.tsx` — Beginner AI DJ experience with 4 screens: Upload, Scanning, Setlist, Playing
- `client/src/pages/dj-console.tsx` — Pro DJ console with tabbed views including Marketplace tab
- `client/src/pages/party-mode.tsx` — Mobile-optimized party experience
- `client/src/pages/compliance.tsx` — Compliance Center: performance rights explained, ASCAP/BMI/SESAC links, SoundExchange explanation, Marketplace license explainer, attorney disclaimer
- `client/src/pages/terms.tsx` — Full Terms of Service: no PRO remittance, artist upload warranty, royalty payout terms, 15% platform fee, no legal advice disclaimer
- `client/src/pages/signup.tsx` — DJ/Artist account creation with required TOS checkbox and (for DJs) venue licensing acknowledgment checkbox
- `client/src/pages/artist-dashboard.tsx` — Artist Dashboard: track catalog, earnings, payout history, profile editor, track upload with license type selection
- `client/src/pages/marketplace.tsx` — Browse/search/filter marketplace tracks by genre/BPM/key/license, preview audio, add to deck (logs download event)
- `client/src/pages/admin-royalties.tsx` — Admin panel: royalty totals, breakdown by artist, pending payouts with "Mark as Paid", monthly calculation trigger
- `client/src/pages/event-history.tsx` — Event Play Log: create events, manually add tracks, auto-logged tracks, CSV download with PRO compliance notice

### Key Components

- `DeckPanel` (`client/src/components/deck-panel.tsx`) — Individual deck with animated spinning turntable, waveform display, play/pause, cue, speed/volume controls, 3-band EQ, loop controls, 4 hot cues
- `MixerPanel` (`client/src/components/mixer-panel.tsx`) — Dual crossfaders (A/B and C/D), master gain, VU meters, recording controls
- `SoundboardPanel` (`client/src/components/soundboard-panel.tsx`) — 8 sample pads with custom sound loading
- `VisualizerPanel` (`client/src/components/visualizer-panel.tsx`) — 6 visualization modes using canvas rendering
- `FXPanel` (`client/src/components/fx-panel.tsx`) — Per-deck FX controls: Filter, Reverb, Delay, 3-band EQ
- `Turntable` (`client/src/components/turntable.tsx`) — Animated spinning vinyl record canvas component
- `Microphone` (`client/src/components/microphone.tsx`) — Live microphone input via Web Audio API
- `SongQueue` (`client/src/components/song-queue.tsx`) — Collapsible playlist/queue manager per deck

### Audio Engine

- `client/src/hooks/use-audio-engine.ts` — Core Web Audio API engine supporting 4 decks
- Full signal chain per deck: source → stems → 3-band EQ → filter → delay → reverb → gain → analyzer → master

### Backend

- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js
- **API Endpoints**:
  - `POST /api/analyze` — Placeholder analysis
  - `POST /api/mix-suggestion` — Harmonic compatibility
  - `POST /api/ai-dj/*` — AI DJ endpoints (OpenAI-powered)
  - `POST /api/auth/register` — Register DJ or Artist account with TOS/venue license acknowledgment
  - `POST /api/auth/login` — Login
  - `GET /api/artist/profile/:userId` — Get artist profile
  - `POST /api/artist/profile` — Create or update artist profile
  - `GET /api/tracks` — Browse marketplace tracks (filterable by genre, licenseType, BPM range, key)
  - `GET /api/tracks/artist/:artistId` — Artist's own tracks
  - `POST /api/tracks` — Upload a new track (multipart/form-data)
  - `GET /api/tracks/file/:filename` — Serve full audio file (authenticated DJs)
  - `POST /api/play-events` — Record a track play event (royalty tracking)
  - `GET /api/play-events/event/:eventId` — Get all play events for an event
  - `GET /api/play-events/event/:eventId/csv` — Download cue sheet / play log as CSV
  - `GET /api/artist/dashboard/:artistProfileId` — Artist dashboard data (plays, earnings, payouts)
  - `GET /api/admin/royalties` — Admin royalty overview
  - `POST /api/admin/royalties/calculate` — Calculate monthly royalties
  - `POST /api/admin/royalties/:id/mark-paid` — Mark a payout as paid
- **File Uploads**: Multer (tracks stored in `server/uploads/tracks/`)

### Database / Schema

- **ORM**: Drizzle ORM (configured for PostgreSQL)
- **Current Storage**: In-memory (MemStorage)
- **Schema** (`shared/schema.ts`):
  - `users` — id, username, password, accountType (dj/artist), tosAcknowledgedAt, venueLicenseAcknowledgedAt
  - `artistProfiles` — id, userId, stageName, bio, payoutInfoPlaceholder, createdAt
  - `tracks` — id, artistId, title, artistName, genre, bpm, key, isrc, licenseType (free/royalty/promo), royaltyRate, fileUrl, previewUrl, playCount, available, createdAt
  - `playEvents` — id, trackId, eventId, djUserId, trackTitle, artistName, label, isrc, licenseType, duration, royaltyAmount, playedAt, eventName, venueName
  - `royaltyPayouts` — id, artistId, period, totalPlays, totalAmount, platformFee, netAmount, status, createdAt, paidAt

### Music Rights & Compliance System

- **Compliance Center** (`/compliance`): Plain-English explanation of PROs, venue licensing responsibilities, SoundExchange scope, Artist Marketplace licensing, attorney disclaimer
- **Terms of Service** (`/terms`): Platform is NOT a PRO, no legal advice, artist upload ownership warranty, 15% platform fee structure, DJ/venue licensing responsibility
- **DJ Signup**: Required venue license acknowledgment checkbox (ASCAP/BMI/SESAC) + TOS checkbox; timestamps logged to user record
- **Play Log / Cue Sheet**: CSV export per event with PRO compliance notice header
- **Artist Marketplace**: License types: Free, Royalty Per Play ($0.01–$1.00), Exclusive Promo (credit required)
- **Royalty System**: Plays tracked → monthly calculation → 15% platform fee → 85% to artist → payout marked by admin
- **Artist Dashboard**: Track catalog, plays per track, earnings, pending payout, payout history

### Build System

- **Development**: `tsx server/index.ts` with Vite middleware for HMR
- **Production**: Custom build script, outputs to `dist/`

### Design System

- Dark-first neon party theme
- CSS custom properties for neon colors
- Glass-morphism panels with backdrop blur
- Custom animations: neon-pulse, gradient-shift, vinyl-spin, beat-pulse, eq-bounce, slide-in-up

## External Dependencies

### Key NPM Packages
- drizzle-orm, drizzle-zod, express, multer, @tanstack/react-query, wouter, zod
- shadcn/ui ecosystem (Radix UI, cva, clsx, tailwind-merge, lucide-react)
- OpenAI (GPT-4.1-mini for AI DJ features)
