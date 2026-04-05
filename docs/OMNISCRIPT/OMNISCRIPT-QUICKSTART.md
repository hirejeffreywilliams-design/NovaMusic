# OmniScript Quickstart — NovaMusic
## The Sonic Dimension
### © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

> This guide gets you writing OmniScript for **NovaMusic** in under 10 minutes.

---

## What is OmniScript?

**OmniScript** (`.omni`) is the proprietary domain-specific language of OmniDLOS — the Four-Dimensional Operating System. It powers every Engine, Service, and Universe across all 13 platforms in the **Omnivex Constellation**.

OmniScript replaces TypeScript boilerplate with dimensional semantics:

| TypeScript | OmniScript | Semantics |
|---|---|---|
| `const` | `forge` | Immutable. Forged once. |
| `let` | `weave` | Mutable. Can be rewoven. |
| `function` | `manifest` | A declared capability. |
| `async/await` | `flow` / `sync` | Dimensional async. |
| `for...of` | `traverse` | Traverse a Constellation. |
| `if / else` | `when / otherwise` | Conditional resolution. |
| `class` | `form` | Reference type with identity. |
| `interface` | `essence` | Capability contract. |
| `enum` | `mask` | Named dimensional state. |
| `import` | `draw` | Draw from a module. |
| `export` | `seal` | Seal for external use. |
| `return` | `propagate` | Propagate a value outward. |

---

## Installation

```bash
# Install the OmniScript toolchain
npm install -g omniscript-cli@latest

# Initialize OmniScript in NovaMusic
cd novamusic
omni init

# Validate the manifest
omni validate omni.manifest

# Build to TypeScript target
omnibuild --target ts

# Launch the REPL
omni-shell
```

---

## Your First OmniScript File

Create `omniscript/hello.omni`:

```omni
// NovaMusic/omniscript/hello.omni
// © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

draw { Nova } from "nova:std"
draw { Vibe, Emotion } from "nova:std/types"

/// Greet a Dimensional Citizen entering The Sonic Dimension
manifest greetCitizen(userId: Text): flow<Text> {
  forge vibe  = sync Nova.Vibe.analyze(userId, window: Duration.hours(1))
  forge emotion = sync Nova.Emotion.getLatest(userId)

  forge message = when (vibe.intensity > 80.0%) {
    "Welcome, Dimensional Citizen. Your energy is high — The Sonic Dimension responds to you."
  } otherwise when (emotion.primary == EmotionClass.PEACE) {
    "Welcome. The The Sonic Dimension is calm and ready for your presence."
  } otherwise {
    "Welcome to NovaMusic. The The Sonic Dimension activates around you."
  }

  Nova.Log.info(`Citizen ${userId} entered The Sonic Dimension: ${message}`)
  propagate message
}
```

Run it:

```bash
omni-shell
> draw { greetCitizen } from "./omniscript/hello"
> sync greetCitizen("nova-user-alpha")
# "Welcome, Dimensional Citizen. Your energy is high..."
```

---

## Declaring Your First Engine

```omni
// NovaMusic/omniscript/my-first-engine.omni
// © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

draw { Nova } from "nova:std"
draw { Engine, EngineResult } from "nova:std/engine"

@engine(id: "my-first-engine", platform: "NovaMusic", version: "1.0.0")
engine MyNovaMusicEngine implements Engine {

  manifest compute(input: Nexus<Text, Any>): flow<EngineResult> {
    forge userId = input.get("userId") as Text
    forge vibe   = sync Nova.Vibe.analyze(userId)

    propagate EngineResult {
      engineId:   "my-first-engine",
      confidence: vibe.intensity,
      prediction: vibe.label,
      timestamp:  Timestamp.now()
    }
  }

  manifest calibrate(): flow<nil> { Nova.Log.info("Engine calibrated") }
  manifest report(): EngineReport { propagate EngineReport { engineId: "my-first-engine", status: Status.ACTIVE } }
}
```

Register it in `main.omni`:

```omni
draw { MyNovaMusicEngine } from "./my-first-engine"
Nova.Engine.register(MyNovaMusicEngine)
```

---

## Platform-Specific Example: VibeComposerEngine

```omni
// NovaMusic/omniscript/engines/VibeComposerEngine.omni
// © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

draw { Nova } from "nova:std"
draw { Engine, EngineResult } from "nova:std/engine"

@engine(id: "vibecomposerengine-v1", platform: "NovaMusic", version: "1.0.0", priority: Priority.CRITICAL)
engine VibeComposerEngine implements Engine {

  manifest compute(input: Nexus<Text, Any>): flow<EngineResult> {
    forge userId  = input.get("userId") as Text
    forge context = input.get("context") as Any

    forge vibe    = sync Nova.Vibe.analyze(userId, window: Duration.hours(24))
    forge emotion = sync Nova.Emotion.getLatest(userId)

    // Translates user Vibe and EmotionDNA into BPM, key, genre, and energy parameters
    forge result  = sync this.resolveIntelligence(context, vibe, emotion)

    propagate EngineResult {
      engineId:   "VibeComposerEngine",
      confidence: result.confidence,
      prediction: result.value,
      timestamp:  Timestamp.now()
    }
  }

  manifest resolveIntelligence(context: Any, vibe: Vibe, emotion: Emotion): flow<{ confidence: Probability, value: Any }> {
    propagate { confidence: 91.0%, value: context }
  }

  manifest calibrate(): flow<nil> { this.lastCalibration = Timestamp.now() }
  manifest report(): EngineReport { propagate EngineReport { engineId: "VibeComposerEngine", status: Status.ACTIVE } }
}
```

---

## Sending Your First IDB Signal

```omni
// Emit a Cross-Dimensional Signal
Nova.Bus.emit("nova-music.session.started", Signal {
  topic:   "nova-music.session.started",
  payload: { userId: "nova-user-alpha", platform: "NovaMusic" },
  origin:  "novamusic",
  priority: Priority.HIGH
})
```

---

## Next Steps

1. Read [OMNISCRIPT-REFERENCE.md](./OMNISCRIPT-REFERENCE.md) for the full language reference
2. Explore [TERMINOLOGY-GLOSSARY.md](./TERMINOLOGY-GLOSSARY.md) for NovaMusic terminology
3. Study the `omniscript/` directory in this repo for complete platform examples

---

*© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.*
*OmniScript is a proprietary language of Jeffrey W Williams LLC.*
