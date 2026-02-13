import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface EQKnobProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color?: string;
  min?: number;
  max?: number;
  className?: string;
}

export function EQKnob({ value, onChange, label, color, min = -1, max = 1, className }: EQKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startValueRef.current = value;

    const handleMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = (startYRef.current - ev.clientY) / 100;
      const newVal = Math.max(min, Math.min(max, startValueRef.current + delta * (max - min)));
      onChange(Math.round(newVal * 100) / 100);
    };

    const handleUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [value, onChange, min, max]);

  const handleDoubleClick = useCallback(() => {
    onChange(0);
  }, [onChange]);

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  const displayVal = Math.round(value * 100);

  return (
    <div className={cn("flex flex-col items-center gap-1 select-none", className)} data-testid={`knob-${label.toLowerCase()}`}>
      <div
        ref={knobRef}
        className="relative w-10 h-10 rounded-full bg-muted border border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: `conic-gradient(from ${rotation - 10}deg, ${color || "hsl(var(--primary))"} 0deg, transparent 20deg)`,
          }}
        />
        <div className="absolute inset-1.5 rounded-full bg-card flex items-center justify-center">
          <div
            className="w-0.5 h-3 rounded-full origin-bottom"
            style={{
              transform: `rotate(${rotation}deg)`,
              backgroundColor: color || "hsl(var(--primary))",
            }}
          />
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-mono text-muted-foreground">
        {displayVal > 0 ? "+" : ""}{displayVal}%
      </span>
    </div>
  );
}
