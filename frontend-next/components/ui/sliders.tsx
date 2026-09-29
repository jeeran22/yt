"use client";
import { cn, motionHint, cfgHint } from "@/lib/utils";

export function MotionSlider({ label, value, onChange, accent = "#06B6D4" }: {
  label: string; value: number; onChange: (v: number) => void; accent?: string;
}) {
  const pct = ((value - 1) / (255 - 1)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
        <span className="rounded-full border border-slate-600/70 bg-slate-900 px-2.5 py-0.5 font-mono text-[12px] font-bold text-white">{value}</span>
      </div>
      <input
        type="range" min={1} max={255} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range w-full"
        style={{ ["--pct" as string]: `${pct}%`, ["--fill" as string]: accent }}
        aria-label={label}
      />
      <p className="mt-1 text-[12px] leading-snug text-slate-500">{motionHint(value)}</p>
    </div>
  );
}

export function CfgSlider({ label, value, onChange, accent = "#06B6D4" }: {
  label: string; value: number; onChange: (v: number) => void; accent?: string;
}) {
  const pct = (value / 10) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
        <span className="rounded-full border border-slate-600/70 bg-slate-900 px-2.5 py-0.5 font-mono text-[12px] font-bold text-white">{Number(value).toFixed(1)}</span>
      </div>
      <input
        type="range" min={0} max={10} step={0.1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range w-full"
        style={{ ["--pct" as string]: `${pct}%`, ["--fill" as string]: accent }}
        aria-label={label}
      />
      <p className="mt-1 text-[12px] leading-snug text-slate-500">{cfgHint(value)}</p>
    </div>
  );
}

export function ProgressMeter({ value, max, accent = "#06B6D4", label }: { value: number; max: number; accent?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {label ? <div className="mb-1.5 text-[12.5px] font-semibold text-slate-300">{label}</div> : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 12px ${accent}` }} />
      </div>
      <div className={cn("mt-1 font-mono text-[11.5px] text-slate-500")}>{value}/{max} · {pct.toFixed(0)}%</div>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const color =
    s === "completed" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : s === "failed" ? "border-red-500/40 bg-red-500/10 text-red-300"
    : s === "processing" ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 animate-pulseSoft"
    : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wider", color)}>{status}</span>;
}
