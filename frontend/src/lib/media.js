// ---------------------------------------------------------------------------
// Media helpers: convert between data URLs, Blobs and object URLs; download.
// The backend returns everything as `data:image/...;base64,...` or
// `data:video/mp4;base64,...` strings.
// ---------------------------------------------------------------------------

export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  try {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const meta = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mimeMatch = /data:([^;,]+)/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  } catch (e) {
    return null;
  }
}

export function dataUrlToObjectUrl(dataUrl) {
  const blob = dataUrlToBlob(dataUrl);
  return blob ? URL.createObjectURL(blob) : dataUrl;
}

export function revokeObjectUrl(url) {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// "data:image/png;base64,...." -> "...."
export function dataUrlBase64(dataUrl) {
  if (!dataUrl) return dataUrl;
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function dataUrlMime(dataUrl) {
  const m = /^data:([^;,]+)/.exec(dataUrl || '');
  return m ? m[1] : 'application/octet-stream';
}

export function dataUrlExtension(dataUrl) {
  const mime = dataUrlMime(dataUrl);
  return mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'bin');
}

// Create a temporary object URL, trigger a download and revoke it shortly after.
export function downloadDataUrl(dataUrl, filename) {
  const url = dataUrlToObjectUrl(dataUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.' + dataUrlExtension(dataUrl);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => revokeObjectUrl(url), 4000);
}

// Convert a File/Blob to a data URL (used for uploads & stitching local files).
// Uses Blob.arrayBuffer() (universally supported) instead of the legacy
// FileReader API so it works in every modern browser.
export async function fileToDataUrl(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 32 KiB — keep String.fromCharCode.apply() well under the arg limit
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.slice(i, Math.min(i + CHUNK, bytes.length)));
  }
  return `data:${file.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}