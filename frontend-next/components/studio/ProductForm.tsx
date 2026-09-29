"use client";
import { useState } from "react";
import { Package, Dices } from "lucide-react";
import { Card, CardTitle, CardSub, FieldLabel, TextInput, TextArea, Select } from "@/components/ui/fields";
import { MotionSlider, CfgSlider } from "@/components/ui/sliders";
import { Button } from "@/components/ui/button";
import { AssetVault } from "./AssetVault";
import type { CampaignPresets, ProductType } from "@/lib/types";

export interface ProductFormState {
  name: string; type: ProductType; description: string; category: string;
  mood: string; surface: string; lighting: string; atmosphere: string; accent: string; style: string;
  motion: number; cfg: number; seed: string;
}

export function defaultProductForm(p: CampaignPresets): ProductFormState {
  const phys = p.marketing.motionSettings?.physical || { motion_bucket_id: 75, cfg_scale: 2.0 };
  return {
    name: "", type: "physical", description: "", category: "",
    mood: "", surface: "", lighting: "", atmosphere: "", accent: "", style: "",
    motion: phys.motion_bucket_id, cfg: phys.cfg_scale, seed: "",
  };
}

export default function ProductForm({ form, set, presets, accent }: {
  form: ProductFormState; set: (p: Partial<ProductFormState>) => void; presets: CampaignPresets; accent: string;
}) {
  const [photo, setPhoto] = useState<{ dataUrl: string; mimeType: string; name: string } | null>(null);
  const isPhysical = form.type === "physical";
  const setType = (t: ProductType) => {
    const ms = presets.marketing.motionSettings?.[t];
    set({ type: t, ...(ms ? { motion: ms.motion_bucket_id, cfg: ms.cfg_scale } : {}) });
  };
  return (
    <Card>
      <CardTitle className="flex items-center gap-2"><Package size={16} style={{ color: accent }} /> Product Promo</CardTitle>
      <CardSub>Physical goods or SaaS — tuned motion auto-applied per type.</CardSub>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950/60 p-1.5">
          {(presets.marketing.productTypes || []).map((t) => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`rounded-lg px-3 py-2.5 text-left transition ${form.type === t.id ? "bg-cyan-500/15 text-white shadow-glowcyan" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
              title={t.description}>
              <span className="block text-[13px] font-bold">{t.label}</span>
              <span className="clamp-2 block text-[11px] opacity-70">{t.description}</span>
            </button>
          ))}
        </div>
        <div>
          <FieldLabel>Product name *</FieldLabel>
          <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={isPhysical ? "Aurora Glass Perfume Bottle" : "Pulseboard Analytics SaaS"} maxLength={200} />
        </div>
        <div>
          <FieldLabel hint={`${form.description.length}/500`}>Description</FieldLabel>
          <TextArea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={500}
            placeholder={isPhysical ? "Hand-blown glass, amber liquid, minimal label…" : "Real-time dashboards, AI insights, dark UI…"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><FieldLabel>Category</FieldLabel><TextInput value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="beauty / electronics…" /></div>
          <div>
            <FieldLabel>Seed</FieldLabel>
            <span className="flex gap-2">
              <TextInput value={form.seed} onChange={(e) => set({ seed: e.target.value.replace(/[^0-9]/g, "") })} placeholder="auto = random" inputMode="numeric" />
              <Button variant="secondary" size="sm" title="Randomize" onClick={() => set({ seed: String(Math.floor(Math.random() * 4294967294)) })}><Dices size={15} /></Button>
            </span>
          </div>
        </div>
        <div>
          <FieldLabel hint="compressed in-browser">Seed image (optional)</FieldLabel>
          <AssetVault value={photo} onChange={(v) => { setPhoto(v); }} accent={accent} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><FieldLabel>Mood</FieldLabel><TextInput value={form.mood} onChange={(e) => set({ mood: e.target.value })} placeholder="luxurious, high-end" /></div>
          <div><FieldLabel>Surface</FieldLabel><TextInput value={form.surface} onChange={(e) => set({ surface: e.target.value })} placeholder="wet black stone" /></div>
          <div><FieldLabel>Lighting</FieldLabel><TextInput value={form.lighting} onChange={(e) => set({ lighting: e.target.value })} placeholder="dramatic rim light" /></div>
          <div><FieldLabel>Atmosphere</FieldLabel><TextInput value={form.atmosphere} onChange={(e) => set({ atmosphere: e.target.value })} placeholder="soft mist, bokeh" /></div>
          <div><FieldLabel>Accent</FieldLabel><TextInput value={form.accent} onChange={(e) => set({ accent: e.target.value })} placeholder="amber / cyan neon" /></div>
          <div><FieldLabel>Style</FieldLabel><TextInput value={form.style} onChange={(e) => set({ style: e.target.value })} placeholder="commercial photo" /></div>
        </div>
        <MotionSlider label="Motion bucket" value={form.motion} onChange={(v) => set({ motion: v })} accent={accent} />
        <CfgSlider label="CFG scale" value={form.cfg} onChange={(v) => set({ cfg: v })} accent={accent} />
      </div>
    </Card>
  );
}

export function productPhotoState() {
  return null;
}
