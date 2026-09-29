// ---------------------------------------------------------------------------
// API client — the ONLY module that talks to the backend. Every call resolves
// to the unwrapped `data` payload (or the full JSON for /health) and rejects
// with a normalized `{ code, status, message }` error object.
//
// In dev, /api is proxied to http://localhost:1000 by vite.config.js.
// Point VITE_API_BASE at the same origin (`''`) for a static production build.
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api';

// Backend error codes -> friendly, human-readable copy.
const FRIENDLY = {
  MISSING_PROMPT: 'Please enter a text prompt first.',
  INVALID_PROMPT: 'The prompt must be a non-empty string.',
  PROMPT_TOO_LONG: 'Your prompt is too long (max 10,000 characters).',
  MISSING_IMAGE: 'Please provide an image — upload one or reuse the last generated image.',
  INVALID_DIMENSIONS: 'Size must be 512, 768 or 1024 pixels (Turbo model limitation).',
  INVALID_FORMAT: 'Output format must be PNG, JPEG or WEBP.',
  INVALID_RESOLUTION: 'Resolution must be 1024x576, 576x1024 or 768x768.',
  INVALID_CFG_SCALE: 'CFG scale must be between 0 and 10.',
  INVALID_MOTION_BUCKET: 'Motion strength must be between 1 and 255.',
  INVALID_SEED: 'Seed must be between 0 and 4294967294.',
  INVALID_CLIPS: 'Add at least 2 clips to stitch a video.',
  TOO_MANY_CLIPS: 'No more than 20 clips can be stitched at once.',
  CLIP_TOO_LARGE: 'One of the clips exceeds the 25 MB server limit.',
  INVALID_TRANSITION: 'Transition must be cut, fade or dissolve.',
  INVALID_TRANSITION_DURATION: 'Transition duration must be between 0.1 and 2.0 seconds.',
  INVALID_PRODUCT_TYPE: 'Product type must be "physical" or "digital".',
  MISSING_PRODUCT: 'A product is required to generate a marketing video.',
  MISSING_PRODUCT_NAME: 'Please give your product a name.',
  INVALID_NICHE: 'Please pick a valid niche.',
  INVALID_VIDEO_TYPE: 'Please pick a valid video type.',
  INVALID_MOOD: 'Please pick a valid mood.',
  INVALID_SHOTS: 'Shot list needs at least 2 non-empty shots.',
  TOO_MANY_SHOTS: 'No more than 10 shots allowed.',
  MISSING_GENERATION_ID: 'The backend did not return a generation id.',
  GENERATION_NOT_FOUND: 'This generation expired or no longer exists (10 min TTL).',
  JOB_NOT_FOUND: 'This job expired (30 min TTL) or the server restarted.',
  CONTENT_FILTERED: 'The safety filter rejected this prompt. Rephrase and try again.',
  STABILITY_API_ERROR: 'The Stability AI service returned an error — check your API key and credits.',
  CONNECTION_ERROR: 'Could not reach the Stability AI service (503).',
  TIMEOUT_ERROR: 'The Stability AI service timed out. Try again shortly.',
  INVALID_RESPONSE: 'Unexpected response format from the generation service.',
  FFMPEG_NOT_FOUND: 'Stitching is unavailable: no ffmpeg binary on the server. Install ffmpeg-static, set FFMPEG_PATH, or add ffmpeg to PATH.',
  FFMPEG_FAILED: 'Video stitching failed on the server (ffmpeg error).',
  NETWORK_ERROR: 'Cannot reach the backend. Is it running on http://localhost:1000?'
};

export function toFriendly(err) {
  if (!err) return 'An unknown error occurred.';
  if (err.code && FRIENDLY[err.code]) return FRIENDLY[err.code];
  if (err.message && typeof err.message === 'string' && err.message.trim()) return err.message;
  return 'An unknown error occurred.';
}
async function request(path, { method = 'GET', body, form, headers = {} } = {}) {
  let res;
  try {
    const opts = { method, headers: { ...headers } };
    if (form) {
      opts.body = form; // FormData sets its own Content-Type boundary
    } else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch (e) {
    throw {
      code: 'NETWORK_ERROR',
      status: 0,
      message: FRIENDLY.NETWORK_ERROR
    };
  }

  let json = null;
  try { json = await res.json(); } catch (e) { /* non-JSON (empty proxy error etc.) */ }

  if (!res.ok) {
    throw normalizeError(json, res.status);
  }

  // { success: true, data: {...} } → unwrap data
  if (json && json.success === true && Object.prototype.hasOwnProperty.call(json, 'data') && json.data !== undefined) {
    return json.data;
  }
  return json || { status: res.status };
}

function normalizeError(json, status) {
  const base = (json && typeof json === 'object') ? json : {};
  const err = {
    code: base.code || (status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR'),
    status,
    message: base.message || `Request failed (HTTP ${status})`,
    detail: base.details !== undefined ? base.details : json
  };
  if (FRIENDLY[err.code]) err.message = FRIENDLY[err.code];
  if (!err.message && status === 404 && json && json.availableRoutes) {
    err.message = 'That route is not available on the backend.';
  }
  return err;
}

export const api = {
  getHealth: () => request('/health'),
  getModels: () => request('/models'),
  getCampaigns: () => request('/campaigns'),

  generateImage: (body) => request('/generate-image', { method: 'POST', body }),
  generateVideoFromText: (body) => request('/generate-video', { method: 'POST', body }),

  generateVideoFromImage: (formOrJson) => (
    formOrJson instanceof FormData
      ? request('/generate-video/image', { method: 'POST', form: formOrJson })
      : request('/generate-video/image', { method: 'POST', body: formOrJson })
  ),

  startAsyncVideo: (formOrJson) => (
    formOrJson instanceof FormData
      ? request('/generate-video/async', { method: 'POST', form: formOrJson })
      : request('/generate-video/async', { method: 'POST', body: formOrJson })
  ),

  getVideoResult: (id) => request(`/generate-video/result/${encodeURIComponent(id)}`),

  stitchVideos: (body) => request('/generate-video/stitch', { method: 'POST', body }),

  marketingCampaign: (bodyOrForm, isForm = false) => (
    isForm
      ? request('/campaigns/marketing', { method: 'POST', form: bodyOrForm })
      : request('/campaigns/marketing', { method: 'POST', body: bodyOrForm })
  ),

  youtubeCampaign: (body) => request('/campaigns/youtube', { method: 'POST', body }),

  getCampaignJob: (id) => request(`/campaigns/jobs/${encodeURIComponent(id)}`)
};

export default api;