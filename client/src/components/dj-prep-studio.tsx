import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Folder, FolderOpen,
  Zap, Music2, Clock, Users, MapPin, Sparkles, Copy,
  CheckSquare, Square, Download, RefreshCw, Loader2,
  ChevronRight, Edit3, Star, Send, X, ArrowRight,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════ */
export interface PrepTrack {
  id: string;
  name: string;
  bpm?: number;
  key?: string;
  genre?: string;
  notes?: string;
  energy: number;
}

export interface PrepSetlist {
  id: string;
  name: string;
  venue?: string;
  eventType: string;
  crowdSize?: number;
  vibe: string;
  djNotes?: string;
  tracks: PrepTrack[];
  createdAt: number;
  updatedAt: number;
}

/* ══════════════════════════════════════════════════════════
   Default Genre Starter Crates
══════════════════════════════════════════════════════════ */
const STARTER_CRATES: Record<string, { label: string; color: string; tracks: Partial<PrepTrack>[] }> = {
  afrobeats: {
    label: "🌍 Afrobeats Essentials",
    color: "#ff9500",
    tracks: [
      { name: "Essence - Wizkid ft. Tems", bpm: 102, key: "A Minor", genre: "Afrobeats", energy: 72 },
      { name: "Last Last - Burna Boy", bpm: 111, key: "D Major", genre: "Afrobeats", energy: 78 },
      { name: "Calm Down - Rema ft. Selena Gomez", bpm: 106, key: "G Major", genre: "Afrobeats", energy: 74 },
      { name: "Rush - Ayra Starr", bpm: 109, key: "C Minor", genre: "Afrobeats", energy: 80 },
      { name: "Sungba - Asake", bpm: 113, key: "F Major", genre: "Afrobeats", energy: 82 },
    ],
  },
  amapiano: {
    label: "🪗 Amapiano Heat",
    color: "#ffd60a",
    tracks: [
      { name: "Phoyisa - Kabza De Small", bpm: 113, key: "C Major", genre: "Amapiano", energy: 79 },
      { name: "Ke Star - Focalistic ft. DJ Maphorisa", bpm: 112, key: "G Major", genre: "Amapiano", energy: 85 },
      { name: "Zikode - DJ Stokie", bpm: 112, key: "A Major", genre: "Amapiano", energy: 76 },
      { name: "Piano Hub - Sun-El Musician", bpm: 113, key: "E Minor", genre: "Amapiano", energy: 73 },
    ],
  },
  hiphop_bangers: {
    label: "🎤 Hip Hop Bangers",
    color: "#ff2d78",
    tracks: [
      { name: "Not Like Us - Kendrick Lamar", bpm: 100, key: "D Minor", genre: "Hip Hop", energy: 90 },
      { name: "FE!N - Travis Scott", bpm: 140, key: "F Major", genre: "Hip Hop", energy: 88 },
      { name: "Carnival - Kanye West & Ty Dolla $ign", bpm: 92, key: "G Minor", genre: "Hip Hop", energy: 82 },
      { name: "TGIF - GloRilla", bpm: 88, key: "C Major", genre: "Hip Hop", energy: 85 },
      { name: "Pretty Girls Walk - Big Boss Vette", bpm: 96, key: "A Minor", genre: "Hip Hop", energy: 83 },
    ],
  },
  pop_anthems: {
    label: "⭐ Pop Anthems",
    color: "#bf5af2",
    tracks: [
      { name: "Espresso - Sabrina Carpenter", bpm: 104, key: "C Major", genre: "Pop", energy: 76 },
      { name: "Birds of a Feather - Billie Eilish", bpm: 118, key: "G Major", genre: "Pop", energy: 71 },
      { name: "Good Luck, Babe! - Chappell Roan", bpm: 130, key: "E Minor", genre: "Pop", energy: 78 },
      { name: "Die With A Smile - Lady Gaga & Bruno Mars", bpm: 119, key: "C Major", genre: "Pop", energy: 74 },
      { name: "Shake It Off - Taylor Swift", bpm: 160, key: "G Major", genre: "Pop", energy: 88 },
    ],
  },
  edm_drops: {
    label: "⚡ EDM Drops",
    color: "#0af",
    tracks: [
      { name: "Desire - Fred Again ft. Four Tet", bpm: 138, key: "A Minor", genre: "EDM", energy: 88 },
      { name: "Rumble - Skrillex", bpm: 145, key: "F# Minor", genre: "EDM", energy: 92 },
      { name: "Losing It - Fisher", bpm: 128, key: "G Minor", genre: "EDM", energy: 90 },
      { name: "One More Time - Daft Punk", bpm: 122, key: "D Major", genre: "EDM", energy: 86 },
    ],
  },
  latin_fiesta: {
    label: "💃 Latin Fiesta",
    color: "#30d158",
    tracks: [
      { name: "Tití Me Preguntó - Bad Bunny", bpm: 99, key: "A# Major", genre: "Latin", energy: 82 },
      { name: "BAILE INoLVIDABLE - Peso Pluma", bpm: 86, key: "G Major", genre: "Latin", energy: 79 },
      { name: "Shakira: Bzrp Session #53", bpm: 98, key: "D Major", genre: "Latin", energy: 88 },
      { name: "Provenza - Karol G", bpm: 92, key: "C Major", genre: "Latin", energy: 80 },
    ],
  },
};

