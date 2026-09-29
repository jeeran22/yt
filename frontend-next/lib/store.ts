import { create } from "zustand";
import type { StudioMode } from "./types";

interface StudioState {
  mode: StudioMode;
  setMode: (m: StudioMode) => void;
  toasts: { id: string; title: string; desc?: string; kind: "ok" | "err" | "info" }[];
  pushToast: (t: Omit<StudioState["toasts"][number], "id">) => void;
  dismissToast: (id: string) => void;
  backendOnline: boolean | null;
  setBackendOnline: (v: boolean) => void;
}

export const useStudio = create<StudioState>((set) => ({
  mode: "product",
  setMode: (mode) => set({ mode }),
  toasts: [],
  pushToast: (t) => {
    const id = `t-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  backendOnline: null,
  setBackendOnline: (backendOnline) => set({ backendOnline }),
}));
