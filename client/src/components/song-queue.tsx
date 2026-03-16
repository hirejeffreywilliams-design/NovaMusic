import { useState, useRef, useCallback } from "react";
import { Music, Upload, Trash2, Play, ChevronUp, ChevronDown, FolderOpen, ListMusic } from "lucide-react";

export interface QueuedSong {
  id: string;
  file: File;
  name: string;
  duration?: number;
}

interface SongQueueProps {
  deckLabel: string;
  deckColor: string;
  currentIndex: number;
  queue: QueuedSong[];
  isPlaying: boolean;
  onLoadSong: (song: QueuedSong, index: number) => void;
  onAddFiles: (files: FileList) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}

export function SongQueue({
  deckLabel,
  deckColor,
  currentIndex,
  queue,
  isPlaying,
  onLoadSong,
  onAddFiles,
  onRemove,
  onReorder,
}: SongQueueProps) {
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onAddFiles(e.target.files);
        e.target.value = "";
      }
    },
    [onAddFiles]
  );

  const formatName = (name: string) =>
    name.replace(/\.[^.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");

  return (
    <div className="glass-panel rounded-2xl overflow-hidden" style={{ borderColor: `${deckColor}20` }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        data-testid={`button-queue-toggle-${deckLabel}`}
      >
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4" style={{ color: deckColor }} />
          <span className="text-xs font-bold text-white/70">Playlist — Deck {deckLabel}</span>
          {queue.length > 0 && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: `${deckColor}25`, color: deckColor }}
            >
              {queue.length} songs
            </span>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 text-white/30 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all border hover:scale-[1.01]"
              style={{ color: deckColor, borderColor: `${deckColor}30`, background: `${deckColor}10` }}
              data-testid={`button-queue-add-files-${deckLabel}`}
            >
              <Upload className="w-3 h-3" />
              Add Songs
            </button>
            <button
              onClick={() => folderRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all border hover:scale-[1.01]"
              style={{ color: deckColor, borderColor: `${deckColor}30`, background: `${deckColor}08` }}
              data-testid={`button-queue-add-folder-${deckLabel}`}
            >
              <FolderOpen className="w-3 h-3" />
              Add Folder
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <input
            ref={folderRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFiles}
            className="hidden"
            {...({ webkitdirectory: "true" } as any)}
          />

          {queue.length === 0 ? (
            <div className="text-center py-6">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-[10px] text-white/25">
                Add songs or a music folder to build your playlist
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {queue.map((song, i) => (
                <div
                  key={song.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all ${
                    i === currentIndex
                      ? "border"
                      : "border border-transparent hover:bg-white/5"
                  }`}
                  style={
                    i === currentIndex
                      ? { background: `${deckColor}15`, borderColor: `${deckColor}35` }
                      : {}
                  }
                  data-testid={`queue-item-${deckLabel}-${i}`}
                >
                  <button
                    onClick={() => onLoadSong(song, i)}
                    className="shrink-0"
                    data-testid={`button-queue-play-${deckLabel}-${i}`}
                  >
                    {i === currentIndex ? (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: deckColor }}
                      >
                        <Play className="w-2.5 h-2.5 text-white ml-0.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10">
                        <span className="text-[8px] text-white/40">{i + 1}</span>
                      </div>
                    )}
                  </button>
                  <span className="flex-1 text-[10px] text-white/60 truncate">{formatName(song.name)}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => onReorder(i, i - 1)}
                      disabled={i === 0}
                      className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                      <ChevronUp className="w-2.5 h-2.5 text-white/40" />
                    </button>
                    <button
                      onClick={() => onReorder(i, i + 1)}
                      disabled={i === queue.length - 1}
                      className="p-0.5 rounded hover:bg-white/10 disabled:opacity-20 transition-all"
                    >
                      <ChevronDown className="w-2.5 h-2.5 text-white/40" />
                    </button>
                    <button
                      onClick={() => onRemove(i)}
                      className="p-0.5 rounded hover:bg-[#ff453a]/20 transition-all ml-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-white/20 hover:text-[#ff453a]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {queue.length > 1 && (
            <p className="text-[9px] text-white/20 text-center">
              Auto-advances to next song when current ends
            </p>
          )}
        </div>
      )}
    </div>
  );
}
