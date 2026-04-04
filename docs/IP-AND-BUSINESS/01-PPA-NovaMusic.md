# PROVISIONAL PATENT APPLICATION

**Title:** AI-Powered DJ Automation Engine, Real-Time Crowd Engagement Scoring System, and Spatial Audio Experience Platform for Live Music Events

**Applicant:** Jeffrey W. Williams LLC
**Owner:** Jeffrey W. Williams / Jeffrey W. Williams LLC, under the OmniDLOS Holdings ecosystem
**Filing Date:** April 4, 2026
**USPTO Micro-Entity Filing Fee:** $320
**Classification:** CONFIDENTIAL — Owner Eyes Only

© 2026 OmniDLOS Holdings. All Rights Reserved.

---

## CROSS-REFERENCE TO RELATED APPLICATIONS

Not Applicable. This is an original provisional patent application.

---

## STATEMENT REGARDING FEDERALLY SPONSORED RESEARCH OR DEVELOPMENT

Not Applicable.

---

## FIELD OF THE INVENTION

The present invention relates to computer-implemented systems and methods for artificial intelligence-driven music mixing, real-time crowd engagement quantification and response, spatial audio processing in browser-based environments, and artist-to-DJ direct music licensing with automated royalty computation — together constituting a unified Social AI Music Experience platform for live and remote entertainment events.

More particularly, the invention encompasses: (1) an AI DJ Auto-Mix Engine that analyzes audio tracks using multi-modal AI to produce optimal setlists and timed transition plans; (2) a Real-Time Crowd Engagement Scoring System (RESS) that quantifies live audience energy via emoji reactions-per-minute and delivers AI-generated coaching interventions to DJs; (3) a Browser-Based Spatial Audio Engine implementing per-deck multi-band equalization, convolver-based reverb, and programmable crossfader curves via the Web Audio API; (4) a Mood-Reactive Crowd Synchronization System that broadcasts DJ-controlled mood states to all connected audience devices simultaneously; (5) a Synchronized Multi-Peer WebRTC Audio Broadcast System for live DJ audio distribution to unlimited audience phones; and (6) an Artist-Fan Direct Marketplace with AI-Curated Track Recommendations and automated royalty accounting at a 15%/85% platform/artist split.

---

## BACKGROUND OF THE INVENTION

### A. The State of Digital Music Platforms

The global music streaming and digital entertainment market exceeded $36.96 billion in 2025 and is projected to reach $77 billion by 2030. Despite this scale, existing music platforms suffer from fundamental architectural separations that the present invention addresses:

**First, passive listening vs. active DJ experience.** Dominant platforms (Spotify, Apple Music, Tidal) are engineered for passive, single-listener consumption. They provide zero capability for multi-deck simultaneous playback, professional mixing, or crowd interaction. Conversely, professional DJ software (Serato, Traktor) is engineered for performance but requires expensive desktop installation, provides no crowd engagement layer, and offers no integrated music marketplace or royalty management system.

**Second, absence of AI setlist intelligence.** The process of planning a DJ set — analyzing hundreds of tracks for BPM compatibility, harmonic key compatibility, energy flow, and crowd-trend relevance — requires hours of expert manual work. No existing consumer platform applies large language model AI to simultaneously compute BPM/harmonic compatibility scores, verify real-time chart-trending status, and generate timed auto-mix execution plans.

**Third, the crowd engagement gap.** Live music events generate enormous audience energy signals (applause, dancing, requests, reactions) that are invisible to the DJ in digital form. No existing DJ platform provides a real-time quantitative audience energy metric, an automated AI coaching system triggered by energy drops, or a synchronized mood broadcast that transforms audience phone screens into a coordinated light show.

**Fourth, the independent artist monetization problem.** Independent artists face a multi-intermediary royalty collection process involving PROs, labels, distributors, and digital service providers, yielding artists a small fraction of per-play revenue after each intermediary takes a share. No existing browser-based DJ platform enables direct artist-to-DJ licensing with artist-controlled per-play royalty rates, automated play event logging, and transparent monthly payout calculation.

**Fifth, browser limitations for professional audio.** Professional audio processing — multi-band EQ, convolution reverb, variable crossfader curves, beat-accurate loop controls — has been confined to native desktop applications. No existing platform fully implements a professional 4-deck audio signal chain, algorithmic musical key detection via chromagram analysis, and beat grid generation entirely within the browser's Web Audio API without plugin or native code.

### B. Prior Art and Limitations

**Automatic Audio Mixing (US20230267899A1):** Describes an automatic mixing device analyzing BPM and musical features for audio mixing. Does not implement: (a) multi-modal AI combining audio metadata extraction, large language model analysis, and real-time web search trend verification in a layered data reconciliation pipeline; (b) crowd engagement scoring triggering AI interventions; or (c) harmonic Camelot Wheel compatibility matrices for DJ transition planning.

**Crowd Sentiment Detection (US20160226610A1):** Describes physical venue sensor systems (vibration sensors, cameras, wearable devices) for detecting crowd sentiment. Does not implement: (a) emoji reaction RPM (reactions-per-minute) as a quantified digital engagement metric; (b) AI-generated DJ coaching interventions triggered by RPM thresholds; or (c) mood synchronization that broadcasts visual color states to audience smartphones.

**Spotify Mood-Based Recommendation Patents (various):** Describe passive listener mood inference from behavioral signals. Do not implement: (a) DJ-controlled mood broadcast that synchronizes background color on all connected audience devices; (b) integration with a live DJ mixing console; or (c) real-time crowd reaction data as the mood input signal.

