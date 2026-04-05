# OmniScript Language Reference — NovaMusic
## The Sonic Dimension
### © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

## Overview

This reference documents the OmniScript language as applied to **NovaMusic** — The Sonic Dimension. It includes platform-specific types, engine patterns, service patterns, and IDB Signal flows specific to this platform.

For the complete OmniScript specification, see the root `omniscript-language-spec.md`.

---

## Table of Contents

1. [Core Language Primitives](#1-core-language-primitives)
2. [Platform-Specific Types](#2-platform-specific-types)
3. [Engine Patterns](#3-engine-patterns)
4. [Service Patterns](#4-service-patterns)
5. [IDB Signal Flows](#5-idb-signal-flows)
6. [Cross-Platform Communication](#6-cross-platform-communication)
7. [Error Handling](#7-error-handling)
8. [Standard Library Reference](#8-standard-library-reference)

---

## 1. Core Language Primitives

### Variable Declaration

```omni
// Immutable — use for IDs, config, thresholds
forge platformId: Text = "novamusic"
forge MAX_RESULTS: Integer = 100
forge CONFIDENCE_THRESHOLD: Probability = 85.0%

// Mutable — use for state that changes
weave activeEngines: Integer = 0
weave platformVibe: Vibe = Vibe.NEUTRAL

// Inferred — use for local computation
sculpt result = sync someEngine.compute(input)
```

### Functions

```omni
// Standard manifest
manifest computeScore(userId: Text, context: Any): flow<Float> {
  forge vibe  = sync Nova.Vibe.analyze(userId)
  forge score = vibe.intensity * 0.8 + vibe.frequency * 0.2
  propagate score
}

// Shorthand
manifest isAboveThreshold(score: Float) => score > 85.0

// Generic
manifest fuse<T: Dimensional>(items: Constellation<T>): T {
  propagate items.reduce((a, b) => a.merge(b))
}
```

### Control Flow

```omni
// when / otherwise
when (confidence > 90.0%) {
  acceptResult(result)
} otherwise when (confidence > 70.0%) {
  reviewResult(result)
} otherwise {
  rejectResult(result)
}

// traverse (for-of)
traverse engine in activeEngines {
  when (engine.status == Status.DORMANT) { skip }
  sync engine.compute(input)
}

// cycle (while)
weave retries = 0
cycle (retries < 3) {
  forge result = sync tryOperation()
  when (result.ok) { halt }
  retries += 1
}

// drift (async for-await)
drift signal in Nova.Bus.receive(channel: "nova-music.session.started") {
  sync handleSignal(signal)
}
```

---

## 2. Platform-Specific Types

```omni
// NovaMusic core form types

form NovaMusicProfile {
  id:          Text
  userId:      Text
  dimension:   Text = "The Sonic Dimension"
  vibe:        Vibe
  emotion:     Emotion
  status:      Status
  createdAt:   Timestamp
  updatedAt:   Timestamp
}

// NovaMusic domain shapes
shape NovaMusicConfig {
  platformId:   Text
  dimension:    Text
  engineCount:  Integer
  vaultName:    Text
  idbTopics:    Constellation<Text>
}

mask NovaMusicStatus {
  INITIALIZING,
  CALIBRATING,
  ACTIVE,
  SIGNAL_HOLD,
  FAULTED,
  DIMENSIONAL_MAINTENANCE
}
```

---

## 3. Engine Patterns

All NovaMusic engines implement the `Engine` essence:

```omni
essence Engine {
  manifest compute(input: Nexus<Text, Any>): flow<EngineResult>
  manifest calibrate(): flow<nil>
  manifest report(): EngineReport
}
```

### Registered Engines

| Engine | Priority | Description |
|---|---|---|
| `VibeComposerEngine` | CRITICAL | Translates user Vibe and EmotionDNA into BPM, key, genre, and energy parameters |
| `PulseAlignmentEngine` | HIGH | Beat-matching and harmonic key detection using Camelot wheel alignment |
| `SignalBlendEngine` | HIGH | Intelligent mix transition scoring and FX recommendation system |
| `TrackAnalysisEngine` | NORMAL | AI-powered BPM, key, energy, mood, and Fire Zone detection per Sound Artifact |
| `SetlistPlannerEngine` | NORMAL | Full Sonic Session planning with energy arc, genre journey, and AI commentary |
| `ChromaSoundProtocolEngine` | NORMAL | ChromaFeel visual-to-audio mapping for immersive Vibe experiences |
| `ResonanceSignalEngine` | NORMAL | Crowd reaction and audience energy feedback loop analysis |
| `WebRTCBroadcastEngine` | NORMAL | Live Signal Mode real-time audio streaming to audience Pulse Channels |
| `SonicDiscoveryEngine` | NORMAL | Personalized Sound Artifact recommendation based on Vibe alignment |
| `AudioMetadataEngine` | NORMAL | music-metadata extraction pipeline for Fire Zone and mix-point detection |

### Engine Declaration Pattern

```omni
@engine(
  id: "engine-id-v1",
  platform: "NovaMusic",
  version: "1.0.0",
  priority: Priority.HIGH
)
engine MyEngine implements Engine {

  forge THRESHOLD: Probability = 85.0%
  weave lastRun: Timestamp? = nil

  manifest compute(input: Nexus<Text, Any>): flow<EngineResult> {
    // 1. Extract inputs
    forge userId = input.get("userId") as Text

    // 2. Parallel data fetch
    forge (vibe, emotion) = sync parallel {
      Nova.Vibe.analyze(userId, window: Duration.hours(24)),
      Nova.Emotion.getLatest(userId)
    }

    // 3. Core logic
    forge prediction = sync this.resolve(vibe, emotion)

    // 4. Propagate result
    propagate EngineResult {
      engineId:   "my-engine",
      confidence: prediction.confidence,
      prediction: prediction.value,
      timestamp:  Timestamp.now()
    }
  }

  manifest calibrate(): flow<nil> {
    this.lastRun = Timestamp.now()
  }

  manifest report(): EngineReport {
    propagate EngineReport {
      engineId: "my-engine",
      status:   Status.ACTIVE
    }
  }
}
```

---

## 4. Service Patterns

### Registered Services

| Service | Shield Level | Description |
|---|---|---|
| `AIDJService` | MAXIMUM | OpenAI-powered AI DJ assistant for setlist planning and transition guidance |
| `TrackLibraryService` | HIGH | Sound Constellation management, upload, and metadata indexing |
| `SonicSessionService` | HIGH | Live and recorded Sonic Session orchestration and archiving |
| `LeaderboardService` | STANDARD | Signal Leaderboard ranking by Sonic Session performance scores |
| `ArtistMarketplaceService` | STANDARD | Sound Artifact licensing, Signal Creator profiles, and revenue distribution |
| `SonicMilestoneService` | STANDARD | Achievement tracking and reward system for Sonic Dimension progression |

### Service Declaration Pattern

```omni
@service(
  id: "my-service",
  platform: "NovaMusic",
  shield: ShieldLevel.HIGH
)
service MyService {

  @inject forge vault: DataVault<Any>
  @inject forge auth: Nova.Auth

  @portal(endpoint: "novamusic.resource.get")
  @shield(require: ["AUTHENTICATED"])
  manifest getResource(id: Text, ctx: RequestContext): flow<Any> {
    forge identity = sync this.auth.verify(ctx)
    forge resource = sync this.vault.get(id)

    when (resource == nil) {
      fault ResourceNotFound { id }
    }

    propagate resource
  }
}
```

---

## 5. IDB Signal Flows

### Signal Topics for NovaMusic

```omni
// Emit a platform signal
Nova.Bus.emit("nova-music.session.started", Signal {
  topic:    "nova-music.session.started",
  payload:  { userId: userId, data: result },
  origin:   "novamusic",
  priority: Priority.HIGH
})

// Subscribe to a signal channel
@on_signal(topic: "nova-music.vibe.mapped")
manifest onSignal(signal: Signal): flow<nil> {
  forge payload = signal.payload
  // Handle inbound signal
  Nova.Log.info(`Signal received: ${signal.topic}`)
}

// Drift over a signal stream
drift signal in Nova.Bus.receive(channel: "novamusic.signals") {
  sync processSignal(signal)
}
```

### Registered IDB Topics

| Topic | Direction | Description |
|---|---|---|
| `nova-music.session.started` | OUTBOUND | Platform signal from NovaMusic |
| `nova-music.vibe.mapped` | OUTBOUND | Platform signal from NovaMusic |
| `nova-music.sonic-signal.broadcast` | OUTBOUND | Platform signal from NovaMusic |

---

## 6. Cross-Platform Communication

```omni
// Portal call to another OmniDLOS platform
forge response = sync Nova.Bus.portalCall(
  target:   "4everacy",
  endpoint: "user.signals.get",
  payload:  { userId: userId }
)

// Receive a Dimensional Intelligence Share from another platform
@on_signal(topic: "cross-dimensional.intelligence.share", from: "Tree-AI")
manifest onDiscoverySignal(signal: Signal): flow<nil> {
  forge discoveries = signal.payload.get("discoveries") as Constellation<Any>
  sync processDiscoveries(discoveries)
}

// Broadcast to all 13 platforms via IDB
Nova.Bus.broadcast(Signal {
  topic:    "novamusic.cross-dimensional.broadcast",
  payload:  { platformId: "novamusic", data: result },
  origin:   "novamusic",
  priority: Priority.HIGH
})
```

---

## 7. Error Handling

```omni
// Fault declaration
fault NovaMusicFault extends QuantumFault {
  platform:  Text = "NovaMusic"
  dimension: Text = "The Sonic Dimension"
  code:      Text
  context:   Nexus<Text, Any>?
}

// Handling faults
manifest safeCompute(input: Nexus<Text, Any>): flow<EngineResult?> {
  catch {
    propagate sync myEngine.compute(input)
  } on (QuantumFault fault) {
    Nova.Log.error(`Engine fault in NovaMusic: ${fault.message}`)
    Nova.Metrics.pulse("novamusic.fault", 1.0, tags: { code: fault.code })
    propagate nil
  } always {
    Nova.Metrics.pulse("novamusic.compute.attempt", 1.0)
  }
}
```

---

## 8. Standard Library Reference

```omni
// Nova Standard Library — NovaMusic commonly used APIs

// Vibe analysis
Nova.Vibe.analyze(userId, window: Duration.hours(24))   // → Vibe
Nova.Vibe.getPlatformVibe()                              // → Vibe

// Emotion intelligence
Nova.Emotion.getLatest(userId)                           // → Emotion
Nova.Emotion.getHistory(userId, window: Duration.days(7))

// Data vault operations
Nova.Data.query("SonicVault", { userId, limit: 100 })
Nova.Data.store("SonicVault", entry)
Nova.Data.get("SonicVault", id)

// IDB operations
Nova.Bus.emit(topic, signal)
Nova.Bus.receive(channel)
Nova.Bus.portalCall(target, endpoint, payload)
Nova.Bus.broadcast(signal)

// Auth and identity
Nova.Auth.verify(ctx)                                    // → Identity
Nova.Auth.identify(userId)                               // → UserProfile

// Cryptography
Nova.Crypto.uuid()
Nova.Crypto.sha3(input)
Nova.Crypto.encrypt(data, key)

// Metrics
Nova.Metrics.pulse(metric, value, tags)
Nova.Metrics.startPulseWatch(platformId)

// Logging
Nova.Log.info(message)
Nova.Log.warn(message)
Nova.Log.error(message)
```

---

*© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.*
*OmniScript is a proprietary language of Jeffrey W Williams LLC.*
