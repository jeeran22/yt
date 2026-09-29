// ---------------------------------------------------------------------------
// In-memory clip library (per session). Generated videos from any tab can be
// added here and later assembled in the Stitch Studio tab.
// ---------------------------------------------------------------------------

let clips = [];
let listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit() {
  listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
}

export function addClip({ title = 'Untitled clip', videoUrl, mime = 'video/mp4', duration, source = 'generated' } = {}) {
  if (!videoUrl) return null;
  const clip = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    title,
    videoUrl,
    mime,
    duration,
    source,
    createdAt: Date.now()
  };
  clips.unshift(clip);
  emit();
  return clip;
}

export function removeClip(id) {
  clips = clips.filter((c) => c.id !== id);
  emit();
}

export function listClips() {
  return clips;
}

export function clipCount() {
  return clips.length;
}