**Algoriddim djay Patents (US11,740,862; US11,488,568; US11,216,244):** Cover audio stem decomposition, audio transport control, and pitch shifting in native iOS/macOS applications. Do not implement: (a) browser-based implementation via Web Audio API without native code; (b) real-time crowd engagement scoring and AI coaching; (c) artist marketplace with direct royalty accounting; or (d) multi-peer WebRTC audio broadcast from DJ to unlimited audience phones.

**Mood-Based Music Recommendation (US20090182736A1):** Describes a passive listener recommendation system using playback event rewards. Does not implement: (a) DJ-controlled active mood broadcasts to crowd devices; (b) integration with live event mixing; or (c) crowd reaction data as mood input.

### C. Need in the Art

What is needed is a unified, browser-based Social AI Music Experience platform that: (1) applies large language model AI, audio signal analysis, and real-time trend verification to compute optimal DJ setlists and transition plans without expert manual effort; (2) quantifies crowd energy in real time via emoji reaction rate, triggers AI coaching interventions when energy drops, and synchronizes mood states to all connected audience devices; (3) implements a full professional audio signal chain — including multi-band EQ, convolution reverb, programmable crossfader curves, and Camelot Wheel harmonic mixing — entirely in the browser via the Web Audio API; (4) broadcasts DJ mix audio to unlimited audience phones via multi-peer WebRTC without server re-encoding; and (5) enables independent artists to set their own per-play royalty rates and receive automated monthly payouts at an 85% net rate, with complete ISRC-tagged play event logging for PRO reporting compliance.

---

## SUMMARY OF THE INVENTION

The present invention, designated NovaMusic, is a browser-based Social AI Music Experience platform implemented in TypeScript with React 18 and Node.js/Express.js backends, comprising 28,871 lines of production code across 131 source files. The platform unifies three user-facing experiences — AI DJ Mode, DJ Console, and Party Mode — with an Artist Marketplace and real-time crowd engagement infrastructure.

The invention's principal novel technical contributions are:

1. **AI DJ Auto-Mix Engine:** A multi-stage, multi-modal track analysis and setlist optimization pipeline combining server-side audio metadata extraction, Web Audio API energy analysis, GPT-4.1-mini AI inference with genre-specific BPM priors, and real-time DuckDuckGo trend verification — producing an `AnalyzedTrack` object with fire zone coordinates, harmonic compatibility scores, and timed auto-mix execution plans.

2. **Real-Time Crowd Engagement Scoring System (RESS):** A server-side automated system measuring emoji reactions-per-minute (RPM) across all active events on a 60-second interval, identifying energy drops below a threshold of 3 RPM, querying the pending song request queue, and delivering AI-generated targeted coaching alerts to DJ clients via selective WebSocket broadcast.

3. **Browser-Based Spatial Audio Engine:** A complete professional DJ audio signal chain implemented entirely via Web Audio API, including 4-deck playback, per-deck stems emulation (bass/mid/high/vocals filters), 3-band parametric EQ, variable lowpass/highpass filter, delay with feedback loop, algorithmic convolution reverb, three mathematically distinct crossfader curve modes (linear, equal-power, hard-cut), and master dynamics compression with four presets — all without native code or plugins.

4. **Mood-Reactive Crowd Synchronization System:** A DJ-controlled real-time mood broadcast that transmits hex color codes and mood keywords (HYPE, CHILL, GOLDEN, VIBIN, MYSTIC, FIRE) via WebSocket to all connected audience devices, which immediately apply the color as their background with CSS transitions and display the keyword — transforming audience smartphones into a synchronized light show.

5. **Multi-Peer WebRTC Audio Broadcast System:** A peer-to-peer audio broadcasting architecture where the DJ's Web Audio API master node output is captured via `MediaStreamAudioDestinationNode` and transmitted to each connected audience member via a dedicated RTCPeerConnection with independent SDP negotiation, enabling unlimited audience reception with no server audio relay or re-encoding.

6. **Artist-Fan Direct Marketplace with AI Curation:** A music licensing marketplace where independent artists set per-play royalty rates ($0.01–$1.00/play), DJs browse and load tracks to decks, and every play event is logged with ISRC metadata, royalty amount, venue name, and timestamp — with automated monthly royalty calculation applying 15% platform fee and 85% net payout to artists.

---

## DETAILED DESCRIPTION

### I. AI DJ Auto-Mix Engine

#### A. Multi-Stage Track Analysis Pipeline

The AI DJ Auto-Mix Engine (implemented in `server/ai-dj.ts`) processes uploaded audio files through four sequential analysis stages in a layered data reconciliation pipeline where each stage can override prior-stage values based on data quality signals:

**Stage 1 — Server-Side Audio Metadata Extraction:** The `music-metadata` npm package extracts from the audio file's binary headers: duration (seconds), title, artist, album, BPM (if embedded in ID3 tags), and MIME type. These values form the baseline `AnalyzedTrack` object.

**Stage 2 — Client-Side Web Audio API Energy Analysis:** The browser independently analyzes the uploaded audio file using the Web Audio API, computing an energy percentage (0–100) from RMS analysis of the decoded audio buffer. The client transmits these energy measurements as structured metadata alongside the file upload, supplementing the server-extracted data.

**Stage 3 — GPT-4.1-mini AI Inference with Genre-Specific BPM Priors:** A structured prompt encodes genre-specific BPM ranges for 15 global music genres (e.g., Amapiano: 112–114, Phonk: 130–160, UK Garage: 130–136, EDM: 128–140, Afrobeats: 95–115, Drill: 135–145, Dancehall: 80–100) as prior constraints for the AI inference. The LLM analyzes the track title and artist name to infer: likely genre, estimated BPM within the genre-specific range, estimated musical key, energy level category (low/medium/high/very high), and mood classification (dark/energetic/uplifting/melancholic/aggressive/smooth). The AI output fills any gaps not covered by the binary metadata extraction.

