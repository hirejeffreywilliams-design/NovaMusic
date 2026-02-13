import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Check } from "lucide-react";
import type { DeckId } from "@/hooks/use-audio-engine";

export interface VisualTheme {
  id: string;
  name: string;
  deckColors: Record<DeckId, string>;
  accentHue: number;
  waveformStyle: "classic" | "frequency" | "gradient" | "neon";
  bgGlow: boolean;
  description: string;
}

const THEMES: VisualTheme[] = [
  {
    id: "neon-club",
    name: "Neon Club",
    deckColors: { A: "hsl(262, 83%, 58%)", B: "hsl(340, 75%, 55%)", C: "hsl(180, 70%, 50%)", D: "hsl(35, 90%, 55%)" },
    accentHue: 262,
    waveformStyle: "neon",
    bgGlow: true,
    description: "Vibrant neon colors with glowing effects",
  },
  {
    id: "minimal",
    name: "Minimal",
    deckColors: { A: "hsl(210, 15%, 55%)", B: "hsl(210, 15%, 45%)", C: "hsl(210, 15%, 65%)", D: "hsl(210, 15%, 35%)" },
    accentHue: 210,
    waveformStyle: "classic",
    bgGlow: false,
    description: "Clean and understated design",
  },
  {
    id: "retro-vinyl",
    name: "Retro Vinyl",
    deckColors: { A: "hsl(30, 80%, 50%)", B: "hsl(15, 75%, 45%)", C: "hsl(45, 85%, 55%)", D: "hsl(0, 70%, 40%)" },
    accentHue: 30,
    waveformStyle: "gradient",
    bgGlow: true,
    description: "Warm vintage tones inspired by vinyl records",
  },
  {
    id: "sunset",
    name: "Sunset",
    deckColors: { A: "hsl(340, 85%, 55%)", B: "hsl(25, 90%, 55%)", C: "hsl(280, 70%, 55%)", D: "hsl(50, 85%, 55%)" },
    accentHue: 340,
    waveformStyle: "gradient",
    bgGlow: true,
    description: "Warm sunset gradient vibes",
  },
  {
    id: "ice",
    name: "Ice",
    deckColors: { A: "hsl(195, 80%, 55%)", B: "hsl(210, 75%, 50%)", C: "hsl(175, 70%, 55%)", D: "hsl(230, 65%, 55%)" },
    accentHue: 195,
    waveformStyle: "neon",
    bgGlow: true,
    description: "Cool blue and cyan tones",
  },
  {
    id: "matrix",
    name: "Matrix",
    deckColors: { A: "hsl(120, 80%, 45%)", B: "hsl(140, 75%, 40%)", C: "hsl(100, 70%, 50%)", D: "hsl(160, 65%, 45%)" },
    accentHue: 120,
    waveformStyle: "neon",
    bgGlow: true,
    description: "Classic green terminal aesthetic",
  },
];

interface ThemeEngineContextValue {
  currentTheme: VisualTheme;
  setThemeById: (id: string) => void;
  themes: VisualTheme[];
}

const ThemeEngineContext = createContext<ThemeEngineContextValue>({
  currentTheme: THEMES[0],
  setThemeById: () => {},
  themes: THEMES,
});

export function useVisualTheme() {
  return useContext(ThemeEngineContext);
}

export function ThemeEngineProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<VisualTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dj-visual-theme");
      const found = THEMES.find(t => t.id === stored);
      return found || THEMES[0];
    }
    return THEMES[0];
  });

  const setThemeById = useCallback((id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem("dj-visual-theme", id);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dj-accent-hue", String(currentTheme.accentHue));
    root.style.setProperty("--dj-glow", currentTheme.bgGlow ? "1" : "0");
  }, [currentTheme]);

  return (
    <ThemeEngineContext.Provider value={{ currentTheme, setThemeById, themes: THEMES }}>
      {children}
    </ThemeEngineContext.Provider>
  );
}

export function ThemeSelector() {
  const { currentTheme, setThemeById, themes } = useVisualTheme();

  return (
    <Card className="bg-card/80 backdrop-blur-sm" data-testid="theme-selector">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Visual Theme</CardTitle>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          {currentTheme.name}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {themes.map((theme) => (
            <Button
              key={theme.id}
              variant="ghost"
              onClick={() => setThemeById(theme.id)}
              className={`relative flex flex-col items-start gap-1.5 p-3 h-auto rounded-md border text-left whitespace-normal ${
                currentTheme.id === theme.id
                  ? "border-primary bg-primary/5"
                  : "border-border/50"
              }`}
              data-testid={`button-theme-${theme.id}`}
            >
              <div className="flex items-center gap-1.5 w-full">
                <div className="flex gap-0.5">
                  {(["A", "B", "C", "D"] as DeckId[]).map((d) => (
                    <div
                      key={d}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.deckColors[d] }}
                    />
                  ))}
                </div>
                {currentTheme.id === theme.id && (
                  <Check className="w-3.5 h-3.5 text-primary ml-auto" />
                )}
              </div>
              <span className="text-xs font-medium">{theme.name}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {theme.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
