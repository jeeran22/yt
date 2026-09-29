// Client-side validation guardrails — block bad dispatches before they hit the API.
import type { ShotOverride } from "./types";

export interface ValidationIssue { field: string; message: string; }

export function validatePrompt(prompt: string): ValidationIssue | null {
  const t = String(prompt || "").trim();
  if (!t) return { field: "prompt", message: "Please enter a prompt first." };
  if (t.length > 10000) return { field: "prompt", message: "Prompt exceeds 10,000 characters." };
  return null;
}

export function validateMotion(motion: number): ValidationIssue | null {
  if (!Number.isInteger(motion) || motion < 1 || motion > 255)
    return { field: "motion_bucket_id", message: "Motion must be an integer 1-255." };
  return null;
}

export function validateCfg(cfg: number): ValidationIssue | null {
  if (typeof cfg !== "number" || Number.isNaN(cfg) || cfg < 0 || cfg > 10)
    return { field: "cfg_scale", message: "CFG scale must be 0-10." };
  return null;
}

export function validateClips(clips: unknown[]): ValidationIssue | null {
  if (!Array.isArray(clips) || clips.length < 2) return { field: "clips", message: "Add at least 2 clips (max 20)." };
  if (clips.length > 20) return { field: "clips", message: "No more than 20 clips allowed." };
  return null;
}

export function validateTransitionDuration(d: number): ValidationIssue | null {
  if (typeof d !== "number" || Number.isNaN(d) || d < 0.1 || d > 2)
    return { field: "transition_duration", message: "Duration must be 0.1-2.0s." };
  return null;
}

export function validateShots(shots: ShotOverride[], min = 2, max = 10): ValidationIssue | null {
  if (!Array.isArray(shots)) return { field: "shots", message: "Shots must be an array." };
  if (shots.length > max) return { field: "shots", message: `No more than ${max} shots allowed.` };
  if (shots.length > 0 && shots.length < min) return { field: "shots", message: `At least ${min} shots required for a sequence.` };
  return null;
}

export function validateProductName(name: string): ValidationIssue | null {
  if (!String(name || "").trim()) return { field: "product.name", message: "Product name is required." };
  return null;
}

export function validateTopic(topic: string): ValidationIssue | null {
  if (!String(topic || "").trim()) return { field: "topic", message: "Describe the video topic first." };
  return null;
}