**Stage 4 — Real-Time Trend Verification via DuckDuckGo API:** The engine performs a timeout-gated HTTP request to DuckDuckGo's Instant Answer API querying the track name and artist. The response's Abstract field is analyzed via lexical matching against chart signal keywords (Billboard, Spotify Global, Grammy, platinum certifications, "trending," "chart"). Successful matches set `isTrending = true` with an evidence text field. Trending status extends the detected fire zone duration from 60 to 90 seconds.

The final `AnalyzedTrack` object applies source priority: client-measured energy > server-extracted metadata > AI inference for each field, producing a maximally accurate multi-source reconciled track profile.

#### B. Fire Zone Detection Algorithm

The Fire Zone Detection algorithm (`estimateFireZone` function) identifies the highest-impact DJ-playable segment of each track:

1. **Base offset computation:** A genre-specific fractional time offset determines the starting point — EDM: 0.33, Pop: 0.25, Hip Hop: 0.28, all other genres: 0.30.
2. **Energy-level adjustment:** High-energy tracks receive an earlier fire zone offset (subtracted by 0.03) to account for their earlier energy peak.
3. **Client override:** If client-measured `fireZoneStart` is valid (> 0 and < 95% of track duration), it overrides the server estimate — creating a client/server collaborative detection system.
4. **Duration extension:** Trending tracks receive a 90-second fire zone duration vs. 60 seconds for non-trending tracks.
5. **Label assignment:** Three tier labels are assigned based on energy: "The Drop 🔥" (high/very high energy), "The Hook ⚡" (medium energy), "Best Part 🎵" (low energy).

#### C. Harmonic Compatibility Scoring and Optimal Setlist Construction

The Harmonic Compatibility Scoring algorithm (`scoreMixTransition` function) evaluates each track pair on a 0–100 compatibility scale:

**BPM Compatibility Scoring:**
- BPM difference ≤ 2: 50 base points (perfect match)
- BPM difference ≤ 5: 40 points
- BPM difference ≤ 8: 25 points
- BPM difference ≤ 12: 15 points
- BPM difference > 12: 0 points (incompatible without tempo adjustment)
- Half-time/double-time detection: if BPM ratio is 0.48–0.52 (approximately 1:2), add 18 bonus points — enabling harmonic mixing between songs at half or double tempo

**Camelot Wheel Harmonic Compatibility:**
All 24 musical keys (12 major, 12 minor) are mapped to Camelot Wheel numbers (1A–12B). Compatibility scoring:
- Same key: 30 points
- Adjacent Camelot number (same mode): 20 points
- Relative major/minor (same Camelot number, different mode): 15 points
- All other combinations: 0 points

**Blend Type Assignment (based on total score):**
- Score ≥ 75: "long-blend" (32 beats, fade FX: reverb out → fade in)
- Score ≥ 55: "quick-blend" (16 beats, EQ filter sweep)
- Score ≥ 35: "echo-out" (8 beats, echo-out FX on outgoing)
- Score < 35: "cut" (4 beats, hard cut with no FX)

**Optimal Setlist Construction** (`buildOptimalOrder` function) solves the approximate traveling salesman problem over the track compatibility graph using a greedy nearest-neighbor algorithm seeded from the track with BPM closest to 120 BPM (the empirically optimal crowd warm-up starting tempo). Three vibe modes modify behavior: "chill" (ascending energy ordering), "hype" (descending energy ordering), and "balanced" (graph traversal by compatibility score).

#### D. Auto-Mix Execution Plan

The Auto-Mix Execution Plan (`/api/ai-dj/auto-mix-plan` endpoint) generates a timed sequence of mixer actions with millisecond timestamps: `setRate`, `playDeck`, `pauseDeck`, `crossfade`, `setReverb`, `setDelay`. This plan is computed server-side and transmitted to the client, which executes the plan via `setTimeout` scheduling — enabling fully automated hands-free DJ mixing.

#### E. AI Pre-Gig Briefing System (DJ Jeff)

The AI Pre-Gig Briefing System (DJ Prep Studio, implemented in `client/src/components/dj-prep-studio.tsx`) accepts user-supplied gig metadata (venue name, event type, crowd size, vibe category) and an ordered setlist, then generates a GPT-4.1-mini briefing covering: set arc commentary, personalized vibe message, genre journey narrative, and pre-gig checklist items. The AI persona "DJ Jeff" delivers all coaching through the platform using Server-Sent Events streaming for real-time character-by-character display.

---

### II. Real-Time Crowd Engagement Scoring System (RESS)

#### A. Emoji Reaction Rate Measurement

The RESS measures crowd energy via the Emoji Reaction Rate (ERR, referred to as RPM — reactions per minute) metric. Each audience member connected to the crowd page can submit emoji reactions (standard Unicode emoji) that are timestamped and stored in the server's in-memory event reaction store.

The RPM is computed as: `RPM = count(reactions where createdAt > now - 60000ms)` — the count of reactions received across all crowd members in the event room during the prior 60 seconds.

RPM is computed and broadcast to the DJ client via WebSocket every 30 seconds, and displayed as an animated color-coded progress bar: green (RPM ≥ 10), yellow (RPM ≥ 5), orange (RPM ≥ 3), red (RPM < 3).

#### B. Automated AI Crowd Coach

The Automated AI Crowd Coach (`checkCrowdEnergy` function) runs server-side on a 60-second interval across all active events simultaneously. For each event where RPM < 3:

