// Browser image compression before base64 conversion (payload optimisation).
export async function compressImage(file: File, maxDim = 1024, quality = 0.85): Promise<{ dataUrl: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      const c = document.createElement("canvas");
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/png");
      return { dataUrl, mimeType: "image/png" };
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  if (bitmap && typeof (bitmap as any).width === "number" && typeof (bitmap as any).close === "function") {
    const bmp = bitmap as ImageBitmap;
    try {
      const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0, w, h);
      const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      const dataUrl = canvas.toDataURL(mimeType, quality);
      return { dataUrl, mimeType };
    } finally {
      bmp.close();
    }
  }
  return bitmap as unknown as { dataUrl: string; mimeType: string };
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    try {
      const c = await compressImage(file);
      return c.dataUrl;
    } catch { /* fall through */ }
  }
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    bin += String.fromCharCode.apply(null, Array.from(sub));
  }
  return `data:${file.type || "application/octet-stream"};base64,${btoa(bin)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const mime = /data:([^;,]+)/.exec(dataUrl.slice(0, comma))?.[1] || "application/octet-stream";
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  } catch { return null; }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const blob = dataUrlToBlob(dataUrl);
  const url = blob ? URL.createObjectURL(blob) : dataUrl;
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  if (blob) setTimeout(() => URL.revokeObjectURL(url), 4000);
}