const EVENT_TYPES = ["club night", "wedding", "birthday party", "house party", "corporate event", "festival", "rooftop", "lounge", "school event", "open air"];
const VIBE_OPTIONS = ["🔥 Full Send Energy", "🌊 Progressive Build", "💃 Dance Floor All Night", "🌙 Smooth & Sensual", "🎉 Party Mix Everything", "❤️ Feel-Good Vibes", "🌍 Global Sounds Journey", "⚡ Peak Hour Specialists"];
const ENERGY_COLORS = (e: number) => e >= 85 ? "#ff453a" : e >= 70 ? "#ffd60a" : e >= 55 ? "#30d158" : "#818cf8";
const ENERGY_LABELS = (e: number) => e >= 85 ? "🔥" : e >= 70 ? "⚡" : e >= 55 ? "🌊" : "🌙";

const LS_KEY = "nova_prep_setlists";

function loadSetlists(): PrepSetlist[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch { return []; }
}

function saveSetlists(sets: PrepSetlist[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sets));
}

function makeId() { return Math.random().toString(36).slice(2, 10); }

function EnergyBar({ value }: { value: number }) {
  const color = ENERGY_COLORS(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: "width 0.3s ease" }} />
      </div>
      <span className="text-[8px] font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Track Row (editable)