1. **Queue analysis:** The system queries the pending song request queue for the event and identifies the top 3 most-frequently-requested tracks.
2. **AI prompt construction:** A GPT-4.1-mini prompt is constructed encoding the current RPM, the current crowd size, and the top requested tracks.
3. **Coaching message generation:** The LLM generates a targeted coaching intervention (e.g., "Crowd energy dropping — 3 people have requested [Track X], consider playing it or transitioning to a higher-energy track").
4. **Selective broadcast:** The coaching message is transmitted only to verified DJ WebSocket connections (tracked in a `WeakSet` of DJ-type connections), never to crowd clients.

#### C. Crowd Engagement Feature Ecosystem

The RESS includes additional engagement mechanisms beyond emoji reactions:

- **Priority Song Requests:** Audience members pay to promote their song request to the top of the DJ's queue (`priorityPaid DESC, createdAt ASC` sort order). The platform collects 15% of the priority fee (`PLATFORM_CUT = 0.15`) with the DJ receiving 85% (`DJ_CUT = 0.85`).
- **Live Polls:** DJ creates multiple-choice polls; crowd votes in real time; DJ closes poll and reveals winner.
- **Paid Shoutouts:** Crowd members pay for personalized shoutout messages displayed to the DJ.
- **Tiered Tip System:** Four-tier tip animation system based on tip amount (small < $2, medium $2–$5, large $5–$10, mega ≥ $10) with confetti particle animation on mega tips and goal achievement.
- **DJ Battle Mode:** Two DJs compete on Deck A vs. Deck B; crowd votes for a winner; live scoreboard updates in real time; winner determined by vote count.
- **Engagement Leaderboard:** Audience members ranked by cumulative engagement (reactions + requests + tips) per event.

---

### III. Browser-Based Spatial Audio Engine

#### A. Complete Per-Deck Audio Signal Chain

The Spatial Audio Engine (implemented in `client/src/hooks/use-audio-engine.ts`) provides four independent audio signal chains, each comprising:

```
AudioBufferSource → Stems Emulation Layer → 3-Band EQ →
Variable Filter → Delay (with feedback) → Algorithmic Reverb →
Gain → FFT Analyzer (2048-point, 0.8 smoothing) → Talkover Gain →
DynamicsCompressor → Master Gain → Master Analyzer (1024-point) →
AudioContext.destination
```

**Stems Emulation Layer:** Four parallel filter branches:
- Bass stem: lowpass filter at 250 Hz → bass gain node
- Mid stem: bandpass filter at 1,000 Hz (Q = 0.7) → mid gain node
- High stem: highpass filter at 2,000 Hz → high gain node
- Vocals stem: bandpass filter at 1,500 Hz (Q = 0.8) → vocals gain node

**3-Band Parametric EQ:**
- EQ Low: lowshelf filter at 320 Hz
- EQ Mid: peaking filter at 1,000 Hz (Q = 0.5)
- EQ High: highshelf filter at 3,200 Hz

**Variable Filter:** Switchable lowpass/highpass filter with variable cutoff frequency, enabling DJ filter sweeps.

**Delay Effect:** Parallel delay/dry signal path with configurable delay time and feedback gain node forming a feedback loop — producing echo and delay effects.

**Algorithmic Convolution Reverb:** Programmatically generated stereo impulse response using exponential decay noise: `data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)` with 2-second duration and decay factor 2. This generates studio-quality reverb via ConvolverNode without requiring a pre-recorded impulse response audio file.

#### B. Musical Key Detection via Chromagram Analysis

The browser-based key detection algorithm (`detectKey` function) operates entirely without server calls or external libraries:

1. **Sampling:** Audio buffer sampled at 10 intervals per second for the first 30 seconds.
2. **Chroma vector construction:** At each sample, a 12-bin chroma vector is built by computing autocorrelation against all MIDI pitches 36–84 (C2 to C6), mapping each note's frequency to its pitch class (0 = C, 1 = C#, etc.).
3. **Normalization:** The 12-bin chroma vector is normalized to its maximum value.
4. **Key profile correlation:** The normalized chroma vector is correlated against the Krumhansl-Schmuckler major profile (A_MAJOR_PROFILE) and minor profile (A_MINOR_PROFILE) for all 12 transpositions, selecting the key with highest correlation.
5. **Camelot mapping:** The detected key is immediately mapped to its Camelot Wheel code for harmonic mixing display.

#### C. Three-Curve Crossfader System

Three mathematically distinct crossfader implementations:

- **Smooth (Linear):** `vol_A = 1 - crossfade; vol_B = crossfade` — continuous linear blend
- **Club (Equal-Power):** `vol_A = Math.sin((1 - crossfade) * π/2); vol_B = Math.sin(crossfade * π/2)` — constant power maintained throughout transition, industry-standard club curve
- **Cut (Hard-Cut):** `vol_A = crossfade < 0.5 ? 1 : 0; vol_B = crossfade > 0.5 ? 1 : 0` — hard threshold enabling scratching techniques

Independent crossfaders serve A/B and C/D deck pairs simultaneously.

#### D. Automated Structural Landmark Detection with Beat-Snapped Hot Cues

The Landmark Detection algorithm (`detectLandmarks` function) analyzes the decoded audio buffer to identify four structural segments:

1. **32-segment energy profile:** The audio buffer is divided into 32 equal time windows; RMS energy (mean of squared samples) is computed per window; values normalized to maximum window energy.
2. **INTRO detection:** First window exceeding 10% of peak energy.
3. **DROP detection:** Window exhibiting the largest single-frame energy increase (max delta between consecutive windows).
4. **BUILD detection:** DROP position minus 16 beats (derived from BPM-to-samples conversion).
5. **OUTRO detection:** Last window from the track end where energy drops below 15% of peak.
6. **Beat-snap:** All four landmark positions are snapped to the nearest beat grid interval using `Math.round(positionInBeats) * samplesPerBeat`.

