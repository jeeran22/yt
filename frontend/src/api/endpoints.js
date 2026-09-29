// ---------------------------------------------------------------------------
// Payload builders — make sure request bodies match the backend controllers
// exactly (numbers as numbers, images as data URLs or multipart "image",
// shots[] for multi-shot campaigns, transition_duration in seconds).
// ---------------------------------------------------------------------------

// Strip empty values ('' or whitespace-only strings) from an object.
// Used for style objects and per-shot overrides so we never send empty string
// numeric fields (the backend would reject them).
function nonEmpty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return out;
}

export function cleanShots(shots) {
  return (shots || [])
    .map((s) => nonEmpty(s))
    .filter((s) => Object.keys(s).length > 0);
}

export function buildImagePayload({ prompt, size, format, seed }) {
  const body = {
    prompt: String(prompt || '').trim(),
    width: Number(size),
    height: Number(size),
    output_format: format
  };
  if (seed !== '' && seed !== undefined && seed !== null) body.seed = Number(seed);
  return body;
}

export function buildTextToVideoPayload({ prompt, size, seed, cfg_scale, motion_bucket_id }) {
  const body = {
    prompt: String(prompt || '').trim(),
    width: Number(size),
    height: Number(size),
    output_format: 'png',
    cfg_scale: Number(cfg_scale),
    motion_bucket_id: Number(motion_bucket_id)
  };
  if (seed !== '' && seed !== undefined && seed !== null) body.seed = Number(seed);
  return body;
}

// JSON variant for image-to-video (reuse a generated data URL).
export function buildImageToVideoJson({ imageBase64, imageMimeType, seed, cfg_scale, motion_bucket_id }) {
  const body = {
    imageBase64: String(imageBase64).replace(/^data:[^,]+,/, ''),
    imageMimeType: imageMimeType || 'image/png',
    cfg_scale: Number(cfg_scale),
    motion_bucket_id: Number(motion_bucket_id)
  };
  if (seed !== '' && seed !== undefined && seed !== null) body.seed = Number(seed);
  return body;
}

// Multipart variant for image-to-video (upload a file).
export function buildImageToVideoForm(imageFile, { seed, cfg_scale, motion_bucket_id }) {
  const fd = new FormData();
  fd.append('image', imageFile);
  fd.append('seed', String(seed === '' || seed === undefined || seed === null ? 0 : Number(seed)));
  fd.append('cfg_scale', String(cfg_scale));
  fd.append('motion_bucket_id', String(motion_bucket_id));
  return fd;
}

export function buildStitchPayload({ clips, transition, resolution, transition_duration }) {
  const body = {
    clips,
    transition,
    transition_duration: Number(transition_duration)
  };
  if (resolution && resolution !== 'source') body.resolution = resolution;
  return body;
}

export function buildMarketingPayload({ product, style, photoFile, shots, seed, transition, resolution, transition_duration }) {
  const prod = {
    name: String((product && product.name) || '').trim(),
    type: (product && product.type) || 'physical'
  };
  if (product && product.description && String(product.description).trim()) prod.description = String(product.description).trim();
  if (product && product.category && String(product.category).trim()) prod.category = String(product.category).trim();
  if (product && product.imageBase64) {
    prod.imageBase64 = product.imageBase64;
    prod.imageMimeType = product.imageMimeType || 'image/png';
  }

  const styleClean = nonEmpty(style);
  const hasShots = Array.isArray(shots) && shots.length > 0;
  const cleanShotList = hasShots ? cleanShots(shots) : null;
  const seedVal = (seed === '' || seed === undefined || seed === null) ? undefined : Number(seed);

  const base = { product: prod, style: styleClean };
  if (seedVal !== undefined) base.seed = seedVal;
  if (hasShots) {
    base.shots = cleanShotList;
    if (transition) base.transition = transition;
    if (resolution && resolution !== 'source') base.resolution = resolution;
    if (transition_duration !== '' && transition_duration !== undefined && transition_duration !== null) {
      base.transition_duration = Number(transition_duration);
    }
  }

  // Uploaded product photo → multipart ("image" field, JSON fields as strings).
  if (photoFile) {
    const fd = new FormData();
    fd.append('product', JSON.stringify(prod));
    fd.append('style', JSON.stringify(styleClean));
    if (hasShots) fd.append('shots', JSON.stringify(cleanShotList));
    if (seedVal !== undefined) fd.append('seed', String(seedVal));
    if (base.transition) fd.append('transition', base.transition);
    if (base.resolution) fd.append('resolution', base.resolution);
    if (base.transition_duration !== undefined) fd.append('transition_duration', String(base.transition_duration));
    fd.append('image', photoFile);
    return { body: fd, form: true };
  }

  return { body: base, form: false };
}

export function buildYouTubePayload({ niche, videoType, topic, mood, style, seed, shots, transition, resolution, transition_duration }) {
  const base = {
    niche,
    videoType,
    mood,
    topic: String(topic || '').trim(),
    style: nonEmpty(style)
  };
  if (seed !== '' && seed !== undefined && seed !== null) base.seed = Number(seed);

  if (Array.isArray(shots) && shots.length > 0) {
    base.shots = cleanShots(shots);
    if (transition) base.transition = transition;
    if (resolution && resolution !== 'source') base.resolution = resolution;
    if (transition_duration !== '' && transition_duration !== undefined && transition_duration !== null) {
      base.transition_duration = Number(transition_duration);
    }
  }
  return { body: base, form: false };
}