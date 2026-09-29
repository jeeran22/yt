"use client";
import { useCallback, useState } from "react";
import { compressImage } from "@/lib/media";
import { useStudio } from "@/lib/store";

export function useDropzone(busy: boolean, setBusy: (v: boolean) => void, onChange: (v: { dataUrl: string; mimeType: string; name: string } | null) => void) {
  const [isDragActive, setIsDragActive] = useState(false);
  const pushToast = useStudio((s) => s.pushToast);

  const handleFile = useCallback(async (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      pushToast({ title: "Not an image", desc: "Please drop a PNG, JPEG or WEBP file.", kind: "err" });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      pushToast({ title: "Image too large", desc: "Max 10 MB please.", kind: "err" });
      return;
    }
    setBusy(true);
    try {
      const c = await compressImage(f);
      onChange({ dataUrl: c.dataUrl, mimeType: c.mimeType, name: f.name });
      pushToast({ title: "Seed image ready", desc: "Compressed + converted to base64.", kind: "ok" });
    } catch {
      pushToast({ title: "Could not read image", kind: "err" });
    } finally {
      setBusy(false);
    }
  }, [onChange, pushToast, setBusy]);

  return {
    isDragActive,
    getRootProps: () => ({
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); },
      onDragLeave: () => setIsDragActive(false),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); handleFile(e.dataTransfer.files?.[0]); },
      onClick: () => { if (!busy) document.getElementById("vault-file-input")?.click(); },
    }),
    getInputProps: () => ({
      id: "vault-file-input",
      type: "file" as const,
      accept: "image/*",
      className: "hidden",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => { handleFile(e.target.files?.[0]); e.target.value = ""; },
    }),
  };
}