Each landmark receives a distinct color code (red = INTRO, amber = BUILD, green = DROP, blue = OUTRO) and is placed as a hot cue in the deck's hot cue array.

---

### IV. Mood-Reactive Crowd Synchronization System

#### A. Mood Broadcast Architecture

The DJ sets a mood from six presets, each with an associated hex color and keyword:

| Mood | Hex Color | Keyword |
|------|-----------|---------|
| HYPE | #ff2d78 | HYPE |
| CHILL | #38bdf8 | CHILL |
| GOLDEN | #fbbf24 | GOLDEN |
| VIBIN | #818cf8 | VIBIN |
| MYSTIC | #e879f9 | MYSTIC |
| FIRE | #ef4444 | FIRE |

The DJ triggers a mood update via the Crowd Hub panel, which calls `POST /api/events/:eventId/mood` with `{ moodColor, moodKeyword }`. The server updates the event's `moodColor` and `moodKeyword` fields and broadcasts a `mood_update` WebSocket message to all connected clients in the event room.

#### B. Crowd Device Color Synchronization

Each audience device connected to the crowd page maintains a WebSocket listener for `mood_update` messages. Upon receipt, the crowd page:
1. Applies the received hex color as the page background color via CSS transition for smooth visual effect.
2. Displays the mood keyword in a prominent overlay.
3. Triggers a "mood pulse" CSS animation to provide visual acknowledgment.

The result is a synchronized light show where all audience smartphones simultaneously display the DJ-selected color and mood keyword.

#### C. Synchronized Lyrics and Crowd Sing-Along

The Lyrics Panel (`client/src/components/lyrics-panel.tsx`) fetches lyrics from external APIs (Lyrist, lyrics.ovh) based on currently playing track name and artist. The DJ views lyrics with auto-advancing active-line highlighting. The DJ can push any lyric line to all connected crowd devices via a `crowd_sing` WebSocket message, prompting crowd members to display and sing along with the current line — enabling synchronized audience karaoke.

---

### V. Multi-Peer WebRTC Audio Broadcast System

#### A. Master Audio Capture

The DJ's Web Audio API master signal chain output is captured via `MediaStreamAudioDestinationNode` — a Web Audio API node that converts the processed audio graph output into a `MediaStream` object. This enables capture of the DJ's mixed, processed, and mastered audio output (not a raw microphone signal) for WebRTC transmission.

#### B. Per-Listener RTCPeerConnection Management

For each audience member who joins the broadcast, the system creates a dedicated `RTCPeerConnection` (`use-webrtc-broadcast.ts`):

1. The DJ's broadcast hook adds the captured audio track to the RTCPeerConnection via `pc.addTrack(audioTrack)`.
2. The DJ's browser generates an SDP offer and transmits it via WebSocket to the server.
3. The server routes the SDP offer to the specific listener using their unique `listenerId` string.
4. The listener's browser generates an SDP answer and transmits it back via WebSocket.
5. ICE candidates are exchanged between DJ and each listener via the WebSocket signaling relay.
6. Audio streams directly peer-to-peer from DJ browser to listener browser without server audio relay.

**Late-joiner support:** If a listener joins after broadcast has started, the server sends an `rtc_broadcasting` notification, prompting the listener to initiate an SDP offer request, and the DJ's hook responds with a new offer — ensuring late joiners receive audio without interrupting existing connections.

---

### VI. Artist-Fan Direct Marketplace with AI Curation

#### A. Artist Track Upload and Pricing

Independent artists create accounts and upload tracks in any supported format (MP3, WAV, FLAC, OGG, M4A, AAC, Opus). Per-track metadata includes: genre, BPM, musical key, ISRC code, license type, and royalty rate. Three license types are supported:

- **Free:** No royalty charge; available to any DJ.
- **Royalty Per Play:** Artist sets a per-play rate of $0.01–$1.00; every play event generates a royalty charge.
- **Exclusive Promo:** Requires credit in DJ's setlist; no monetary royalty.

#### B. Play Event Logging and Royalty Accounting

Every track play event is logged in the `play_events` database table with: `trackId`, `eventId`, `djUserId`, `trackTitle`, `artistName`, `label`, `isrc`, `licenseType`, `duration`, `royaltyAmount`, `playedAt`, `eventName`, `venueName`. This produces an ISRC-tagged, venue-attributed play log suitable for PRO (Performing Rights Organization) reporting.

Monthly royalty calculation aggregates play counts and gross royalty amounts per artist, applies the platform fee (`PLATFORM_FEE = 0.15`), computes the net payout (`netAmount = totalAmount × 0.85`), and creates a `royalty_payouts` record with status "pending" until admin marks as paid.

#### C. PRO Compliance CSV Export

The system generates downloadable CSV cue sheets per event (`GET /api/play-events/event/:eventId/csv`) formatted as PRO-compliant reporting documents with headers identifying the cue sheet purpose. Fields include track title, artist name, label, ISRC, license type, duration, royalty amount, and timestamp — matching standard PRO reporting requirements for ASCAP, BMI, and SESAC.

---

## CLAIMS

What is claimed is:

