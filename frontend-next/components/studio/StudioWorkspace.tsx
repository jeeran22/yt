"use client";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Rocket, Loader2 } from "lucide-react";
import api, { toFriendly } from "@/lib/api";
import { buildMarketingPayload, buildYouTubePayload } from "@/lib/payloads";
import { validateProductName, validateTopic, validateMotion } from "@/lib/validation";
import { validateCfg, validateShots, validateTransitionDuration } from "@/lib/validation";
import { usePresets } from "@/hooks/usePresets";
import { useStudio } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { TextInput as TI, Select as SEL } from "@/components/ui/fields";
import ProductForm, { defaultProductForm } from "@/components/studio/ProductForm";
import type { ProductFormState } from "@/components/studio/ProductForm";
import TubeForm, { defaultTubeForm } from "@/components/studio/TubeForm";
import type { TubeFormState } from "@/components/studio/TubeForm";
import StoryboardTimeline from "@/components/studio/StoryboardTimeline";
import PreviewCanvas from "@/components/studio/PreviewCanvas";
import type { ShotOverride } from "@/lib/types";

function ShotText(props: { label: string; value: string; onChange: (v: string) => void; hint?: string; wide?: boolean }) {
  return (
    <label className={`text-[12px] font-semibold text-slate-300 ${props.wide ? "sm:col-span-2" : ""}`}>{props.label}
      <TI className="mt-1" value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.hint || "inherit base"} />
    </label>
  );
}

function ShotSelect(props: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-[12px] font-semibold text-slate-300">{props.label}
      <SEL className="mt-1" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => <option key={o || "inherit"} value={o} className="bg-slate-900">{o === "" ? "Inherit" : o.replace(/_/g, " ")}</option>)}
      </SEL>
    </label>
  );
}

