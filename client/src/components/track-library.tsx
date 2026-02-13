import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Library, Plus, Search, Clock, Music, Trash2, ListMusic,
} from "lucide-react";
import type { DeckId } from "@/hooks/use-audio-engine";

export interface TrackEntry {
  id: string;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number;
  file?: File;
  url?: string;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}

export interface SetHistoryEntry {
  id: string;
  trackName: string;
  deck: DeckId;
  startTime: number;
  bpm: number | null;
  key: string | null;
  transition: string;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface TrackLibraryProps {
  tracks: TrackEntry[];
  playlists: Playlist[];
  setHistory: SetHistoryEntry[];
  onAddTrack: (file: File) => void;
  onLoadTrackToDeck: (track: TrackEntry, deck: DeckId) => void;
  onRemoveTrack: (id: string) => void;
  onCreatePlaylist: (name: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
}

export function TrackLibrary({
  tracks, playlists, setHistory,
  onAddTrack, onLoadTrackToDeck, onRemoveTrack,
  onCreatePlaylist, onAddToPlaylist,
}: TrackLibraryProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"library" | "history">("library");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const filteredTracks = tracks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(onAddTrack);
    e.target.value = "";
  }, [onAddTrack]);

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="track-library">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Library</CardTitle>
          <Badge variant="secondary" className="text-xs font-mono">
            {tracks.length} tracks
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={tab === "library" ? "default" : "ghost"}
            onClick={() => setTab("library")}
            data-testid="button-tab-library"
          >
            <ListMusic className="w-3.5 h-3.5 mr-1" />
            Tracks
          </Button>
          <Button
            size="sm"
            variant={tab === "history" ? "default" : "ghost"}
            onClick={() => setTab("history")}
            data-testid="button-tab-history"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            History
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {tab === "library" && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tracks..."
                  className="pl-8 text-sm"
                  data-testid="input-search-tracks"
                />
              </div>
              <label>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={handleAddFiles}
                  data-testid="input-add-tracks"
                />
                <Button size="sm" variant="outline" asChild>
                  <span>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </span>
                </Button>
              </label>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredTracks.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4" data-testid="text-empty-library">
                  No tracks yet. Add audio files to build your library.
                </div>
              )}
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-2 p-2 rounded-md hover-elevate group"
                  data-testid={`track-item-${track.id}`}
                >
                  <Music className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{track.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{formatDuration(track.duration)}</span>
                      {track.bpm && <span>{Math.round(track.bpm)} BPM</span>}
                      {track.key && <span>{track.key}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 invisible group-hover:visible">
                    {(["A", "B", "C", "D"] as DeckId[]).map(d => (
                      <Button
                        key={d}
                        size="sm"
                        variant="ghost"
                        className="text-[10px] font-mono px-1.5"
                        onClick={() => onLoadTrackToDeck(track, d)}
                        data-testid={`button-load-to-${d}-${track.id}`}
                      >
                        {d}
                      </Button>
                    ))}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6"
                      onClick={() => onRemoveTrack(track.id)}
                      data-testid={`button-remove-track-${track.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {playlists.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Playlists</span>
                {playlists.map(pl => (
                  <div key={pl.id} className="flex items-center gap-2 text-xs">
                    <ListMusic className="w-3 h-3 text-muted-foreground" />
                    <span>{pl.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {pl.trackIds.length}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                className="text-xs flex-1"
                data-testid="input-new-playlist"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!newPlaylistName.trim()}
                onClick={() => {
                  onCreatePlaylist(newPlaylistName.trim());
                  setNewPlaylistName("");
                }}
                data-testid="button-create-playlist"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}

        {tab === "history" && (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {setHistory.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4" data-testid="text-empty-history">
                No tracks played yet. Your set history will appear here.
              </div>
            )}
            {[...setHistory].reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 p-2 rounded-md"
                data-testid={`history-item-${entry.id}`}
              >
                <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{entry.trackName}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Deck {entry.deck}</span>
                    <span>{formatTimestamp(entry.startTime)}</span>
                    {entry.bpm && <span>{Math.round(entry.bpm)} BPM</span>}
                    {entry.key && <span>{entry.key}</span>}
                    {entry.transition && <Badge variant="outline" className="text-[9px]">{entry.transition}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
