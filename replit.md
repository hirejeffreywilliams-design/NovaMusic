# DJ Hybrid Starter - 2-Deck Mixer

## Overview

This is a browser-based 2-deck DJ mixer application. It provides real-time audio crossfading, waveform visualization, BPM/key detection, and mix recording — all running primarily client-side using the Web Audio API. The backend is a lightweight Express server that serves the frontend and provides a minimal file analysis endpoint (though audio analysis is preferred client-side for low latency).

The app is an MVP scaffold inspired by a DJ mixing concept that originally targeted a FastAPI/Python backend with AI-powered stem separation (Demucs). This implementation uses a Node.js/Express backend with a React frontend instead.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: React hooks and TanStack React Query for server state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

Key custom components:
- `Deck` (`client/src/components/deck.tsx`) - Individual DJ deck with play/pause, rate control, cue points, file loading, and waveform display
- `Mixer` (`client/src/components/mixer.tsx`) - Crossfader, recording controls, and auto-mix functionality
- `Waveform` (`client/src/components/waveform.tsx`) - Canvas-based waveform visualization with playback progress and seek support
- `ThemeProvider` (`client/src/components/theme-provider.tsx`) - Dark/light theme toggle with localStorage persistence

Key custom hooks:
- `useAudioEngine` (`client/src/hooks/use-audio-engine.ts`) - Core audio engine using Web Audio API. Manages two decks (A & B), crossfading, playback control, recording via MediaRecorder, and analyzer nodes for visualization. This is where the main application logic lives.

### Backend

- **Runtime**: Node.js with TypeScript (tsx for development, esbuild for production)
- **Framework**: Express.js
- **API**: Single endpoint `POST /api/analyze` for file upload analysis (currently returns a placeholder — real analysis happens client-side)
- **File Uploads**: Multer (stores to OS temp directory)
- **Dev Server**: Vite dev server integrated as Express middleware with HMR
- **Production**: Static file serving from `dist/public`

### Database

- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: Defined in `shared/schema.ts` — currently contains a basic `users` table (id, username, password)
- **Migrations**: Drizzle Kit with `db:push` command
- **Current Storage**: In-memory storage (`MemStorage` class in `server/storage.ts`) — database is set up in config but not actively connected in routes. The `DATABASE_URL` environment variable is required by drizzle config.

### Audio Processing Architecture

The core design decision is **client-side-first audio processing**:
- Real-time mixing, crossfading, and playback use the Web Audio API directly in the browser for minimal latency
- BPM detection and key estimation run client-side using OfflineAudioContext
- The server `/api/analyze` endpoint exists as a placeholder for future server-side processing (e.g., AI stem separation)
- Mix recording uses MediaRecorder API capturing from a MediaStreamAudioDestinationNode

### Build System

- **Development**: `tsx server/index.ts` runs the Express server with Vite middleware for HMR
- **Production Build**: Custom build script (`script/build.ts`) that:
  1. Runs Vite build for the client (outputs to `dist/public`)
  2. Runs esbuild for the server (outputs to `dist/index.cjs`)
  3. Bundles select server dependencies to reduce cold start syscalls
- **Production Start**: `node dist/index.cjs`

### Shared Code

The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Drizzle database schema and Zod validation schemas (via drizzle-zod)

## External Dependencies

### Database
- **PostgreSQL** - Required via `DATABASE_URL` environment variable. Used with Drizzle ORM. Schema push via `drizzle-kit push`.

### Key NPM Packages
- **drizzle-orm** + **drizzle-zod** - Database ORM and schema validation
- **express** - HTTP server framework
- **multer** - Multipart file upload handling
- **@tanstack/react-query** - Async state management for API calls
- **wouter** - Client-side routing
- **zod** - Schema validation
- **shadcn/ui ecosystem** - Radix UI primitives, class-variance-authority, clsx, tailwind-merge, lucide-react icons
- **recharts** - Charting library (available via shadcn chart component)
- **embla-carousel-react** - Carousel component
- **vaul** - Drawer component
- **react-day-picker** + **date-fns** - Calendar/date components
- **input-otp** - OTP input component
- **react-resizable-panels** - Resizable panel layouts
- **connect-pg-simple** - PostgreSQL session store (available but not currently wired up)

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` - Runtime error overlay in development
- `@replit/vite-plugin-cartographer` - Dev tooling (conditionally loaded)
- `@replit/vite-plugin-dev-banner` - Dev banner (conditionally loaded)

### No External APIs Currently Integrated
The project has dependencies for OpenAI, Google Generative AI, Stripe, Nodemailer, Passport, and JWT available in the build allowlist but none are currently wired into the application code. These suggest planned future features (AI auto-mixing, payments, auth, email).