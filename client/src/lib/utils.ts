import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStableDjId(): string {
  const stored = localStorage.getItem("dj_hybrid_dj_id");
  if (stored) return stored;
  const newId = `dj-${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem("dj_hybrid_dj_id", newId);
  return newId;
}
