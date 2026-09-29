"use client";
import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2, Clapperboard } from "lucide-react";
import type { ShotOverride } from "@/lib/types";
import { uid, estimateRuntime } from "@/lib/utils";
import { Card, CardTitle, CardSub, Select } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function shotLabel(s: ShotOverride, i: number): string {
  const bits: string[] = [];
  const vt = (s as any).videoType as string | undefined;
  if (s.niche || vt || s.topic) {
    const t = [s.niche, vt?.replace(/_/g, " "), s.mood].filter(Boolean).join(" / ");
    bits.push(t || `Shot ${i + 1}`);
    if (s.topic) bits.push(String(s.topic).slice(0, 42));
  } else {
    bits.push(`Shot ${i + 1}`);
    const m = [s.mood, s.surface, s.lighting].filter(Boolean).join(" / ");
    if (m) bits.push(m);
  }
  return bits.join(" - ").slice(0, 90);
}

function SortableShot({ shot, index, selected, onSelect, onEdit, onRemove }: {
  shot: ShotOverride; index: number; selected: boolean;
  onSelect: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shot.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("w-[210px] shrink-0 cursor-pointer rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5",
        selected ? "border-cyan-400 bg-cyan-500/10 shadow-glowcyan" : "border-slate-700/60 bg-graphite-750 hover:border-slate-500",
        isDragging && "opacity-60")} onClick={onSelect}>
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-300">SHOT {index + 1}</span>
        <span {...attributes} {...listeners} className="cursor-grab text-slate-500 hover:text-slate-200" title="Drag to reorder" onClick={(e) => e.stopPropagation()}>
          <GripVertical size={15} />
        </span>
      </div>
      <p className="clamp-2 mt-2 min-h-[34px] text-[12.5px] font-medium leading-snug text-slate-200">{shotLabel(shot, index)}</p>
      <div className="mt-2 flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-lg px-2 py-1 text-[11.5px] font-semibold text-cyan-300 hover:bg-cyan-500/10">
          <span className="inline-flex items-center gap-1"><Pencil size={12} /> Edit</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="rounded-lg px-2 py-1 text-[11.5px] font-semibold text-slate-500 hover:bg-red-500/10 hover:text-red-300">
          <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Drop</span>
        </button>
      </div>
    </div>
  );
}
export default function StoryboardTimeline(props: { shots: ShotOverride[]; onChange: (s: ShotOverride[]) => void; editingId: string | null; onEdit: (id: string | null) => void; renderEditor: (shot: ShotOverride, update: (patch: Partial<ShotOverride>) => void) => React.ReactNode; transition: string; transitionDuration: number; resolution: string; onTransition: (v: string) => void; onDuration: (v: number) => void; onResolution: (v: string) => void; accent?: string }) {
  const { shots, onChange, editingId, onEdit, renderEditor, transition, transitionDuration, resolution, onTransition, onDuration, onResolution } = props;
  const accent = props.accent || "#06B6D4";
  const [selectedId, setSelectedId] = useState<string | null>(shots[0]?.id ?? null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const selected = shots.find((s) => s.id === selectedId) || shots[0];
  const runtime = estimateRuntime(shots.length, transition, transitionDuration);
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = shots.findIndex((s) => s.id === active.id);
    const to = shots.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(shots, from, to));
  };
  const add = () => {
    if (shots.length >= 10) return;
    const n: ShotOverride = { id: uid("shot"), motion_bucket_id: "", cfg_scale: "" };
    onChange([...shots, n]); setSelectedId(n.id); onEdit(n.id);
  };
  const updateSelected = (patch: Partial<ShotOverride>) => {
    if (!selected) return;
    onChange(shots.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><Clapperboard size={16} className="text-cyan-300" /> Sequence Timeline</CardTitle>
          <CardSub>Compose up to 10 shots - drag to reorder. Empty fields inherit base.</CardSub>
        </div>
        <Button variant="secondary" size="sm" onClick={add} disabled={shots.length >= 10}>
          <Plus size={14} /> Add shot ({shots.length}/10)
        </Button>
      </div>

      {shots.length === 0 ? (
        <button onClick={add} className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600/70 bg-slate-950/40 px-4 py-8 text-slate-400 transition hover:border-cyan-400/60 hover:text-slate-200">
          <Plus size={20} />
          <span className="text-[13px] font-semibold">Single-shot mode - click to build a sequence</span>
          <span className="text-[11.5px]">Submits via shots[] as an async stitched job</span>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shots.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {shots.map((s, i) => (
                <SortableShot key={s.id} shot={s} index={i} selected={selected?.id === s.id}
                  onSelect={() => setSelectedId(s.id)} onEdit={() => onEdit(s.id)}
                  onRemove={() => {
                    const next = shots.filter((x) => x.id !== s.id);
                    onChange(next);
                    if (selectedId === s.id) setSelectedId(next[0]?.id ?? null);
                    if (editingId === s.id) onEdit(null);
                  }} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {selected && editingId === selected.id && (
        <div className="mt-3 animate-rise rounded-xl border border-slate-700/60 bg-slate-950/50 p-4">
          <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-slate-400">
            Editing shot {(shots.findIndex((s) => s.id === selected.id) + 1) || 1} of {shots.length}
          </div>
          {renderEditor(selected, updateSelected)}
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>Done</Button>
          </div>
        </div>
      )}
      {shots.length >= 2 && (
        <div className="mt-4 rounded-xl border border-slate-700/60 bg-graphite-900/95 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-[12px] font-semibold text-slate-300">Transition
              <Select className="mt-1" value={transition} onChange={(e) => onTransition(e.target.value)}>
                <option value="cut">Cut (seamless)</option>
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
              </Select>
            </label>
            <label className="text-[12px] font-semibold text-slate-300">Duration
              <span className="mt-1 flex items-center gap-2">
                <input type="range" min={0.1} max={2} step={0.1} value={transitionDuration} disabled={transition === "cut"}
                  onChange={(e) => onDuration(Number(e.target.value))} className="studio-range w-full"
                  style={{ ["--pct" as string]: `${((transitionDuration - 0.1) / 1.9) * 100}%`, ["--fill" as string]: accent }} />
                <span className="font-mono text-[12px] text-white">{transitionDuration.toFixed(1)}s</span>
              </span>
            </label>
            <label className="text-[12px] font-semibold text-slate-300">Normalize
              <Select className="mt-1" value={resolution} onChange={(e) => onResolution(e.target.value)}>
                <option value="source">Source (no conversion)</option>
                <option value="1024x576">1024x576 landscape</option>
                <option value="576x1024">576x1024 portrait</option>
                <option value="768x768">768x768 square</option>
              </Select>
            </label>
            <div className="flex items-end">
              <div className="w-full rounded-xl bg-slate-950/60 px-3 py-2 text-[12px] text-slate-400">
                Est. runtime <span className="font-mono font-bold text-white">~{runtime.toFixed(1)}s</span>
                <span className="block text-[11px]">{shots.length} x 2s clips</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

