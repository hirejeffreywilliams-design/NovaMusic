# DJ Hybrid - Professional 4-Deck Mixer + Party Mode

## Overview

DJ Hybrid is a browser-based professional DJ mixing platform with two distinct experiences:

1. **DJ Console (Pro)** — Full 4-deck mixer with advanced EQ, FX rack, soundboard pads, and 6-mode visualizer
2. **Party Mode (Sister App)** — Simplified, mobile-first DJ experience designed for party guests to drop beats and trigger sound effects

The app features a vibrant neon party aesthetic with purple, blue, pink, and green accents, glow effects, glass-morphism panels, and smooth animations throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter — 3 routes: Landing (`/`), DJ Console (`/console`), Party Mode (`/party`)
- **State Management**: React hooks and TanStack React Query
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with neon party theme (dark-first, purple/blue/pink/green accents)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Pages

- `client/src/pages/landing.tsx` — Animated landing page with particle effects, gradient text, and navigation to both experiences
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
- **API**: `POST /api/analyze` (placeholder), `POST /api/mix-suggestion` (harmonic compatibility via Camelot wheel)
- **File Uploads**: Multer

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
