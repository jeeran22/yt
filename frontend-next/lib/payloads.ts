// Payload builders — match backend controllers exactly.
function nonEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (typeof v === "number" && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return out;
}

export function cleanShots(shots: Record<string, unknown>[]) {
  return (shots || []).map((s) => nonEmpty(s)).filter((s) => Object.keys(s).length > 0);
}

export function buildImagePayload(o: { prompt: string; size: number; format: string; seed?: string | number | "" }) {
  const body: Record<string, unknown> = {
    prompt: String(o.prompt || "").trim(),
    width: Number(o.size), height: Number(o.size), output_format: o.format,
  };
  if (o.seed !== "" && o.seed !== undefined && o.seed !== null) body.seed = Number(o.seed);
  return body;
}

export function buildTextToVideoPayload(o: { prompt: string; size: number; seed?: string | number | ""; cfg_scale: number; motion_bucket_id: number }) {
  const body: Record<string, unknown> = {
    prompt: String(o.prompt || "").trim(),
    width: Number(o.size), height: Number(o.size), output_format: "png",
    cfg_scale: Number(o.cfg_scale), motion_bucket_id: Number(o.motion_bucket_id),
  };
  if (o.seed !== "" && o.seed !== undefined && o.seed !== null) body.seed = Number(o.seed);
  return body;
}

export function buildImageToVideoJson(o: { imageBase64: string; imageMimeType?: string; seed?: string | number | ""; cfg_scale: number; motion_bucket_id: number }) {
  const body: Record<string, unknown> = {
    imageBase64: String(o.imageBase64).replace(/^data:[^,]+,/, ""),
    imageMimeType: o.imageMimeType || "image/png",
    cfg_scale: Number(o.cfg_scale), motion_bucket_id: Number(o.motion_bucket_id),
  };
  if (o.seed !== "" && o.seed !== undefined && o.seed !== null) body.seed = Number(o.seed);
  return body;
}

export function buildImageToVideoForm(file: File, o: { seed?: string | number | ""; cfg_scale: number; motion_bucket_id: number }) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("seed", String(o.seed === "" || o.seed === undefined || o.seed === null ? 0 : Number(o.seed)));
  fd.append("cfg_scale", String(o.cfg_scale));
  fd.append("motion_bucket_id", String(o.motion_bucket_id));
  return fd;
}

export function buildStitchPayload(o: { clips: string[]; transition: string; resolution?: string; transition_duration: number }) {
  const body: Record<string, unknown> = {
    clips: o.clips, transition: o.transition, transition_duration: Number(o.transition_duration),
  };
  if (o.resolution && o.resolution !== "source") body.resolution = o.resolution;
  return body;
}

export function buildMarketingPayload(o: { product: any; style: any; photoFile?: File | null; shots?: any[]; seed?: string | number | ""; transition?: string; resolution?: string; transition_duration?: number | string | "" }) {
  const prod: Record<string, unknown> = {
    name: String((o.product && o.product.name) || "").trim(),
    type: (o.product && o.product.type) || "physical",
  };
  if (o.product?.description?.trim()) prod.description = String(o.product.description).trim();
  if (o.product?.category?.trim()) prod.category = String(o.product.category).trim();
  if (o.product?.imageBase64) {
    prod.imageBase64 = o.product.imageBase64;
    prod.imageMimeType = o.product.imageMimeType || "image/png";
  }
  const styleClean = nonEmpty(o.style || {});
  const hasShots = Array.isArray(o.shots) && o.shots.length > 0;
  const cleanList = hasShots ? cleanShots(o.shots!) : null;
  const seedVal = o.seed === "" || o.seed === undefined || o.seed === null ? undefined : Number(o.seed);
  const base: Record<string, unknown> = { product: prod, style: styleClean };
  if (seedVal !== undefined) base.seed = seedVal;
  if (hasShots) {
    base.shots = cleanList;
    if (o.transition) base.transition = o.transition;
    if (o.resolution && o.resolution !== "source") base.resolution = o.resolution;
    if (o.transition_duration !== "" && o.transition_duration !== undefined && o.transition_duration !== null)
      base.transition_duration = Number(o.transition_duration);
  }
  if (o.photoFile) {
    const fd = new FormData();
    fd.append("product", JSON.stringify(prod));
    fd.append("style", JSON.stringify(styleClean));
    if (hasShots) fd.append("shots", JSON.stringify(cleanList));
    if (seedVal !== undefined) fd.append("seed", String(seedVal));
    if (base.transition) fd.append("transition", String(base.transition));
    if (base.resolution) fd.append("resolution", String(base.resolution));
    if (base.transition_duration !== undefined) fd.append("transition_duration", String(base.transition_duration));
    fd.append("image", o.photoFile);
    return { body: fd, form: true as const };
  }
  return { body: base, form: false as const };
}

export function buildYouTubePayload(o: { niche: string; videoType: string; topic: string; mood: string; style: any; seed?: string | number | ""; shots?: any[]; transition?: string; resolution?: string; transition_duration?: number | string | "" }) {
  const base: Record<string, unknown> = {
    niche: o.niche, videoType: o.videoType, mood: o.mood,
    topic: String(o.topic || "").trim(), style: nonEmpty(o.style || {}),
  };
  if (o.seed !== "" && o.seed !== undefined && o.seed !== null) base.seed = Number(o.seed);
  if (Array.isArray(o.shots) && o.shots.length > 0) {
    base.shots = cleanShots(o.shots);
    if (o.transition) base.transition = o.transition;
    if (o.resolution && o.resolution !== "source") base.resolution = o.resolution;
    if (o.transition_duration !== "" && o.transition_duration !== undefined && o.transition_duration !== null)
      base.transition_duration = Number(o.transition_duration);
  }
  return { body: base, form: false as const };
}