**Claim 1.** A computer-implemented music platform comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that, when executed by the one or more processors, implement an AI DJ Auto-Mix Engine configured to: receive a plurality of audio track files; extract audio metadata from each audio track file using a server-side audio metadata extraction module; receive client-computed energy analysis for each audio track from a Web Audio API analysis module executing in a user's browser; analyze each audio track's title and artist name using a large language model AI module that applies genre-specific BPM prior constraints for a plurality of distinct music genres to infer BPM, musical key, energy level, and mood when not determinable from audio metadata extraction; verify trending status of each audio track by querying a real-time web search API and matching the response against chart signal keywords; produce a reconciled analyzed track object for each audio track by applying source priority rules wherein client-measured energy overrides server-extracted metadata which overrides AI inference; compute a harmonic compatibility score between each pair of analyzed tracks based on BPM difference and Camelot Wheel harmonic key compatibility; and generate an optimal track ordering using a greedy nearest-neighbor algorithm seeded from the track with BPM closest to a target starting tempo.

**Claim 2.** The platform of claim 1, wherein the AI DJ Auto-Mix Engine further computes a blend type for each consecutive pair of tracks in the optimal ordering from among a set of blend types including long-blend, quick-blend, echo-out, and hard-cut, wherein the blend type is selected based on the harmonic compatibility score exceeding progressively lower thresholds, and wherein each blend type is associated with a prescribed blend duration in musical beats and a prescribed audio effects chain for the outgoing track.

**Claim 3.** The platform of claim 1, wherein the AI DJ Auto-Mix Engine further implements a Fire Zone Detection algorithm that: computes a genre-specific fractional time offset for each analyzed track based on the AI-inferred genre; adjusts the fractional time offset based on the track's energy level classification; extends the fire zone duration for tracks identified as trending by the web search verification step; and accepts a client-measured fire zone start position that overrides the server-computed estimate when the client-measured value is within valid bounds.

**Claim 4.** The platform of claim 1, wherein the large language model AI module encodes genre-specific BPM prior constraints comprising at least: a first BPM range for Amapiano tracks; a second BPM range for Phonk tracks; a third BPM range for UK Garage tracks; and a fourth BPM range for EDM tracks, wherein the BPM prior constraints constrain the large language model's BPM inference to a plausible range for the identified genre.

**Claim 5.** The platform of claim 1, wherein the harmonic compatibility score further applies a half-time and double-time BPM compatibility detection rule that adds bonus points to the compatibility score when the ratio of the two tracks' BPMs is within a range of 0.48 to 0.52, enabling harmonic mixing between tracks at half or double tempo relationship without requiring manual tempo adjustment.

**Claim 6.** A computer-implemented system comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that, when executed, implement a Real-Time Crowd Engagement Scoring System (RESS) configured to: maintain, for each active music event, a timestamped store of emoji reaction submissions from connected audience devices; compute an emoji reaction rate metric (RPM) for each active event as the count of reactions received within a preceding 60-second window; compare the computed RPM against a threshold value; and upon detecting that the RPM for an event falls below the threshold value, retrieve pending song request records for the event, identify the most frequently requested tracks, generate a targeted crowd energy coaching message using a large language model AI that receives the current RPM, current crowd size, and most-requested track titles as inputs, and transmit the coaching message exclusively to verified DJ WebSocket connections for the event without transmitting to audience device connections.

**Claim 7.** The system of claim 6, wherein the verified DJ WebSocket connections are distinguished from audience WebSocket connections by a connection type identifier, and wherein the RESS maintains a WeakSet or equivalent data structure tracking only DJ-type connections for selective message delivery.

**Claim 8.** The system of claim 6, wherein the RESS further implements a tiered tip animation system that: receives tip submissions from audience devices; classifies each tip into a tier based on tip amount; triggers a visual animation on the DJ's display with duration scaled to the tip tier; triggers a confetti particle animation when a tip meets or exceeds a mega-tip threshold or when a DJ-configured tip goal is achieved; and maintains a real-time leaderboard ranking audience members by cumulative tip contribution per event.

**Claim 9.** The system of claim 6, wherein the RESS further implements a DJ Battle Mode comprising: a first DJ associated with a first deck designation; a second DJ capable of joining an existing event via an event code; a crowd voting mechanism enabling each audience member to cast one vote per event for either the first or second DJ; a real-time vote count broadcast to all connected clients; and a server-side winner determination computed as the DJ with the greater cumulative vote count.

**Claim 10.** The system of claim 6, wherein the RESS further implements a prioritized song request queue in which audience members may submit a paid priority promotion for their song request, wherein paid requests are sorted ahead of unpaid requests in the DJ's song request queue, and wherein the system computes and displays a platform commission and a DJ payment share for each paid priority request at submission time.

**Claim 11.** A computer-implemented browser-based audio processing system comprising:
one or more processors executing in a web browser environment;
instructions that, when executed, implement a Spatial Audio Engine comprising a plurality of independent audio signal chains, each chain comprising: an audio buffer source node receiving decoded digital audio data; a stems emulation layer comprising a plurality of parallel filter branches implementing at least a bass stem, a mid stem, a high stem, and a vocals stem, each branch comprising a filter node and an associated gain node; a three-band parametric equalizer comprising a lowshelf filter, a peaking filter, and a highshelf filter in series; a variable filter switchable between lowpass and highpass modes with variable cutoff frequency; a delay effect path comprising a parallel dry signal path and a delay node with a feedback gain node forming a feedback loop; a reverb effect comprising a ConvolverNode receiving a programmatically generated impulse response; a gain node; a spectrum analyzer node; and a dynamics compressor node;
wherein the Spatial Audio Engine is implemented entirely via a Web Audio API without native application code or browser plugins.

**Claim 12.** The browser-based audio processing system of claim 11, wherein the programmatically generated impulse response is computed by: generating a stereo audio buffer of a specified duration; filling each sample with a random value uniformly distributed between −1 and +1, multiplied by an exponential decay factor computed as `(1 − sample_index / total_samples)^decay_exponent`; and loading the resulting buffer into the ConvolverNode, thereby generating reverb without requiring a pre-recorded impulse response file.

