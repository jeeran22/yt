"use client";
import { useDropzone } from "@/hooks/useDropzoneShim";
import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssetVault({ value, onChange, accent = "#06B6D4" }: {
  value: { dataUrl: string; mimeType: string; name: string } | null;
  onChange: (v: { dataUrl: string; mimeType: string; name: string } | null) => void;
  accent?: string;
}) {
  const [busy, setBusy] = useState(false);
  const { getRootProps, getInputProps, isDragActive } = useDropzone(busy, setBusy, onChange);
  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-700/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.dataUrl} alt={value.name} className="h-36 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 bg-slate-950/80 px-3 py-2">
            <span className="truncate text-[12px] text-slate-300">{value.name}</span>
            <button onClick={() => onChange(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white" title="Remove image">
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600/80 bg-slate-950/50 px-4 py-7 text-center transition hover:border-slate-400",
            isDragActive && "border-cyan-400 bg-cyan-500/5"
          )}
          style={isDragActive ? { boxShadow: `0 0 24px -8px ${accent}` } : undefined}
        >
          <input {...getInputProps()} />
          {busy ? <Loader2 className="animate-spin text-slate-400" size={22} /> : <ImagePlus className="text-slate-500" size={24} />}
          <p className="text-[13px] font-semibold text-slate-300">
            {isDragActive ? "Drop it — I'll compress it" : "Drop a seed image, or click to browse"}
          </p>
          <p className="text-[11.5px] text-slate-500">PNG / JPEG / WEBP · auto-compressed to max 1024px before base64</p>
        </div>
      )}
    </div>
  );
}
