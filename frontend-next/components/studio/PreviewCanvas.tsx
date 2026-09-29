"use client";
import { useState } from "react";
import { Download, FileText, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { useCampaignJob, useVideoResult } from "@/hooks/useJobPolling";
import { ProgressMeter, StatusChip } from "@/components/ui/sliders";
import { Card, CardTitle, CardSub } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { downloadDataUrl } from "@/lib/media";
import { slug } from "@/lib/utils";
import { cn } from "@/lib/utils";

function BriefPane({ brief, prompt, seed }: { brief: unknown; prompt?: string; seed?: string | number }) {
  const b = (brief && typeof brief === "object" ? brief : {}) as Record<string, unknown>;
  const rows: [string, string][] = [];
  const pick = (k: string) => (b[k] !== undefined && b[k] !== null ? String(b[k]) : "");
  if (prompt || pick("prompt")) rows.push(["Prompt", String(prompt || pick("prompt"))]);
  if (seed !== undefined || b.seed !== undefined) rows.push(["Seed", String(seed ?? b.seed)]);
  if (b.motion_bucket_id !== undefined) rows.push(["Motion", String(b.motion_bucket_id)]);
  if (b.cfg_scale !== undefined) rows.push(["CFG", String(b.cfg_scale)]);
  const notes = b.notes ?? (b as any).designNotes ?? (b as any).tuningNotes;
  if (notes) rows.push(["Notes", Array.isArray(notes) ? notes.join(" | ") : String(notes)]);
  for (const [k, v] of Object.entries(b)) {
    if (["prompt", "seed", "notes", "designNotes", "tuningNotes", "motion_bucket_id", "cfg_scale"].includes(k)) continue;
    if (v === null || v === undefined) continue;
    rows.push([k, typeof v === "object" ? JSON.stringify(v, null, 1).slice(0, 600) : String(v).slice(0, 600)]);
  }
  if (!rows.length) return <p className="text-[12.5px] text-slate-500">No brief metadata returned.</p>;
  return (
    <dl className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[110px_1fr] gap-2 rounded-lg bg-slate-950/60 px-3 py-2">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k}</dt>
          <dd className="clamp-3 whitespace-pre-wrap break-words text-[12.5px] text-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function PreviewCanvas({ jobId, videoId, directVideo, briefOverride, accent = "#06B6D4", title = "Live Preview" }: {
  jobId?: string | null; videoId?: string | null;
  directVideo?: { videoUrl: string; prompt?: string; seed?: string | number; creativeBrief?: unknown } | null;
  briefOverride?: unknown; accent?: string; title?: string;
}) {
  const [briefOpen, setBriefOpen] = useState(false);
  const job = useCampaignJob(jobId ?? null);
  const vid = useVideoResult(!jobId ? (videoId ?? null) : null);
  const jobData = (job.data as any) || null;
  const vidData = (vid.data as any) || null;
  const polling = jobId ? job.isFetching || job.isLoading : videoId ? vid.isFetching || vid.isLoading : false;
  const jobError = (job.error as any) || null;
  const vidError = (vid.error as any) || null;
  const doneVideo: string | undefined = directVideo?.videoUrl || jobData?.result?.videoUrl || jobData?.videoUrl || vidData?.videoUrl;
  const brief: unknown = briefOverride ?? directVideo?.creativeBrief ?? jobData?.result?.creativeBrief ?? jobData?.creativeBrief;
  const prompt: string | undefined = directVideo?.prompt || jobData?.result?.prompt || jobData?.prompt || vidData?.prompt;
  const seed = directVideo?.seed ?? jobData?.result?.seed ?? jobData?.seed ?? vidData?.seed;
  const shotsDone = Number(jobData?.shotsDone ?? 0);
  const shotsTotal = Number(jobData?.shotsTotal ?? 0);
  const status: string = String(jobData?.status || vidData?.status || (doneVideo ? "completed" : jobId || videoId ? "processing" : ""));
  const idle = !jobId && !videoId && !directVideo;
  const failed = status === "failed" || jobError || vidError;
  const errMsg = jobError?.message || vidError?.message || (typeof jobData?.error === "string" ? jobData?.error : jobData?.error?.message);
  return (
    <Card className="lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles size={15} style={{ color: accent }} /> {title}</CardTitle>
          <CardSub>Async pipeline - polls every 2.5s with backoff.</CardSub>
        </div>
        {status ? <StatusChip status={status} /> : null}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/60 bg-black">
        {doneVideo ? (
          <video key={doneVideo.slice(0, 64)} src={doneVideo} controls playsInline className="aspect-video w-full" />
        ) : idle ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-3xl">🎬</span>
            <p className="text-[13.5px] font-semibold text-slate-300">Your render will appear here</p>
            <p className="max-w-[300px] text-[12px] text-slate-500">Configure on the left, then hit Generate. Progress streams live.</p>
          </div>
        ) : failed ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-[13.5px] font-semibold text-red-300">Generation failed</p>
            <p className="max-w-[320px] text-[12px] text-slate-400">{errMsg || "Unknown error"}</p>
          </div>
        ) : (
          <div className="flex aspect-video flex-col justify-center gap-3 p-6">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
              <Loader2 size={16} className="animate-spin" style={{ color: accent }} />
              {shotsTotal > 0 ? `Rendering shot ${Math.min(shotsDone + 1, shotsTotal)} of ${shotsTotal}...` : "Warming up the diffusion engine..."}
            </div>
            {shotsTotal > 0 ? <ProgressMeter value={shotsDone} max={shotsTotal} accent={accent} /> : (
              <div className="space-y-2"><div className="skeleton h-2.5 rounded-full" /><div className="skeleton h-2.5 w-2/3 rounded-full" /></div>
            )}
            <p className="font-mono text-[11px] text-slate-500">live polling · auto-backoff to 5s</p>
          </div>
        )}
      </div>
      {doneVideo && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => downloadDataUrl(doneVideo, `${slug(prompt || "campaign")}.mp4`)}>
            <Download size={14} /> Download MP4
          </Button>
          <button onClick={() => setBriefOpen((v) => !v)}
            className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition",
              briefOpen ? "border-slate-400 bg-white/10 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white")}>
            <FileText size={14} /> Creative Brief <ChevronDown size={13} className={cn("transition", briefOpen && "rotate-180")} />
          </button>
        </div>
      )}
      {briefOpen && doneVideo && (
        <div className="mt-3 animate-rise rounded-xl border border-slate-700/60 bg-slate-950/50 p-3">
          <BriefPane brief={brief} prompt={prompt} seed={seed} />
        </div>
      )}
      {polling && !doneVideo && !failed && <p className="mt-2 text-[11.5px] text-slate-500">Live polling…</p>}
    </Card>
  );
}

