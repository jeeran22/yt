import type { ApiErrorShape } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export const FRIENDLY: Record<string, string> = {
  MISSING_PROMPT: "Please enter a text prompt first.",
  INVALID_PROMPT: "The prompt must be a non-empty string.",
  PROMPT_TOO_LONG: "Your prompt is too long (max 10,000 characters).",
  MISSING_IMAGE: "Please upload an image first.",
  INVALID_DIMENSIONS: "Size must be 512, 768 or 1024 px.",
  INVALID_FORMAT: "Output format must be PNG, JPEG or WEBP.",
  INVALID_RESOLUTION: "Resolution must be 1024x576, 576x1024 or 768x768.",
  INVALID_CFG_SCALE: "CFG scale must be between 0 and 10.",
  INVALID_MOTION_BUCKET: "Motion strength must be between 1 and 255.",
  INVALID_SEED: "Seed must be between 0 and 4294967294.",
  INVALID_CLIPS: "Add at least 2 clips to stitch a video.",
  TOO_MANY_CLIPS: "No more than 20 clips can be stitched at once.",
  CLIP_TOO_LARGE: "One of the clips exceeds the 25 MB server limit.",
  INVALID_TRANSITION: "Transition must be cut, fade or dissolve.",
  INVALID_TRANSITION_DURATION: "Transition duration must be 0.1 - 2.0 s.",
  MISSING_PRODUCT_NAME: "Please give your product a name.",
  INVALID_NICHE: "Please pick a valid niche.",
  INVALID_VIDEO_TYPE: "Please pick a valid video type.",
  INVALID_MOOD: "Please pick a valid mood.",
  INVALID_SHOTS: "Shot list needs at least 2 non-empty shots.",
  TOO_MANY_SHOTS: "No more than 10 shots allowed.",
  GENERATION_NOT_FOUND: "This generation expired (10 min TTL).",
  JOB_NOT_FOUND: "This job expired (30 min TTL) or the server restarted.",
  CONTENT_FILTERED: "Safety filter rejected this prompt - rephrase and retry.",
  STABILITY_API_ERROR: "Stability AI error - check API key and credits.",
  FFMPEG_NOT_FOUND: "Server has no ffmpeg - stitching unavailable.",
  NETWORK_ERROR: "Cannot reach the backend. Is it running on :1000?",
};

export function toFriendly(err: unknown): string {
  const e = err as Partial<ApiErrorShape> | null;
  if (!e) return "Something went wrong.";
  if (e.code && FRIENDLY[e.code]) return FRIENDLY[e.code];
  if (typeof e.message === "string" && e.message.trim()) return e.message;
  return "Something went wrong.";
}
async function request<T>(path: string, init?: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  let res: Response;
  try {
    const opts: RequestInit = { method: init?.method || "GET" };
    if (init?.form) opts.body = init.form;
    else if (init?.body !== undefined) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(init.body);
    }
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    throw { code: "NETWORK_ERROR", status: 0, message: FRIENDLY.NETWORK_ERROR };
  }
  let json: unknown = null;
  try { json = await res.json(); } catch { /* non-json */ }
  if (!res.ok) {
    const base = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    const code = typeof base.code === "string" ? base.code : res.status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR";
    const msg = FRIENDLY[code] || (typeof base.message === "string" ? base.message : `Request failed (${res.status})`);
    throw { code, status: res.status, message: msg, details: (base.details ?? json) };
  }
  const j = json as { success?: boolean; data?: unknown } | null;
  if (j && j.success === true && Object.prototype.hasOwnProperty.call(j, "data")) return j.data as T;
  return (json ?? { status: res.status }) as T;
}

export const api = {
  getHealth: () => request<{ service: string; version?: string; model: string; videoModel: string }>("/health"),
  getModels: () => request<import("./types").ModelInfo>("/models"),
  getCampaigns: () => request<import("./types").CampaignPresets>("/campaigns"),
  generateImage: (body: unknown) => request<any>("/generate-image", { method: "POST", body }),
  generateVideoFromText: (body: unknown) => request<any>("/generate-video", { method: "POST", body }),
  generateVideoFromImage: (p: FormData | Record<string, unknown>) =>
    p instanceof FormData ? request<any>("/generate-video/image", { method: "POST", form: p }) : request<any>("/generate-video/image", { method: "POST", body: p }),
  startAsyncVideo: (p: FormData | Record<string, unknown>) =>
    p instanceof FormData ? request<any>("/generate-video/async", { method: "POST", form: p }) : request<any>("/generate-video/async", { method: "POST", body: p }),
  getVideoResult: (id: string) => request<any>(`/generate-video/result/${encodeURIComponent(id)}`),
  stitchVideos: (body: unknown) => request<any>("/generate-video/stitch", { method: "POST", body }),
  marketingCampaign: (p: FormData | Record<string, unknown>) =>
    p instanceof FormData ? request<any>("/campaigns/marketing", { method: "POST", form: p }) : request<any>("/campaigns/marketing", { method: "POST", body: p }),
  youtubeCampaign: (body: unknown) => request<any>("/campaigns/youtube", { method: "POST", body }),
  getCampaignJob: (id: string) => request<any>(`/campaigns/jobs/${encodeURIComponent(id)}`),
};

export default api;

