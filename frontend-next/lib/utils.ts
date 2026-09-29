import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function slug(s: string, fallback = "clip"): string {
  const v = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return v || fallback;
}

export function timeAgo(ts?: number): string {
  if (!ts) return "";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** Runtime estimate for a stitched sequence (backend assumes ~2s clips). */
export function estimateRuntime(shots: number, transition: string, duration: number): number {
  if (shots <= 0) return 0;
  if (transition === "cut") return shots * 2;
  return Math.max(0, shots * 2 - (shots - 1) * duration);
}

export function motionHint(v: number): string {
  if (v <= 40) return "Low — stable, photographic, minimal drift";
  if (v <= 90) return "Soft — gentle product rotation / slow camera drift";
  if (v <= 150) return "Balanced — lively but controlled motion";
  if (v <= 210) return "Dynamic — bold sweeps, UI orbiting, particles";
  return "Extreme — chaotic / experimental, may warp";
}

export function cfgHint(v: number): string {
  if (v <= 1) return "Loose — more creative freedom, softer likeness";
  if (v <= 2.5) return "Sweet spot — faithful yet fluid motion";
  if (v <= 5) return "Strict — tight prompt adherence";
  return "Very strict — can freeze motion, use carefully";
}