**Claim 13.** The browser-based audio processing system of claim 11, further comprising a musical key detection module configured to: sample the decoded audio buffer at a rate of ten samples per second for up to thirty seconds of audio; compute a twelve-bin chroma vector at each sample by performing autocorrelation against MIDI pitches spanning at least MIDI notes 36 through 84; normalize the chroma vector to its maximum bin value; correlate the normalized chroma vector against stored Krumhansl-Schmuckler major and minor key profiles for all twelve transpositions; select the key with the highest correlation score; and map the detected key to a Camelot Wheel code for harmonic mixing display.

**Claim 14.** The browser-based audio processing system of claim 11, further comprising a structural landmark detection module configured to: divide the decoded audio buffer into a plurality of equal-duration time windows; compute root mean square (RMS) energy for each time window; normalize the energy values to the maximum window energy; identify an INTRO position as the first window exceeding a threshold percentage of peak energy; identify a DROP position as the window exhibiting the maximum single-frame energy increase between consecutive windows; identify a BUILD position as the DROP position offset by a configurable number of beats; identify an OUTRO position as the last low-energy window from the track end; and snap all four identified positions to the nearest beat grid interval using a beat-snap function derived from the track's beats-per-minute value.

**Claim 15.** The browser-based audio processing system of claim 11, further comprising a crossfader module implementing at least three distinct crossfader curve modes comprising: a linear curve mode computing deck volumes as linear interpolations of the crossfader position; an equal-power curve mode computing deck volumes as sinusoidal functions of the crossfader position producing constant perceived loudness throughout the transition; and a hard-cut curve mode computing deck volumes as binary threshold functions of the crossfader position enabling percussive scratch mixing techniques.

**Claim 16.** A computer-implemented mood synchronization system comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that, when executed, implement a Mood-Reactive Crowd Synchronization System configured to: receive a mood selection from a DJ user comprising a color value and a mood keyword selected from a predefined set of mood states; store the color value and mood keyword in an event state record associated with the DJ's active event; broadcast a mood update message comprising the color value and mood keyword via a WebSocket connection to all audience devices connected to the active event; upon receipt of the mood update message at each audience device, apply the color value as a background color of the audience device's display interface with a CSS transition animation; display the mood keyword prominently on the audience device's display interface; and trigger a mood pulse animation on each audience device's display interface to acknowledge receipt of the mood update.

**Claim 17.** The mood synchronization system of claim 16, further comprising a synchronized lyrics broadcast system configured to: retrieve lyrics for a currently playing track from one or more external lyrics API services; display the lyrics to the DJ user with automatic line advancement; and upon a DJ user action selecting a specific lyric line, transmit a crowd sing-along message comprising the selected lyric line via WebSocket to all connected audience devices, causing each audience device to display the lyric line for synchronized crowd participation.

**Claim 18.** A computer-implemented peer-to-peer audio broadcast system comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that, when executed, implement a Multi-Peer WebRTC Audio Broadcast System configured to: capture a DJ's processed audio output by connecting a MediaStreamAudioDestinationNode to a master gain node of a Web Audio API signal chain, thereby producing a MediaStream object containing the processed mix output; for each audience device that requests an audio broadcast connection, create a dedicated RTCPeerConnection and add the captured audio track to the connection; generate a Session Description Protocol (SDP) offer for each audience device connection and transmit the offer via a WebSocket signaling relay server; receive SDP answers and ICE candidates from each audience device via the WebSocket signaling relay and complete peer-to-peer connection establishment; and for each audience device that connects after the broadcast has begun, receive a broadcast join notification via WebSocket and generate a new SDP offer to extend the broadcast to the late-joining device.

**Claim 19.** A computer-implemented music licensing marketplace comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that, when executed, implement an Artist-Fan Direct Marketplace configured to: enable independent artists to upload audio tracks with per-track metadata including at minimum a license type, a royalty rate, a BPM value, a musical key, and an ISRC code; make uploaded tracks browsable and filterable by genre, BPM range, musical key, and license type to DJ users; log each track play event in a persistent database record containing at minimum the track identifier, artist identifier, DJ user identifier, event identifier, track title, artist name, label, ISRC code, license type, track duration, computed royalty amount, play timestamp, event name, and venue name; periodically compute aggregate royalty payouts per artist comprising the total play count, total gross royalty amount, a platform fee computed as a fixed percentage of gross royalty amount, and a net payout amount computed as the remainder after deducting the platform fee; and generate downloadable comma-separated value cue sheet reports per event containing the play event records formatted for performing rights organization reporting compliance.

**Claim 20.** The marketplace of claim 19, wherein the platform fee percentage is 15% and the net payout percentage to artists is 85%, and wherein the platform fee and net payout percentages are defined as named constants in the platform's data schema module and applied uniformly across all paid monetization streams including track royalties, priority song request fees, paid shoutout fees, and DJ tip payments.

**Claim 21.** A computer-implemented method for automated setlist optimization comprising:
receiving, from a user's browser, a plurality of audio track files and associated client-computed audio energy analysis data;
extracting audio metadata from each audio track file using a server-side audio parsing module;
sending track title and artist name for each audio track to a large language model API with a prompt encoding genre-specific BPM range constraints for a plurality of distinct music genres and requesting inference of genre, BPM, musical key, energy level, and mood;
for each audio track, querying a real-time web search API with the track title and artist name and classifying the track as trending if the search response contains predefined chart signal keywords;
computing, for each pair of audio tracks, a harmonic compatibility score based on the BPM difference between the tracks and the Camelot Wheel relationship between the tracks' musical keys;
constructing an optimal track ordering by: selecting as a starting track the audio track with BPM closest to a target starting tempo; and iteratively appending the unordered track with the highest harmonic compatibility score with the most recently ordered track until all tracks are ordered;
computing a blend type and blend duration for each consecutive track pair in the optimal ordering based on the pair's harmonic compatibility score; and
returning the optimal track ordering, blend type for each transition, and an AI-generated setlist commentary to the user's browser.

