# DJ Hybrid - AI DJ Platform + Professional Mixer

## Overview

DJ Hybrid is a browser-based DJ mixing platform with three distinct experiences:

1. **AI DJ Mode (NEW - Beginner)** — Upload your music library, and the AI analyzes everything: BPM/key/genre detection, Fire Zone identification (the drop/hook/chorus), trending song detection, smart setlist planning, and automated mixing. Zero DJ knowledge required.
2. **DJ Console (Pro)** — Full 4-deck mixer with advanced EQ, FX rack, soundboard pads, and 6-mode visualizer
3. **Party Mode (Sister App)** — Simplified, mobile-first DJ experience designed for party guests to drop beats and trigger sound effects

The app features a vibrant neon party aesthetic with purple, blue, pink, and green accents, glow effects, glass-morphism panels, and smooth animations throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter — 4 routes: Landing (`/`), AI DJ (`/ai-dj`), DJ Console (`/console`), Party Mode (`/party`)
- **State Management**: React hooks and TanStack React Query
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with neon party theme (dark-first, purple/blue/pink/green accents)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Pages

- `client/src/pages/landing.tsx` — Animated landing page with particle effects, gradient text, and navigation to all experiences; AI DJ Mode card is the featured/recommended option
- `client/src/pages/ai-dj.tsx` — **NEW** Beginner AI DJ experience with 4 screens: Upload, Scanning, Setlist, Playing. Full AI-powered pipeline with file upload, metadata analysis, Fire Zone detection, trending detection, setlist planning, and automated mixing
- `client/src/pages/dj-console.tsx` — Pro DJ console with tabbed views (Decks, FX Rack, Sound Pads, Visualizer), 2/4 deck toggle, fullscreen mode
- `client/src/pages/party-mode.tsx` — Mobile-optimized party experience with 2 decks, crossfader, 12 synthesized party sound FX pads, quick actions

### Key Components

- `DeckPanel` (`client/src/components/deck-panel.tsx`) — Individual deck with animated spinning turntable, waveform display, play/pause, cue, speed/volume controls, 3-band EQ, loop controls (0.5-16 beats), 4 hot cues
- `MixerPanel` (`client/src/components/mixer-panel.tsx`) — Dual crossfaders (A/B and C/D for 4-deck mode), master gain, preset selection, VU meters, recording controls
- `SoundboardPanel` (`client/src/components/soundboard-panel.tsx`) — 8 sample pads with custom sound loading, visual feedback on trigger
- `VisualizerPanel` (`client/src/components/visualizer-panel.tsx`) — 6 visualization modes (Bars, Circular, Particles, Wave, Spectrum, Matrix) using canvas rendering
- `FXPanel` (`client/src/components/fx-panel.tsx`) — Per-deck FX controls with visual knobs: Filter (LPF/HPF), Reverb, Delay, 3-band EQ
- `Turntable` (`client/src/components/turntable.tsx`) — Animated spinning vinyl record canvas component, spins when playing, glows with deck color, accepts any hex color including shorthand (#0af)
- `Microphone` (`client/src/components/microphone.tsx`) — Live microphone input via Web Audio API, routes phone mic through music output, has gain slider and real-time VU meter bars, works in both Party Mode and DJ Console
- `BeginnerTips` / `TipBubble` (`client/src/components/beginner-tips.tsx`) — Step-by-step tutorial overlay for first-time users (6 steps), dismissable tip bubble for contextual hints
- `SongQueue` (`client/src/components/song-queue.tsx`) — Collapsible playlist/queue manager per deck; supports multi-file upload, folder upload (webkitdirectory), reorder, remove, auto-advance to next song when track ends
- `AudioOutput` (`client/src/components/audio-output.tsx`) — Bluetooth/audio device selector using `navigator.mediaDevices.enumerateDevices()`; lists all audio outputs including Bluetooth devices; uses `AudioContext.setSinkId()` where supported (Chrome 110+); includes step-by-step Bluetooth guide for unsupported browsers
- `PlatformSync` (`client/src/components/platform-sync.tsx`) — Music platform connection UI; local file upload and folder import are READY; Apple Music, Spotify, YouTube Music, SoundCloud marked as COMING SOON with honest explanations

### Audio Engine

- `client/src/hooks/use-audio-engine.ts` — Core Web Audio API engine supporting 4 decks
- Full signal chain per deck: source → stems → 3-band EQ → filter → delay → reverb → gain → analyzer → master
- Mastering chain: compressor → master gain → destination
- Features: BPM detection, key detection, beat grid, auto-mix, hot cues with auto-placement, loop controls, stem isolation, transition effects (spinback/brake/echo-out), 8-pad sampler with synthesized sounds, mix recording

### Backend

- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js
- **API Endpoints**:
  - `POST /api/analyze` — Placeholder for legacy analysis
  - `POST /api/mix-suggestion` — Harmonic compatibility via Camelot wheel
  - `POST /api/ai-dj/analyze-tracks` — Multi-file upload endpoint; uses OpenAI GPT-4.1-mini to analyze track names for BPM/key/genre/mood/energy/trending status/fire zone; returns structured AnalyzedTrack array
  - `POST /api/ai-dj/build-setlist` — Takes analyzed tracks + vibe (chill/party/hype), builds optimal order, calculates transitions, generates energy arc and genre journey, adds AI commentary via OpenAI
  - `POST /api/ai-dj/dj-status` — Generates live AI DJ persona status messages based on current play state
  - `POST /api/ai-dj/analyze-playlist` — Legacy endpoint for basic playlist analysis
  - `POST /api/ai-dj/transition-advice` — Streaming SSE endpoint for real-time transition advice
  - `POST /api/ai-dj/vibe-tips` — Streaming SSE endpoint for vibe-specific DJ tips
  - `POST /api/ai-dj/auto-mix-plan` — Returns step-by-step auto-mix commands
- **File Uploads**: Multer (temp storage, files deleted after processing)

### Database

- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Basic `users` table in `shared/schema.ts`
- **Current Storage**: In-memory storage

### Build System

- **Development**: `tsx server/index.ts` with Vite middleware for HMR
- **Production**: Custom build script, outputs to `dist/`

### Design System

- Dark-first neon party theme
- CSS custom properties for neon colors: `--neon-purple`, `--neon-blue`, `--neon-pink`, `--neon-green`, `--neon-orange`, `--neon-yellow`, `--neon-cyan`, `--neon-red`
- Glass-morphism panels with backdrop blur
- Glow effects via CSS box-shadow
- Custom animations: neon-pulse, gradient-shift, vinyl-spin, beat-pulse, eq-bounce, slide-in-up
- Responsive layout — mobile-optimized Party Mode

## External Dependencies

### Key NPM Packages
- drizzle-orm, drizzle-zod, express, multer, @tanstack/react-query, wouter, zod
- shadcn/ui ecosystem (Radix UI, cva, clsx, tailwind-merge, lucide-react)
- No external APIs currently integrated
