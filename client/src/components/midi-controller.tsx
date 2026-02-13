import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Plug, Unplug, Activity } from "lucide-react";
import type { DeckId } from "@/hooks/use-audio-engine";

interface MidiMapping {
  channel: number;
  cc: number;
  action: string;
  deck?: DeckId;
}

const DEFAULT_MAPPINGS: MidiMapping[] = [
  { channel: 0, cc: 1, action: "crossfade" },
  { channel: 0, cc: 7, action: "volume", deck: "A" },
  { channel: 0, cc: 8, action: "volume", deck: "B" },
  { channel: 0, cc: 14, action: "eq-low", deck: "A" },
  { channel: 0, cc: 15, action: "eq-mid", deck: "A" },
  { channel: 0, cc: 16, action: "eq-high", deck: "A" },
  { channel: 0, cc: 17, action: "eq-low", deck: "B" },
  { channel: 0, cc: 18, action: "eq-mid", deck: "B" },
  { channel: 0, cc: 19, action: "eq-high", deck: "B" },
  { channel: 0, cc: 20, action: "rate", deck: "A" },
  { channel: 0, cc: 21, action: "rate", deck: "B" },
];

interface MidiControllerProps {
  onCrossfade: (value: number) => void;
  onVolume: (deck: DeckId, value: number) => void;
  onEQ: (deck: DeckId, band: "low" | "mid" | "high", value: number) => void;
  onRate: (deck: DeckId, value: number) => void;
  onPlayPause: (deck: DeckId) => void;
  onCue: (deck: DeckId) => void;
}

export function MidiController({
  onCrossfade, onVolume, onEQ, onRate, onPlayPause, onCue,
}: MidiControllerProps) {
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const mappingsRef = useRef(DEFAULT_MAPPINGS);

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const channel = data[0] & 0x0f;
    const cc = data[1];
    const value = data[2];
    const normalized = value / 127;

    setActivityCount(prev => prev + 1);
    setLastMessage(`CH${channel} CC${cc}: ${value}`);

    if (status === 0xb0) {
      const mapping = mappingsRef.current.find(m => m.channel === channel && m.cc === cc);
      if (!mapping) return;

      switch (mapping.action) {
        case "crossfade":
          onCrossfade(normalized);
          break;
        case "volume":
          if (mapping.deck) onVolume(mapping.deck, normalized);
          break;
        case "eq-low":
          if (mapping.deck) onEQ(mapping.deck, "low", normalized * 2 - 1);
          break;
        case "eq-mid":
          if (mapping.deck) onEQ(mapping.deck, "mid", normalized * 2 - 1);
          break;
        case "eq-high":
          if (mapping.deck) onEQ(mapping.deck, "high", normalized * 2 - 1);
          break;
        case "rate":
          if (mapping.deck) onRate(mapping.deck, 0.5 + normalized);
          break;
      }
    }

    if (status === 0x90 && value > 0) {
      if (cc === 36) onPlayPause("A");
      if (cc === 37) onPlayPause("B");
      if (cc === 38) onCue("A");
      if (cc === 39) onCue("B");
    }
  }, [onCrossfade, onVolume, onEQ, onRate, onPlayPause, onCue]);

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setSupported(false);
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;

      const inputs = Array.from(access.inputs.values());
      if (inputs.length > 0) {
        const input = inputs[0];
        input.onmidimessage = handleMidiMessage as any;
        setDeviceName(input.name || "MIDI Device");
        setConnected(true);
      }

      access.onstatechange = () => {
        const currentInputs = Array.from(access.inputs.values());
        if (currentInputs.length === 0) {
          setConnected(false);
          setDeviceName(null);
        } else if (!connected) {
          const input = currentInputs[0];
          input.onmidimessage = handleMidiMessage as any;
          setDeviceName(input.name || "MIDI Device");
          setConnected(true);
        }
      };
    } catch {
      setSupported(false);
    }
  }, [handleMidiMessage, connected]);

  const disconnectMidi = useCallback(() => {
    if (midiAccessRef.current) {
      const inputs = Array.from(midiAccessRef.current.inputs.values());
      inputs.forEach(input => { input.onmidimessage = null; });
    }
    setConnected(false);
    setDeviceName(null);
    setActivityCount(0);
  }, []);

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="midi-controller">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">MIDI</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connected && (
            <Badge variant="outline" className="text-xs">
              <Activity className="w-2.5 h-2.5 mr-1" />
              {activityCount}
            </Badge>
          )}
          {connected ? (
            <Badge variant="secondary" className="text-xs">
              <Plug className="w-2.5 h-2.5 mr-1" />
              {deviceName}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Disconnected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!supported && (
          <p className="text-xs text-muted-foreground">
            Web MIDI is not supported in this browser. Try Chrome or Edge.
          </p>
        )}

        {supported && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={connected ? "destructive" : "default"}
              onClick={connected ? disconnectMidi : connectMidi}
              data-testid="button-midi-connect"
            >
              {connected ? (
                <><Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect</>
              ) : (
                <><Plug className="w-3.5 h-3.5 mr-1" /> Connect MIDI</>
              )}
            </Button>
          </div>
        )}

        {connected && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Mappings</span>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground font-mono">
              <span>CC1: Crossfade</span>
              <span>CC7/8: Vol A/B</span>
              <span>CC14-16: EQ A</span>
              <span>CC17-19: EQ B</span>
              <span>CC20/21: Rate A/B</span>
              <span>Note 36/37: Play A/B</span>
              <span>Note 38/39: Cue A/B</span>
            </div>
            {lastMessage && (
              <div className="text-[10px] font-mono text-muted-foreground">
                Last: {lastMessage}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