**Claim 22.** The method of claim 21, further comprising: generating a timed auto-mix execution plan comprising a sequence of mixer actions with millisecond timestamps specifying deck playback changes, crossfader movements, and audio effect changes required to execute the computed setlist transitions; and transmitting the auto-mix execution plan to the user's browser for execution via programmatic timer scheduling.

**Claim 23.** The method of claim 21, further comprising: for each audio track, estimating a fire zone segment comprising a start time and end time identifying the highest-energy, most DJ-playable portion of the track, using a genre-specific fractional time offset modified by the track's energy level classification; and extending the fire zone end time for tracks classified as trending relative to tracks classified as non-trending.

**Claim 24.** A non-transitory computer-readable medium storing instructions that when executed implement a Social AI Music Experience platform comprising:
an AI DJ Auto-Mix Engine that analyzes a plurality of audio tracks using a combination of server-side audio metadata extraction, client-side Web Audio API energy analysis, large language model AI inference with genre-specific BPM priors, and real-time web search trend verification to produce optimal track orderings, harmonic transition plans, fire zone annotations, and auto-mix execution schedules;
a Real-Time Crowd Engagement Scoring System that measures emoji reaction rate per minute across active events, triggers AI-generated coaching alerts to DJ clients when reaction rate falls below a threshold, and manages a prioritized paid song request queue, DJ Battle Mode voting, and tiered tip animation overlays;
a Browser-Based Spatial Audio Engine implementing a four-deck professional audio signal chain via Web Audio API, including stems emulation, three-band parametric EQ, variable filter, delay with feedback, algorithmic convolution reverb, three mathematically distinct crossfader curve modes, and browser-native musical key detection via chromagram analysis;
a Mood-Reactive Crowd Synchronization System that broadcasts DJ-selected hex color and mood keyword to all connected audience devices via WebSocket, causing simultaneous background color changes and mood keyword display on all audience smartphones;
a Multi-Peer WebRTC Audio Broadcast System that captures the DJ's processed audio output via MediaStreamAudioDestinationNode and distributes it to each connected audience device via a dedicated RTCPeerConnection with independent SDP negotiation; and
an Artist-Fan Direct Marketplace enabling independent artists to set per-play royalty rates, DJs to browse and load licensed tracks, and the platform to log ISRC-tagged play events, compute 85%/15% artist/platform royalty splits, generate monthly payout records, and export PRO-compliant CSV cue sheets.

**Claim 25.** A computer-implemented system for subscription-gated feature delivery in a live music event platform comprising:
one or more processors;
a non-transitory computer-readable medium storing instructions that implement a feature gating system that: maintains a subscription record for each DJ user comprising a tier designation drawn from a predefined tier hierarchy; enforces subscription tier requirements at the API endpoint level for each premium feature before allowing the feature to execute; and provides a time-limited event-scoped subscription enabling full-tier access for a single 24-hour period tied to a specific event identifier.

**Claim 26.** The system of claim 25, wherein premium features gated by subscription tier include at minimum: priority song request queue management; live audience polls with real-time voting; DJ Battle Mode; Mood Board crowd color synchronization; real-time audio broadcast via WebRTC; and AI Crowd Coach automated energy monitoring and intervention.

---

## ABSTRACT

A Social AI Music Experience platform — NovaMusic — comprises six novel technical systems implemented in 28,871 lines of browser-based TypeScript production code: (1) an AI DJ Auto-Mix Engine that analyzes audio tracks through a four-stage multi-modal pipeline combining server-side metadata extraction, Web Audio API client energy analysis, GPT-4.1-mini AI inference with genre-specific BPM priors for 15 music genres, and real-time DuckDuckGo chart trend verification — producing harmonic Camelot Wheel compatibility scores, fire zone coordinates, greedy nearest-neighbor optimal set orderings, and timed auto-mix execution plans; (2) a Real-Time Crowd Engagement Scoring System measuring emoji reactions-per-minute across all active events on a 60-second server interval, triggering AI-generated DJ coaching alerts when RPM drops below threshold, and managing prioritized paid song requests, DJ Battle Mode, and tiered tip animations; (3) a Browser-Based Spatial Audio Engine implementing four-deck professional audio processing via Web Audio API including stems emulation, 3-band parametric EQ, delay with feedback, algorithmic impulse-response reverb, and three crossfader curve modes (linear/equal-power/hard-cut) — plus browser-native chromagram-based musical key detection and 32-segment energy profile landmark detection; (4) a Mood-Reactive Crowd Synchronization System broadcasting DJ-selected colors and mood keywords to all connected audience smartphones via WebSocket for simultaneous background synchronization; (5) a Multi-Peer WebRTC Audio Broadcast System capturing the DJ's master audio output via MediaStreamAudioDestinationNode and distributing it to unlimited audience devices via independent RTCPeerConnections; and (6) an Artist-Fan Direct Marketplace with ISRC-tagged play logging, automated 85%/15% royalty splits, monthly payout calculation, and PRO-compliant CSV cue sheet export.

---

*© 2026 OmniDLOS Holdings. All Rights Reserved.*
*Owner: Jeffrey W. Williams / Jeffrey W. Williams LLC*
*Entity: OmniDLOS Holdings*
*CONFIDENTIAL — Owner Eyes Only*
