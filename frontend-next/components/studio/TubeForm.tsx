"use client";
import { Youtube, Dices } from "lucide-react";
import { Card, CardTitle, CardSub, FieldLabel, TextInput, TextArea, Select } from "@/components/ui/fields";
import { MotionSlider, CfgSlider } from "@/components/ui/sliders";
import { Button } from "@/components/ui/button";
import type { CampaignPresets } from "@/lib/types";
import { moodsList } from "@/hooks/usePresets";

export interface TubeFormState {
  niche: string; videoType: string; topic: string; mood: string;
  style: string; motion: number; cfg: number; seed: string;
}

export function defaultTubeForm(p: CampaignPresets): TubeFormState {
  const motion = (p.youtube.motionSettings as any)?.b_roll || { motion_bucket_id: 100, cfg_scale: 1.8 };
  return {
    niche: p.youtube.niches?.[0] || "tech",
    videoType: p.youtube.videoTypes?.includes("b_roll") ? "b_roll" : p.youtube.videoTypes?.[0] || "b_roll",
    topic: "", mood: moodsList(p.youtube.moods as string[])?.[0] || "energetic",
    style: "", motion: motion.motion_bucket_id, cfg: motion.cfg_scale, seed: "",
  };
}

const NICHE_EMOJI: Record<string, string> = {
  tech: "💻", gaming: "🎮", cooking: "🍳", fitness: "💪", travel: "✈️",
  finance: "📈", education: "📚", lifestyle: "🏡", music: "🎵", beauty: "💄",
};

export default function TubeForm({ form, set, presets, accent }: {
  form: TubeFormState; set: (p: Partial<TubeFormState>) => void; presets: CampaignPresets; accent: string;
}) {
  const moods = moodsList(presets.youtube.moods as string[]);
  const setVideoType = (vt: string) => {
    const ms = (presets.youtube.motionSettings as any)?.[vt];
    set({ videoType: vt, ...(ms ? { motion: ms.motion_bucket_id, cfg: ms.cfg_scale } : {}) });
  };
  const nicheStyle = (presets.youtube.nicheStyles as any)?.[form.niche] as string | undefined;
  return (
    <Card style={{ borderColor: "rgba(168,85,247,0.25)" }}>
      <CardTitle className="flex items-center gap-2"><Youtube size={16} style={{ color: accent }} /> YouTube Creator Hub</CardTitle>
      <CardSub>Niche × format × mood presets — tuned per video type.</CardSub>
      <div className="mt-4 space-y-4">
        <div>
          <FieldLabel>Niche</FieldLabel>
          <div className="grid grid-cols-5 gap-1.5">
            {(presets.youtube.niches || []).map((n) => (
              <button key={n} onClick={() => set({ niche: n })} title={n}
                className={`rounded-xl border px-1 py-2 text-center text-[11.5px] font-bold capitalize transition ${form.niche === n ? "border-violet-400 bg-violet-500/15 text-white shadow-glowviolet" : "border-slate-700/60 bg-slate-950/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}>
                <span className="block text-[15px]">{NICHE_EMOJI[n] || "✦"}</span>{n}
              </button>
            ))}
          </div>
          {nicheStyle ? <p className="mt-1.5 rounded-lg bg-violet-500/8 px-2.5 py-1.5 text-[11.5px] leading-snug text-violet-200/80">✦ {nicheStyle}</p> : null}
        </div>
        <div>
          <FieldLabel>Video type</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {(presets.youtube.videoTypes || []).map((vt) => (
              <button key={vt} onClick={() => setVideoType(vt)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-bold capitalize transition ${form.videoType === vt ? "border-violet-400 bg-violet-500/15 text-white" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}>
                {vt.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel hint={`${form.topic.length}/500`}>Topic *</FieldLabel>
          <TextArea rows={2} value={form.topic} onChange={(e) => set({ topic: e.target.value })} maxLength={500}
            placeholder="e.g. I built a smart home dashboard in 24 hours…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Mood</FieldLabel>
            <Select value={form.mood} onChange={(e) => set({ mood: e.target.value })}>
              {moods.map((m) => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Seed</FieldLabel>
            <span className="flex gap-2">
              <TextInput value={form.seed} onChange={(e) => set({ seed: e.target.value.replace(/[^0-9]/g, "") })} placeholder="auto = random" inputMode="numeric" />
              <Button variant="secondary" size="sm" title="Randomize" onClick={() => set({ seed: String(Math.floor(Math.random() * 4294967294)) })}><Dices size={15} /></Button>
            </span>
          </div>
        </div>
        <div><FieldLabel>Extra style</FieldLabel><TextInput value={form.style} onChange={(e) => set({ style: e.target.value })} placeholder="neon grid, light streaks…" /></div>
        <MotionSlider label="Motion bucket" value={form.motion} onChange={(v) => set({ motion: v })} accent={accent} />
        <CfgSlider label="CFG scale" value={form.cfg} onChange={(v) => set({ cfg: v })} accent={accent} />
      </div>
    </Card>
  );
}
