"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Wifi, WifiOff } from "lucide-react";
import api from "@/lib/api";
import { useStudio } from "@/lib/store";
import StudioWorkspace from "@/components/studio/StudioWorkspace";
import { usePresets } from "@/hooks/usePresets";

function Header() {
  const backendOnline = useStudio((s) => s.backendOnline);
  const setBackendOnline = useStudio((s) => s.setBackendOnline);
  const toasts = useStudio((s) => s.toasts);
  const dismissToast = useStudio((s) => s.dismissToast);
  const health = useQuery({ queryKey: ["health"], queryFn: api.getHealth, retry: 1, refetchInterval: 30_000 });

  useEffect(() => {
    if (health.data) setBackendOnline(true);
    else if (health.error) setBackendOnline(false);
  }, [health.data, health.error, setBackendOnline]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-graphite-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 font-black text-slate-950">✦</span>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-white">Stability Studio</p>
          <p className="text-[11.5px] text-slate-500">Campaign Orchestrator · SD3 Turbo + SVD</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold ${backendOnline === false ? "border-red-500/40 bg-red-500/10 text-red-300" : backendOnline ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400"}`}>
            {backendOnline === false ? <WifiOff size={13} /> : <Wifi size={13} />}
            {backendOnline === false ? "Backend offline (:1000)" : backendOnline ? `${health.data?.model || "Backend online"}` : "Connecting…"}
          </span>
        </div>
      </div>
      <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-[340px] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto animate-rise rounded-xl border px-4 py-3 text-[13px] shadow-card backdrop-blur ${t.kind === "err" ? "border-red-500/50 bg-red-950/90 text-red-100" : t.kind === "ok" ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-100" : "border-slate-600 bg-slate-900/95 text-slate-100"}`}>
            <div className="flex items-start justify-between gap-2">
              <strong>{t.title}</strong>
              <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {t.desc ? <p className="mt-0.5 text-[12px] opacity-80">{t.desc}</p> : null}
          </div>
        ))}
      </div>
    </header>
  );
}

export default function Home() {
  const { campaignsLoading } = usePresets();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-white">
              <Clapperboard size={20} className="text-cyan-300" /> Universal Campaign Orchestrator
            </h1>
            <p className="mt-1 max-w-[640px] text-[13px] text-slate-400">
              Split-screen composer: configure on the left, watch the async render pipeline on the right.
              {campaignsLoading ? " Loading live presets…" : " Presets synced from GET /campaigns."}
            </p>
          </div>
          <div className="flex gap-2 font-mono text-[11px] text-slate-500">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/8 px-2.5 py-1 text-cyan-300">● product: cyan</span>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/8 px-2.5 py-1 text-violet-300">● youtube: violet</span>
          </div>
        </div>
        <StudioWorkspace />
        <footer className="mt-8 border-t border-slate-800/70 pt-4 text-center text-[11.5px] text-slate-600">
          Stability Studio Next · polls /campaigns/jobs/:id + /generate-video/result/:id every 2.5s · validates 2–20 stitch clips, 2–10 shots, motion 1–255, CFG 0–10
        </footer>
      </main>
    </div>
  );
}