══════════════════════════════════════════════════════════ */
function TrackRow({
  track, index, total,
  onMove, onDelete, onChange,
}: {
  track: PrepTrack; index: number; total: number;
  onMove: (dir: 1 | -1) => void;
  onDelete: () => void;
  onChange: (updates: Partial<PrepTrack>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
      data-testid={`prep-track-row-${index}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-[9px] font-black text-white/25 w-4 shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <input
            value={track.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Track name..."
            className="w-full bg-transparent text-[11px] text-white/80 placeholder-white/20 outline-none font-medium"
            data-testid={`input-track-name-${index}`}
          />
          <div className="flex items-center gap-2 mt-0.5">
            {track.bpm && <span className="text-[8px] text-white/28">{track.bpm} BPM</span>}
            {track.key && <span className="text-[8px] text-white/22">{track.key}</span>}
            {track.genre && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(191,90,242,0.12)", color: "rgba(191,90,242,0.8)" }}>{track.genre}</span>}
            <EnergyBar value={track.energy} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-white/8 transition-colors">
            <Edit3 className="w-3 h-3 text-white/25" />
          </button>
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 rounded-lg hover:bg-white/8 disabled:opacity-25 transition-colors">
            <ChevronUp className="w-3 h-3 text-white/40" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 rounded-lg hover:bg-white/8 disabled:opacity-25 transition-colors">
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>
          <button onClick={onDelete} className="p-1 rounded-lg hover:bg-[#ff453a]/20 transition-colors">
            <Trash2 className="w-3 h-3 text-white/25 hover:text-[#ff453a]" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-0 grid grid-cols-3 gap-2 border-t border-white/5">
          <div>
            <div className="text-[8px] text-white/25 mb-1 uppercase tracking-wider">BPM</div>
            <input type="number" value={track.bpm || ""} onChange={e => onChange({ bpm: parseInt(e.target.value) || undefined })}
              placeholder="120" className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none border border-white/8" />
          </div>
          <div>
            <div className="text-[8px] text-white/25 mb-1 uppercase tracking-wider">Key</div>
            <input value={track.key || ""} onChange={e => onChange({ key: e.target.value })}
              placeholder="C Major" className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none border border-white/8" />
          </div>
          <div>
            <div className="text-[8px] text-white/25 mb-1 uppercase tracking-wider">Energy</div>
            <input type="number" min="0" max="100" value={track.energy} onChange={e => onChange({ energy: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
              className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white/70 outline-none border border-white/8" />
          </div>
          <div className="col-span-3">
            <div className="text-[8px] text-white/25 mb-1 uppercase tracking-wider">Cue Notes</div>
            <input value={track.notes || ""} onChange={e => onChange({ notes: e.target.value })}
              placeholder="e.g. 'Start crossfade at 3:20, hit reverb on out...'"
              className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-[11px] text-white/50 outline-none border border-white/8" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Pre-Gig Checklist
══════════════════════════════════════════════════════════ */
const DEFAULT_CHECKLIST = [
  "DJ controller & cables tested",
  "Backup songs loaded offline",
  "Set order locked & saved",
  "Venue sound system checked",
  "Microphone working (for announcements)",
  "Crowd playlist loaded on standby",
  "Emergency songs ready (if sound cuts)",
  "Water bottle at the booth 💧",
  "DJ Jeff briefing done ✅",
];

function PreGigChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() =>
    DEFAULT_CHECKLIST.map(() => false)
  );
  const toggle = (i: number) => setChecked(prev => prev.map((v, j) => j === i ? !v : v));
  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === DEFAULT_CHECKLIST.length;
  return (
    <div className="space-y-2" data-testid="pre-gig-checklist">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/60 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>Pre-Gig Checklist</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-black" style={{ background: allDone ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.07)", color: allDone ? "#30d158" : "rgba(255,255,255,0.35)" }}>
            {doneCount}/{DEFAULT_CHECKLIST.length}
          </span>
        </div>
        <button onClick={() => setChecked(DEFAULT_CHECKLIST.map(() => false))}
          className="p-1 rounded-lg hover:bg-white/8 transition-colors" title="Reset all">
          <RefreshCw className="w-3 h-3 text-white/22" />
        </button>
      </div>
      {allDone && (
        <div className="py-2 px-3 rounded-xl text-center text-[11px] font-black text-[#30d158] animate-pulse"
          style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
          🚀 You're ready to perform! Let's get this crowd moving!
        </div>
      )}
      <div className="space-y-1">
        {DEFAULT_CHECKLIST.map((item, i) => (
          <button key={i} onClick={() => toggle(i)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all hover:bg-white/5"
            style={{ background: checked[i] ? "rgba(48,209,88,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${checked[i] ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.06)"}` }}
            data-testid={`checklist-item-${i}`}>
            {checked[i]
              ? <CheckSquare className="w-3.5 h-3.5 text-[#30d158] shrink-0" />
              : <Square className="w-3.5 h-3.5 text-white/20 shrink-0" />
            }
            <span className={`text-[11px] transition-all ${checked[i] ? "text-white/30 line-through" : "text-white/65"}`}>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI Jeff Briefing Panel
══════════════════════════════════════════════════════════ */
function JeffBriefing({ setlist }: { setlist: PrepSetlist }) {
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const getBriefing = useCallback(async () => {
    setLoading(true);
    setBriefing("");
    setDone(false);

    const trackSummary = setlist.tracks.slice(0, 20)
      .map((t, i) => `${i + 1}. "${t.name}"${t.bpm ? ` ${t.bpm}BPM` : ""}${t.genre ? ` (${t.genre})` : ""} — energy ${t.energy}%${t.notes ? ` [${t.notes}]` : ""}`)
      .join("\n");

    const question = `I have a gig coming up. Here are the details:
- Event: ${setlist.name}
- Venue: ${setlist.venue || "TBA"}
- Event type: ${setlist.eventType}
- Crowd size: ${setlist.crowdSize ? `~${setlist.crowdSize} people` : "Unknown"}
- Vibe: ${setlist.vibe}
- My notes: ${setlist.djNotes || "None"}

My planned setlist (${setlist.tracks.length} tracks):
${trackSummary}

Give me a pre-gig briefing as DJ Jeff. Cover: 1) What to expect from this crowd/event, 2) Your top 2-3 tips for nailing this specific setlist and vibe, 3) Best opening track from my list and why, 4) Any transition tips for key moments in the set. Be direct, practical, and energizing — I'm about to go on!`;

    try {
      const resp = await fetch("/api/ai-dj/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
        }),
      });
      const reader = resp.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "text") setBriefing(prev => prev + evt.data);
            if (evt.type === "done") setDone(true);
          } catch (_) {}
        }
      }
      setDone(true);
    } catch (e) {
      setBriefing("DJ Jeff couldn't connect. Check your internet and try again!");
    } finally {
      setLoading(false);
    }
  }, [setlist]);

  return (
    <div className="space-y-3" data-testid="jeff-briefing-panel">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78, #0af)", boxShadow: "0 0 15px rgba(191,90,242,0.4)" }}>
          DJ
        </div>
        <div>
          <div className="text-[11px] font-black text-white" style={{ fontFamily: "'Oxanium', sans-serif" }}>DJ Jeff Pre-Show Briefing</div>
          <div className="text-[9px] text-white/30">Personalized tips for your upcoming gig</div>
        </div>
      </div>

      {!briefing && !loading && (
        <div className="p-4 rounded-xl text-center space-y-3" style={{ background: "rgba(191,90,242,0.05)", border: "1px solid rgba(191,90,242,0.15)" }}>
          <div className="text-[10px] text-white/40 leading-relaxed">
            Jeff will analyze your setlist, event type, and crowd to give you a personalized pre-show pep talk and tactical tips.
          </div>
          <button onClick={getBriefing} disabled={setlist.tracks.length === 0}
            className="px-4 py-2.5 rounded-xl text-[11px] font-black text-white transition-all hover:scale-[1.02] disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78)", boxShadow: "0 0 20px rgba(191,90,242,0.3)" }}
            data-testid="button-get-jeff-briefing">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Get Pre-Show Briefing
            </span>
          </button>
          {setlist.tracks.length === 0 && <p className="text-[9px] text-white/25">Add tracks to your setlist first</p>}
        </div>
      )}

      {loading && !briefing && (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-4 h-4 text-[#bf5af2] animate-spin" />
          <span className="text-[11px] text-white/40">Jeff is studying your setlist...</span>
        </div>
      )}

      {briefing && (
        <div className="space-y-2">
          <div className="p-3 rounded-xl min-h-[80px]" style={{ background: "rgba(191,90,242,0.06)", border: "1px solid rgba(191,90,242,0.15)" }}>
            <p className="text-[11px] text-white/70 leading-relaxed whitespace-pre-line">
              {briefing}
              {loading && <span className="inline-block w-1.5 h-3.5 ml-0.5 rounded-sm align-text-bottom animate-pulse" style={{ background: "#e879f9" }} />}
            </p>
          </div>
          {done && (
            <div className="flex gap-2">
              <button onClick={getBriefing}
                className="flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.08)" }}>
                Refresh Briefing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Starter Crate Picker
══════════════════════════════════════════════════════════ */
function StarterCratePicker({ onAddTrack, onAddAllTracks }: { onAddTrack: (t: PrepTrack) => void; onAddAllTracks: (tracks: PrepTrack[]) => void }) {
  const [open, setOpen] = useState(false);
  const [selectedCrate, setSelectedCrate] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all hover:bg-white/5"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
        data-testid="button-open-crate-picker">
        <div className="flex items-center gap-2">
          <Folder className="w-3.5 h-3.5 text-[#ffd60a]" />
          <span className="text-[11px] font-bold text-white/60">Genre Crates — Quick Add</span>
        </div>
        <ChevronRight className={`w-3 h-3 text-white/25 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2 pl-1">
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(STARTER_CRATES).map(([key, crate]) => (
              <button key={key}
                onClick={() => setSelectedCrate(selectedCrate === key ? null : key)}
                className="text-left px-2.5 py-2 rounded-xl text-[10px] font-bold transition-all border"
                style={{
                  background: selectedCrate === key ? `${crate.color}18` : "rgba(255,255,255,0.03)",
                  borderColor: selectedCrate === key ? `${crate.color}35` : "rgba(255,255,255,0.07)",
                  color: selectedCrate === key ? crate.color : "rgba(255,255,255,0.45)",
                }}
                data-testid={`button-crate-${key}`}>
                {crate.label}
              </button>
            ))}
          </div>

          {selectedCrate && (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${STARTER_CRATES[selectedCrate].color}25`, background: "rgba(255,255,255,0.02)" }}>
              <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[10px] font-black" style={{ color: STARTER_CRATES[selectedCrate].color }}>{STARTER_CRATES[selectedCrate].label}</span>
                <button onClick={() => {
                  const allTracks = STARTER_CRATES[selectedCrate].tracks.map(t => ({
                    id: makeId(), name: t.name || "Unknown", bpm: t.bpm, key: t.key, genre: t.genre, energy: t.energy ?? 70,
                  }));
                  onAddAllTracks(allTracks);
                }}
                  className="text-[9px] font-black px-2 py-1 rounded-lg transition-colors"
                  style={{ background: `${STARTER_CRATES[selectedCrate].color}22`, color: STARTER_CRATES[selectedCrate].color }}
                  data-testid={`button-add-all-crate-${selectedCrate}`}>
                  + Add All
                </button>
              </div>
              {STARTER_CRATES[selectedCrate].tracks.map((t, i) => (
                <button key={i} onClick={() => onAddTrack({ id: makeId(), name: t.name || "Unknown", bpm: t.bpm, key: t.key, genre: t.genre, energy: t.energy ?? 70 })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-t border-white/4"
                  data-testid={`button-add-crate-track-${i}`}>
                  <Plus className="w-3 h-3 text-white/25 shrink-0" />
                  <span className="text-[10px] text-white/60 flex-1 truncate">{t.name}</span>
                  {t.bpm && <span className="text-[8px] text-white/22 shrink-0">{t.bpm}</span>}
                  <EnergyBar value={t.energy ?? 70} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Setlist Export
══════════════════════════════════════════════════════════ */
function exportSetlist(s: PrepSetlist): string {
  const lines = [
    `═══════════════════════════════════`,
    `NOVA MUSIC — DJ PREP SETLIST`,
    `═══════════════════════════════════`,
    `GIG: ${s.name}`,
    `Venue: ${s.venue || "TBA"}`,
    `Event: ${s.eventType}`,
    `Crowd: ${s.crowdSize ? `~${s.crowdSize}` : "?"}`,
    `Vibe: ${s.vibe}`,
    `Notes: ${s.djNotes || "—"}`,
    `═══════════════════════════════════`,
    `SETLIST (${s.tracks.length} tracks)`,
    `───────────────────────────────────`,
    ...s.tracks.map((t, i) =>
      `${(i + 1).toString().padStart(2, " ")}. ${t.name}${t.bpm ? ` | ${t.bpm} BPM` : ""}${t.key ? ` | ${t.key}` : ""}${t.genre ? ` | ${t.genre}` : ""} | Energy: ${t.energy}%${t.notes ? `\n     → ${t.notes}` : ""}`
    ),
    `───────────────────────────────────`,
    `Prepared with NOVA MUSIC · DJ Jeff AI`,
    `Created: ${new Date(s.createdAt).toLocaleString()}`,
  ];
  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════
   Main DJPrepStudio Component
══════════════════════════════════════════════════════════ */
export function DJPrepStudio() {
  const [setlists, setSetlists] = useState<PrepSetlist[]>(loadSetlists);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"setlist" | "checklist" | "briefing">("setlist");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) newNameRef.current?.focus(); }, [creating]);

  const active = setlists.find(s => s.id === activeId) || null;

  const persist = useCallback((updated: PrepSetlist[]) => {
    setSetlists(updated);
    saveSetlists(updated);
  }, []);

  const createSetlist = useCallback(() => {
    if (!newName.trim()) return;
    const s: PrepSetlist = {
      id: makeId(),
      name: newName.trim(),
      eventType: "club night",
      vibe: "🔥 Full Send Energy",
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [s, ...setlists];
    persist(updated);
    setActiveId(s.id);
    setNewName("");
    setCreating(false);
  }, [newName, setlists, persist]);

  const updateActive = useCallback((updates: Partial<PrepSetlist>) => {
    if (!activeId) return;
    const updated = setlists.map(s => s.id === activeId ? { ...s, ...updates, updatedAt: Date.now() } : s);
    persist(updated);
  }, [activeId, setlists, persist]);

  const deleteSetlist = useCallback((id: string) => {
    const updated = setlists.filter(s => s.id !== id);
    persist(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
  }, [setlists, persist, activeId]);

  const addTrack = useCallback((track?: Partial<PrepTrack>) => {
    if (!active) return;
    const t: PrepTrack = {
      id: makeId(),
      name: track?.name || "",
      bpm: track?.bpm,
      key: track?.key,
      genre: track?.genre,
      notes: track?.notes,
      energy: track?.energy ?? 70,
    };
    updateActive({ tracks: [...active.tracks, t] });
  }, [active, updateActive]);

  const addAllTracks = useCallback((tracks: PrepTrack[]) => {
    if (!active) return;
    updateActive({ tracks: [...active.tracks, ...tracks] });
  }, [active, updateActive]);

  const updateTrack = useCallback((idx: number, updates: Partial<PrepTrack>) => {
    if (!active) return;
    const tracks = active.tracks.map((t, i) => i === idx ? { ...t, ...updates } : t);
    updateActive({ tracks });
  }, [active, updateActive]);

  const deleteTrack = useCallback((idx: number) => {
    if (!active) return;
    updateActive({ tracks: active.tracks.filter((_, i) => i !== idx) });
  }, [active, updateActive]);

  const moveTrack = useCallback((idx: number, dir: 1 | -1) => {
    if (!active) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= active.tracks.length) return;
    const tracks = [...active.tracks];
    [tracks[idx], tracks[newIdx]] = [tracks[newIdx], tracks[idx]];
    updateActive({ tracks });
  }, [active, updateActive]);

  const copyExport = useCallback(() => {
    if (!active) return;
    const text = exportSetlist(active);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [active]);

  const avgBpm = active?.tracks.filter(t => t.bpm).length
    ? Math.round(active.tracks.filter(t => t.bpm).reduce((s, t) => s + (t.bpm || 0), 0) / active.tracks.filter(t => t.bpm).length)
    : null;
  const avgEnergy = active?.tracks.length
    ? Math.round(active.tracks.reduce((s, t) => s + t.energy, 0) / active.tracks.length)
    : null;

  return (
    <div className="flex gap-3 h-full">
      {/* ── Left: Saved Setlists Sidebar ── */}
      <div className="w-52 shrink-0 flex flex-col gap-2" data-testid="prep-setlists-sidebar">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif" }}>My Setlists</span>
          <button onClick={() => { setCreating(true); setNewName(""); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(191,90,242,0.2)", border: "1px solid rgba(191,90,242,0.3)" }}
            data-testid="button-new-setlist">
            <Plus className="w-3.5 h-3.5 text-[#e879f9]" />
          </button>
        </div>

        {creating && (
          <div className="flex gap-1">
            <input ref={newNameRef} value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createSetlist(); if (e.key === "Escape") setCreating(false); }}
              placeholder="Setlist name..."
              className="flex-1 px-2 py-1.5 rounded-lg text-[11px] text-white/80 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(191,90,242,0.4)" }}
              data-testid="input-new-setlist-name"
            />
            <button onClick={createSetlist} disabled={!newName.trim()}
              className="px-2 py-1.5 rounded-lg text-[10px] font-black text-white transition-all disabled:opacity-30"
              style={{ background: "rgba(191,90,242,0.4)" }}
              data-testid="button-confirm-new-setlist">
              <Save className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }}>
          {setlists.length === 0 && !creating && (
            <div className="py-6 text-center">
              <p className="text-[10px] text-white/25 leading-relaxed">No setlists yet. Hit <span className="text-[#e879f9]">+</span> to create your first gig prep!</p>
            </div>
          )}
          {setlists.map(s => (
            <div key={s.id} className="group relative">
              <button onClick={() => { setActiveId(s.id); setPanel("setlist"); }}
                className="w-full flex items-start gap-2 px-2.5 py-2.5 rounded-xl text-left transition-all"
                style={{
                  background: activeId === s.id ? "rgba(191,90,242,0.15)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${activeId === s.id ? "rgba(191,90,242,0.3)" : "rgba(255,255,255,0.07)"}`,
                }}
                data-testid={`button-setlist-${s.id}`}>
                <FolderOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: activeId === s.id ? "#e879f9" : "rgba(255,255,255,0.25)" }} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${activeId === s.id ? "text-white" : "text-white/55"}`}>{s.name}</div>
                  <div className="text-[8px] text-white/25 mt-0.5">{s.tracks.length} tracks · {s.eventType}</div>
                </div>
              </button>
              <button onClick={() => deleteSetlist(s.id)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ff453a]/20"
                data-testid={`button-delete-setlist-${s.id}`}>
                <Trash2 className="w-2.5 h-2.5 text-white/25 hover:text-[#ff453a]" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      {!active ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(191,90,242,0.1)", border: "1px solid rgba(191,90,242,0.2)" }}>
            <Music2 className="w-8 h-8 text-[#e879f9]/40" />
          </div>
          <div>
            <p className="text-sm font-black text-white/30" style={{ fontFamily: "'Oxanium', sans-serif" }}>SELECT OR CREATE A SETLIST</p>
            <p className="text-[11px] text-white/18 mt-1">Plan your gig, build your setlist, get briefed by DJ Jeff</p>
          </div>
          <button onClick={() => { setCreating(true); setNewName(""); }}
            className="px-4 py-2 rounded-xl text-[11px] font-black text-white transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #bf5af2, #ff2d78)", boxShadow: "0 0 20px rgba(191,90,242,0.3)" }}
            data-testid="button-create-first-setlist">
            + Create First Setlist
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* ── Active Setlist Header ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white truncate" style={{ fontFamily: "'Oxanium', sans-serif" }}>{active.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {avgBpm && <span className="text-[9px] text-white/35">{avgBpm} avg BPM</span>}
                {avgEnergy !== null && <span className="text-[9px]" style={{ color: ENERGY_COLORS(avgEnergy) }}>{ENERGY_LABELS(avgEnergy)} {avgEnergy}% avg energy</span>}
                <span className="text-[9px] text-white/28">{active.tracks.length} tracks</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={copyExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                style={{ background: copied ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.05)", borderColor: copied ? "rgba(48,209,88,0.3)" : "rgba(255,255,255,0.08)", color: copied ? "#30d158" : "rgba(255,255,255,0.4)" }}
                data-testid="button-export-setlist">
                {copied ? <><CheckSquare className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Export</>}
              </button>
            </div>
          </div>

          {/* ── Panel Tabs ── */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
            {([
              { id: "setlist" as const, label: "📋 Set Builder", testId: "tab-setlist" },
              { id: "checklist" as const, label: "✅ Checklist", testId: "tab-checklist" },
              { id: "briefing" as const, label: "🤖 Jeff Brief", testId: "tab-briefing" },
            ]).map(tab => (
              <button key={tab.id} onClick={() => setPanel(tab.id)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all"
                style={panel === tab.id
                  ? { background: "rgba(191,90,242,0.2)", color: "#e879f9", border: "1px solid rgba(191,90,242,0.3)" }
                  : { background: "transparent", color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
                data-testid={tab.testId}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Panel Content ── */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(191,90,242,0.3) transparent" }}>

            {panel === "setlist" && (
              <>
                {/* Gig Info */}
                <div className="p-3 rounded-2xl space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[9px] font-black text-white/35 uppercase tracking-wider">Gig Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Venue</label>
                      <input value={active.venue || ""} onChange={e => updateActive({ venue: e.target.value })}
                        placeholder="e.g. Club Nova, House Party..."
                        className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-[11px] text-white/70 outline-none border border-white/8"
                        data-testid="input-gig-venue" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Event Type</label>
                      <select value={active.eventType} onChange={e => updateActive({ eventType: e.target.value })}
                        className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-[11px] text-white/70 outline-none border border-white/8"
                        style={{ background: "#0f0a1f" }}
                        data-testid="select-event-type">
                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Est. Crowd Size</label>
                      <input type="number" value={active.crowdSize || ""} onChange={e => updateActive({ crowdSize: parseInt(e.target.value) || undefined })}
                        placeholder="e.g. 200"
                        className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-[11px] text-white/70 outline-none border border-white/8"
                        data-testid="input-crowd-size" />
                    </div>
                    <div>
                      <label className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">Set Vibe</label>
                      <select value={active.vibe} onChange={e => updateActive({ vibe: e.target.value })}
                        className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-[11px] text-white/70 outline-none border border-white/8"
                        style={{ background: "#0f0a1f" }}
                        data-testid="select-vibe">
                        {VIBE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] text-white/25 uppercase tracking-wider block mb-1">DJ Notes</label>
                    <textarea value={active.djNotes || ""} onChange={e => updateActive({ djNotes: e.target.value })}
                      placeholder="Anything important: 'Client wants no EDM', 'Father-daughter dance at 9pm', 'End by midnight'..."
                      rows={2}
                      className="w-full bg-white/5 rounded-lg px-2.5 py-2 text-[11px] text-white/60 outline-none border border-white/8 resize-none leading-relaxed"
                      data-testid="textarea-dj-notes" />
                  </div>
                </div>

                {/* Starter Crates */}
                <StarterCratePicker onAddTrack={addTrack} onAddAllTracks={addAllTracks} />

                {/* Setlist Tracks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-white/35 uppercase tracking-wider">Setlist Tracks ({active.tracks.length})</span>
                    <button onClick={() => addTrack()}
                      className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                      style={{ background: "rgba(191,90,242,0.12)", color: "#e879f9", border: "1px solid rgba(191,90,242,0.2)" }}
                      data-testid="button-add-track-manual">
                      <Plus className="w-3 h-3" />
                      Add Track
                    </button>
                  </div>

                  {active.tracks.length === 0 ? (
                    <div className="py-8 text-center rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                      <Music2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-[10px] text-white/25">No tracks yet. Add them manually or pick from a genre crate above.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {active.tracks.map((track, i) => (
                        <TrackRow key={track.id} track={track} index={i} total={active.tracks.length}
                          onMove={dir => moveTrack(i, dir)}
                          onDelete={() => deleteTrack(i)}
                          onChange={updates => updateTrack(i, updates)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Energy Arc Visualization */}
                {active.tracks.length > 1 && (
                  <div className="p-3 rounded-xl space-y-2" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                    data-testid="prep-energy-arc">
                    <div className="text-[9px] font-black text-white/35 uppercase tracking-wider">Set Energy Arc</div>
                    <div className="flex items-end gap-1 h-12">
                      {active.tracks.map((t, i) => {
                        const color = ENERGY_COLORS(t.energy);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={t.name}>
                            <div className="w-full rounded-sm transition-all"
                              style={{ height: `${Math.max(8, t.energy)}%`, background: color, opacity: 0.8 }} />
                            <span className="text-[6px] text-white/15">{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[8px] text-white/20">
                      <span>↑ Energy</span>
                      <span>Set progression →</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {panel === "checklist" && (
              <PreGigChecklist />
            )}

            {panel === "briefing" && (
              <JeffBriefing setlist={active} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