export default function StudioWorkspace() {
  const { presets } = usePresets();
  const { mode, setMode, pushToast } = useStudio();
  const accent = mode === "product" ? "#06B6D4" : "#A855F7";
  const [product, setProduct] = useState<ProductFormState>(() => defaultProductForm(presets));
  const [tube, setTube] = useState<TubeFormState>(() => defaultTubeForm(presets));
  const [shots, setShots] = useState<ShotOverride[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transition, setTransition] = useState("fade");
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [resolution, setResolution] = useState("source");
  const [jobId, setJobId] = useState<string | null>(null);
  const [directVideo, setDirectVideo] = useState<{ videoUrl: string; prompt?: string; seed?: string | number; creativeBrief?: unknown } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const multi = shots.length >= 2;
  const patchProduct = (p: Partial<ProductFormState>) => setProduct((f) => ({ ...f, ...p }));
  const patchTube = (p: Partial<TubeFormState>) => setTube((f) => ({ ...f, ...p }));
  const shotPayload = useMemo(() => shots.map((s) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s)) {
      if (k === "id") continue;
      if (v === "" || v === undefined || v === null) continue;
      out[k] = v;
    }
    return out;
  }), [shots]);
  const mutation = useMutation({
    mutationFn: async (): Promise<any> => {
      setFormError(null); setDirectVideo(null); setJobId(null);
      const motion = mode === "product" ? product.motion : tube.motion;
      const cfg = mode === "product" ? product.cfg : tube.cfg;
      const v1 = validateMotion(motion);
      if (v1) throw { code: "INVALID_MOTION_BUCKET", message: v1.message };
      const v2 = validateCfg(cfg);
      if (v2) throw { code: "INVALID_CFG_SCALE", message: v2.message };
      if (multi) {
        const vs = validateShots(shots);
        if (vs) throw { code: shots.length > 10 ? "TOO_MANY_SHOTS" : "INVALID_SHOTS", message: vs.message };
        const vt = validateTransitionDuration(transitionDuration);
        if (transition !== "cut" && vt) throw { code: "INVALID_TRANSITION_DURATION", message: vt.message };
      }
      if (mode === "product") {
        const vp = validateProductName(product.name);
        if (vp) throw { code: "MISSING_PRODUCT_NAME", message: vp.message };
        const styled = { mood: product.mood, surface: product.surface, lighting: product.lighting, atmosphere: product.atmosphere, accent: product.accent, style: product.style, motion_bucket_id: product.motion, cfg_scale: product.cfg };
        const prod = { name: product.name, type: product.type, description: product.description, category: product.category };
        const made = buildMarketingPayload({ product: prod, style: styled, shots: multi ? shotPayload : undefined, seed: product.seed, transition, resolution, transition_duration: transitionDuration });
        return api.marketingCampaign(made.form ? (made.body as FormData) : (made.body as Record<string, unknown>));
      }
      const vto = validateTopic(tube.topic);
      if (vto) throw { code: "INVALID_TOPIC", message: vto.message };
      const made = buildYouTubePayload({ niche: tube.niche, videoType: tube.videoType, topic: tube.topic, mood: tube.mood, style: { style: tube.style, motion_bucket_id: tube.motion, cfg_scale: tube.cfg }, seed: tube.seed, shots: multi ? shotPayload : undefined, transition, resolution, transition_duration: transitionDuration });
      return api.youtubeCampaign(made.body);
    },
    onSuccess: (res: any) => {
      const jid = res?.jobId || res?.id || res?.job?.id;
      if (multi || (jid && !res?.videoUrl)) {
        if (!jid) { setFormError("Backend did not return a job id."); return; }
        setJobId(String(jid));
        pushToast({ title: "Job queued", desc: "Polling every 2.5s.", kind: "info" });
      } else if (res?.videoUrl) {
        setDirectVideo({ videoUrl: res.videoUrl, prompt: res.prompt, seed: res.seed, creativeBrief: res.creativeBrief });
        pushToast({ title: "Video ready", desc: "Single-shot render complete.", kind: "ok" });
      } else setFormError("Unexpected response - no video or job id.");
    },
    onError: (e: any) => {
      const msg = toFriendly(e);
      setFormError(e?.code ? `${msg} (${e.code})` : msg);
      pushToast({ title: "Generation blocked", desc: e?.code ? `${msg} [${e.code}]` : msg, kind: "err" });
    },
  });
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="card-ring flex gap-1.5 p-1.5">
          <button onClick={() => setMode("product")} className={`flex-1 rounded-xl px-4 py-3 text-left transition ${mode === "product" ? "bg-cyan-500/15 text-white shadow-glowcyan" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
            <span className="block text-[14px] font-bold">Product Promo</span>
            <span className="block text-[11.5px] opacity-70">Physical and SaaS campaigns</span>
          </button>
          <button onClick={() => setMode("youtube")} className={`flex-1 rounded-xl px-4 py-3 text-left transition ${mode === "youtube" ? "bg-violet-500/15 text-white shadow-glowviolet" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
            <span className="block text-[14px] font-bold">YouTube Creator Hub</span>
            <span className="block text-[11.5px] opacity-70">Niche intros, b-roll, loops</span>
          </button>
        </div>
        {mode === "product"
          ? <ProductForm form={product} set={patchProduct} presets={presets} accent={accent} />
          : <TubeForm form={tube} set={patchTube} presets={presets} accent={accent} />}
        <StoryboardTimeline shots={shots} onChange={setShots} editingId={editingId} onEdit={setEditingId} accent={accent}
          transition={transition} transitionDuration={transitionDuration} resolution={resolution}
          onTransition={setTransition} onDuration={setTransitionDuration} onResolution={setResolution}
          renderEditor={(shot, update) => (mode === "product" ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ShotText label="Mood" value={String((shot as any).mood || "")} onChange={(v) => update({ mood: v })} />
              <ShotText label="Surface" value={String((shot as any).surface || "")} onChange={(v) => update({ surface: v })} />
              <ShotText label="Lighting" value={String((shot as any).lighting || "")} onChange={(v) => update({ lighting: v })} />
              <ShotText label="Atmosphere" value={String((shot as any).atmosphere || "")} onChange={(v) => update({ atmosphere: v })} />
              <ShotText label="Accent" value={String((shot as any).accent || "")} onChange={(v) => update({ accent: v })} />
              <ShotText label="Style" value={String((shot as any).style || "")} onChange={(v) => update({ style: v })} />
              <ShotText label="Motion override" value={shot.motion_bucket_id === "" ? "" : String(shot.motion_bucket_id ?? "")} onChange={(v) => update({ motion_bucket_id: v === "" ? "" : Number(v) })} hint="inherit" />
              <ShotText label="CFG override" value={shot.cfg_scale === "" ? "" : String(shot.cfg_scale ?? "")} onChange={(v) => update({ cfg_scale: v === "" ? "" : Number(v) })} hint="inherit" />
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ShotSelect label="Niche" value={shot.niche || ""} onChange={(v) => update({ niche: v })} options={["", ...(presets.youtube.niches || [])]} />
              <ShotSelect label="Video type" value={String((shot as any).videoType || "")} onChange={(v) => update({ videoType: v } as any)} options={["", ...(presets.youtube.videoTypes || [])]} />
              <ShotText label="Topic" value={shot.topic || ""} onChange={(v) => update({ topic: v })} wide />
              <ShotText label="Motion override" value={shot.motion_bucket_id === "" ? "" : String(shot.motion_bucket_id ?? "")} onChange={(v) => update({ motion_bucket_id: v === "" ? "" : Number(v) })} hint="inherit" />
              <ShotText label="CFG override" value={shot.cfg_scale === "" ? "" : String(shot.cfg_scale ?? "")} onChange={(v) => update({ cfg_scale: v === "" ? "" : Number(v) })} hint="inherit" />
            </div>
          ))}
        />
        {formError && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">{formError}</div>}
        <Button variant={mode === "product" ? "primary" : "violet"} size="lg" className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? (<><Loader2 size={17} className="animate-spin" /> Directing...</>) : (<><Rocket size={17} /> {multi ? `Generate ${shots.length}-shot sequence` : "Generate single shot"}</>)}
        </Button>
        <p className="text-center text-[11.5px] text-slate-500">
          {multi ? `Async job: ${shots.length} clips plus ${transition} stitch` : "Single shot: direct render, instant preview"}
        </p>
      </div>
      <PreviewCanvas jobId={jobId} directVideo={directVideo} accent={accent} title={mode === "product" ? "Campaign Preview" : "Creator Preview"} />
    </div>
  );
}

