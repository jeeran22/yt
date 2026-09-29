# Stability AI Image & Video Generation Backend (Modular)

A modular Node.js backend API that integrates with **Stability AI** to generate:

- **Images** — Stable Diffusion 3 Turbo (fast, low cost)
- **Videos** — Stable Video Diffusion (image-to-video animation)
- **Text-to-Video** — prompt → keyframe image → animated video (end-to-end)
- **Video Stitching** — merge multiple MP4 clips into one video (server-side ffmpeg, with fade/dissolve transitions & resolution normalization)
- **Use-case campaigns** — turn-key presets for **marketing teams** (physical & digital product promos) and **YouTubers** (intro, b-roll, background loop, outro videos across 10 niches)
- **Multi-shot campaigns** — describe a storyboard of shots; the API generates each clip and stitches them into a single video (async job)

## Features

- **Modular Architecture** — clean separation of controllers, services, config, middleware and validation
- **Image Generation** — Stable Diffusion 3 Turbo (512/768/1024 square keyframes)
- **Video Generation** — Stable Video Diffusion produces ~2s, 24fps MP4 clips from a source image
- **Text-to-Video Pipeline** — describe a scene, get a keyframe image AND an animated video back
- **Async Generation** — videos take ~40s, so the API supports start-and-poll to avoid client timeouts
- **Server-Side Stitching** — lossless `cut` concatenation or ffmpeg `xfade` transitions (fade/dissolve) with optional resolution normalization
- **Multi-Shot Jobs** — campaign `shots[]` creates an async job that generates each clip, stitches them, and exposes `GET /campaigns/jobs/:id`
- **Marketing Campaigns** — curated prompt templates + tuned motion for **physical** and **digital** products
- **YouTube Campaigns** — niche × video-type × mood presets (tech, gaming, cooking, fitness, travel, finance, education, lifestyle, music, beauty)
- **Creative Briefs** — every campaign response includes the exact generated prompt, motion settings and notes so teams can iterate
- **RESTful API** — clean endpoints with structured errors, input validation, request logging and CORS
- **Environment Configuration** — secure API key management

## Architecture

```
src/
├── server.js                    # Main server entry point
├── config/
│   ├── stabilityConfig.js       # API keys, endpoints, model metadata & defaults
│   └── campaignsConfig.js       # Marketing & YouTube campaign presets/templates
├── controllers/
│   ├── imageController.js       # Image generation logic
│   ├── videoController.js       # Text/Image-to-video, async start & poll logic
│   ├── campaignController.js    # Marketing & YouTube campaign logic
│   ├── healthController.js      # Health check logic
│   └── modelController.js       # Model information logic
├── services/
│   ├── stabilityService.js      # Stability AI image API integration
│   ├── videoService.js          # Stability AI video API integration (+ text-to-video pipeline)
│   ├── videoStitchService.js    # ffmpeg clip merging (concat / xfade / normalize)
│   ├── clipStoreService.js      # In-memory multi-shot job store (TTL)
│   └── campaignService.js       # Campaign prompt building, orchestration & job workers
├── routes/
│   ├── imageRoutes.js           # Image generation routes
│   ├── videoRoutes.js           # Video generation routes (multipart uploads)
│   ├── campaignRoutes.js        # Campaign routes
│   ├── healthRoutes.js          # Health check routes
│   └── modelRoutes.js           # Model information routes
├── middleware/
│   ├── errorMiddleware.js       # Error handling middleware
│   └── loggerMiddleware.js      # Request logging middleware
└── utils/
    └── validation.js            # Input validation utilities
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   - Copy `.env.example` to `.env` and add your Stability AI API key.
   - The application uses Stable Diffusion 3 Turbo (images) and Stable Video Diffusion (videos).

3. **Start Server**
   ```bash
   npm start
   ```

The server will start on port `1000`.

## Quick API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/health` | Server + model status |
| `POST` | `/generate-image` | Text → image (SD3 Turbo) |
| `POST` | `/generate-video` | **Text → video** (keyframe + animation) |
| `POST` | `/generate-video/image` | **Image → video** (multipart upload or base64 JSON) |
| `POST` | `/generate-video/async` | Start **async** image-to-video |
| `GET`  | `/generate-video/result/:id` | Poll an **async** generation |
| `POST` | `/generate-video/stitch` | **Merge clips** into one MP4 (cut / fade / dissolve) |
| `POST` | `/campaigns/marketing` | **Product promo video** (physical / digital) — `shots[]` = multi-shot job |
| `POST` | `/campaigns/youtube` | **YouTube niche video** — `shots[]` = multi-shot job |
| `GET`  | `/campaigns/jobs/:id` | Poll a **multi-shot campaign** job |
| `GET`  | `/campaigns` | List all campaign presets |
| `GET`  | `/models` | Image + video model info |

## API Endpoints

### Health Check
```http
GET /health
```
Returns server status, image and video model names, and version.

### Generate Image (Turbo Model) — unchanged
```http
POST /generate-image
Content-Type: application/json

{
  "prompt": "A beautiful sunset over mountains",
  "width": 1024,
  "height": 1024,
  "output_format": "png",
  "seed": 42
}
```
- `prompt` (required) · `width`/`height` (optional, one of `512|768|1024`) · `output_format` (optional, `png|jpeg|webp`) · `seed` (optional)

### Generate Video — Text-to-Video (end-to-end)
Generates a keyframe image from the prompt, then animates it into a ~2s MP4 clip.

```http
POST /generate-video
Content-Type: application/json

{
  "prompt": "A futuristic city with flying cars, slow drone shot",
  "width": 768,
  "height": 768,
  "seed": 42,
  "cfg_scale": 1.8,
  "motion_bucket_id": 127
}
```
- `prompt` (required): describe the scene **and** the motion you want.
- `width`/`height` (optional): keyframe image size — must be `512|768|1024`. Default `768` (matches the video model's square output).
- `cfg_scale` (optional, `0–10`, default `1.8`): how closely the video follows the input image; higher = more faithful but potentially less motion.
- `motion_bucket_id` (optional, `1–255`, default `127`): amount of motion — lower = subtle, higher = dynamic.
- `seed` (optional): reproducibility (used for both the image and video).

**Response:**
```json
{
  "success": true,
  "data": {
    "videoUrl": "data:video/mp4;base64,AAAA...",
    "sourceImage": "data:image/png;base64,BBBB...",
    "prompt": "A futuristic city with flying cars, slow drone shot",
    "dimensions": { "width": 768, "height": 768 },
    "format": "mp4",
    "seed": 42,
    "cfg_scale": 1.8,
    "motion_bucket_id": 127,
    "model": "Stable Video Diffusion",
    "durationSeconds": 2,
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Generate Video — Image-to-Video
Animates a single image into a ~2s MP4 clip. Accepts either a **multipart upload** or a **JSON base64** payload.

**Multipart upload:**
```bash
curl -X POST http://localhost:1000/generate-video/image \
  -F "image=@product.png" \
  -F "motion_bucket_id=90" \
  -F "cfg_scale=1.8"
```

**JSON base64 (e.g. output of `/generate-image`):**
```http
POST /generate-video/image
Content-Type: application/json

{
  "imageBase64": "<base64 or data:image/png;base64,...>",
  "cfg_scale": 1.8,
  "motion_bucket_id": 90,
  "seed": 42
}
```
The source image should have a clear subject and stable composition. JPG and PNG are supported.

### Generate Video — Async (start + poll)
Video generation can take ~40 seconds. For long-running workflows use the async pattern.

```http
POST /generate-video/async
```
Same body as `/generate-video/image`. Returns `202 Accepted`:
```json
{ "success": true, "data": { "id": "abc-123", "status": "processing" } }
```
Then poll until complete:
```http
GET /generate-video/result/:id
```
- While processing → `202` with `{ "success": true, "data": { "complete": false, "status": "processing" } }`
- When finished → `200` with `{ "success": true, "data": { "complete": true, "videoUrl": "data:video/mp4;base64,..." } }`
- Unknown/expired id → `404 GENERATION_NOT_FOUND`

### Generate Video — Stitch clips together (server-side)
Merges 2–20 MP4 clips into a **single downloadable MP4** using ffmpeg. Clips can be the `data:video/mp4;base64,...` outputs from any of the generation endpoints, or raw MP4 uploads (multipart field `clips`).

```http
POST /generate-video/stitch
Content-Type: application/json

{
  "clips": [
    "data:video/mp4;base64,AAAA...",
    "data:video/mp4;base64,BBBB..."
  ],
  "transition": "fade",
  "resolution": "1024x576",
  "transition_duration": 0.5
}
```
- `clips` (required): array of 2–20 base64 MP4 data URLs.
- `transition` (optional, `cut|fade|dissolve`, default `cut`):
  - `cut` → **lossless, instant** concat (all SVD clips share H.264/AAC so no re-encode).
  - `fade` / `dissolve` → ffmpeg `xfade` transition (re-encodes; ~seconds of CPU).
- `resolution` (optional): normalize every clip to `1024x576`, `576x1024`, or `768x768` (scale + pad, re-encode).
- `transition_duration` (optional, `0.1–2.0` seconds, default `0.5`): only used with fade/dissolve.

**Response:**
```json
{
  "success": true,
  "data": {
    "videoUrl": "data:video/mp4;base64,CCCC...",
    "format": "mp4",
    "clipCount": 2,
    "durationSeconds": 3.5,
    "transition": "fade",
    "resolution": "1024x576",
    "model": "Stable Video Diffusion (stitched)",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Why server-side?** the clips originate in the backend, the consumers are diverse (marketing dashboards, creator tools, mobile), and one canonical MP4 from the API serves every client — no client downloads 30MB of wasm or re-processes media. (A client-side playlist works fine for *previewing*, but only the server produces a publishable single file.)

**ffmpeg runtime resolution** (in priority order):
1. `FFMPEG_PATH` environment variable (e.g. a custom binary path)
2. `ffmpeg-static` npm package (bundles a static binary — recommended; installed by default)
3. `ffmpeg` on the system `PATH`

Requires **Node.js 22+** for the `node:child_process` module used to spawn ffmpeg.

## Campaign Endpoints (Use-Cases)

### Marketing Product Promo — `/campaigns/marketing`
Generates a promotional product video. Designed for **physical products** (electronics, fashion, beauty…) and **digital products** (apps, SaaS, online courses…).

```http
POST /campaigns/marketing
Content-Type: application/json

{
  "product": {
    "name": "Aurora Wireless Earbuds",
    "type": "physical",
    "description": "premium noise-cancelling earbuds with 32-hour battery",
    "category": "electronics",
    "imageBase64": "<optional: animate your own photo instead of generating one>",
    "imageFormat": "png"
  },
  "style": {
    "mood": "premium",
    "surface": "a sleek rotating turntable",
    "lighting": "dramatic rim lighting and soft reflections",
    "atmosphere": "gentle haze, floating dust particles, dark elegant backdrop",
    "accent": "cyan",
    "motion_bucket_id": 75,
    "cfg_scale": 2.0
  },
  "seed": 42
}
```

- `product.name` (required) · `product.type` (optional, `physical|digital`, default `physical`)
- `product.description` / `product.category` (optional) — enrich the generated scene
- `product.imageBase64` (optional) — upload a real product photo (or multipart `image` field) to animate **your** asset directly instead of generating a keyframe
- `style.*` (optional) — creative control over the scene and motion

**Response** includes everything needed to review and iterate in a team: the `videoUrl`, `sourceImage`, the exact `prompt` used, and a `creativeBrief` (prompt, recommended motion, notes).

**Tuned defaults per product type:**
| Type | `motion_bucket_id` | `cfg_scale` | Idea |
|------|--------------------|-------------|------|
| physical | 75 (slow turntable) | 2.0 | Cinematic product photography |
| digital | 120 (orbiting UI) | 1.6 | Futuristic holographic reveal |

#### Multi-shot product promos (async job → stitched video)
Pass `shots[]` (2–10 descriptors) to build a **storyboard**: each shot becomes a clip, and the API stitches them into one video via an async job.

```http
POST /campaigns/marketing
Content-Type: application/json

{
  "product": { "name": "Aurora Wireless Earbuds", "type": "physical" },
  "style": { "mood": "premium" },
  "shots": [
    { "mood": "premium",  "camera": "slow turntable", "motion_bucket_id": 60 },
    { "mood": "energetic", "motion_bucket_id": 140, "cfg_scale": 1.6 }
  ],
  "transition": "fade",
  "resolution": "1024x576",
  "seed": 42
}
```

Response `202 Accepted`:
```json
{ "success": true, "data": { "jobId": "8f2e...", "status": "processing", "shotsTotal": 2, "pollUrl": "/campaigns/jobs/8f2e..." } }
```

Poll until complete:
```http
GET /campaigns/jobs/:jobId
```
- `processing` → `{ status, shotsDone, shotsTotal }`
- `completed` → `{ status, result: { videoUrl, clipCount, durationSeconds, transition, resolution, shots: [...] } }`
- `failed` → `{ status, error }` · unknown id → `404 JOB_NOT_FOUND`

Jobs (and their base64 clips) expire after **30 minutes**.

### YouTube Niche Video — `/campaigns/youtube`
Generates a video for a creator channel based on **niche × videoType × mood**.

```http
POST /campaigns/youtube
Content-Type: application/json

{
  "niche": "tech",
  "videoType": "intro",
  "topic": "Top 5 smartphones of 2026",
  "mood": "energetic",
  "style": { "motion_bucket_id": 150, "cfg_scale": 1.6 },
  "seed": 42
}
```

**Available presets** (full list from `GET /campaigns`):
- **Niches:** `tech`, `gaming`, `cooking`, `fitness`, `travel`, `finance`, `education`, `lifestyle`, `music`, `beauty`
- **Video types:** `intro` (channel intro), `b_roll` (cinematic footage), `background_loop` (subtle talking-head backdrop), `outro` (end card vibe), `character_anim` (mascot scene)
- **Moods:** `energetic`, `calm`, `premium`, `dark`

Each niche has a curated visual style injected into the prompt (e.g. `tech → glowing circuit patterns, holographic UI elements...`).

**Response** includes `videoUrl`, `sourceImage`, the generated `prompt`, and a `creativeBrief` with the recommended motion settings.

#### Multi-shot sequences (async job → stitched video)
Combine different video types into one sequence — e.g. `intro` + `b_roll` + `outro` — by passing `shots[]`:

```http
POST /campaigns/youtube
Content-Type: application/json

{
  "niche": "tech",
  "shots": [
    { "videoType": "intro", "topic": "Top 5 phones of 2026", "mood": "energetic", "style": { "motion_bucket_id": 150 } },
    { "videoType": "b_roll", "topic": "Chipset close-up", "mood": "premium" },
    { "videoType": "outro", "topic": "Subscribe for more", "mood": "dark", "style": { "motion_bucket_id": 80 } }
  ],
  "transition": "fade"
}
```
Returns `202` with a `jobId`; poll `GET /campaigns/jobs/:jobId` for the stitched result (same shape as marketing).

### Campaign Presets — `GET /campaigns`
Returns all supported product types, niches, video types, moods, motion settings and video model constraints — perfect for populating a frontend form.

### Get Models Info — `GET /models`
Returns image model (SD3 Turbo) and video model (Stable Video Diffusion) metadata, including supported resolutions and parameter ranges.

## Error Responses

The API returns structured error responses:
```json
{
  "error": "Bad Request",
  "message": "motion_bucket_id must be an integer between 1 and 255",
  "code": "INVALID_MOTION_BUCKET"
}
```

Common error codes:
- `MISSING_PROMPT` / `INVALID_PROMPT` / `PROMPT_TOO_LONG` — prompt issues
- `INVALID_DIMENSIONS` / `INVALID_FORMAT` — image parameter issues
- `MISSING_IMAGE` / `INVALID_RESOLUTION` / `INVALID_SEED` / `INVALID_CFG_SCALE` / `INVALID_MOTION_BUCKET` — video parameter issues
- `INVALID_CLIPS` / `TOO_MANY_CLIPS` / `INVALID_TRANSITION` / `INVALID_TRANSITION_DURATION` — stitch parameter issues
- `FFMPEG_NOT_FOUND` — no ffmpeg binary found (install `ffmpeg-static` or set `FFMPEG_PATH`)
- `FFMPEG_ERROR` — ffmpeg failed to merge the clips (check `details`)
- `INVALID_SHOTS` / `TOO_MANY_SHOTS` — multi-shot campaign issues
- `MISSING_PRODUCT` / `MISSING_PRODUCT_NAME` / `INVALID_PRODUCT_TYPE` — marketing campaign issues
- `MISSING_NICHE` / `INVALID_NICHE` / `INVALID_VIDEO_TYPE` / `INVALID_TOPIC` / `INVALID_MOOD` — YouTube campaign issues
- `JOB_NOT_FOUND` — polling an unknown/expired multi-shot campaign job
- `CONTENT_FILTERED` — video blocked by safety filters
- `GENERATION_NOT_FOUND` — polling an unknown async generation id
- `STABILITY_API_ERROR` / `CONNECTION_ERROR` / `TIMEOUT_ERROR` — upstream service issues

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STABILITY_API_KEY` | Your Stability AI API key | Yes |
| `PORT` | Server port (default: 1000) | No |
| `FFMPEG_PATH` | Path to an ffmpeg binary (overrides `ffmpeg-static`) | No |

## Requirements

- Node.js **22+** (uses global `fetch`/`FormData`/`Blob` **and** `node:child_process` for ffmpeg)
- Stability AI API key with image **and** video credits
- `ffmpeg-static` (installed by default) — or set `FFMPEG_PATH` to a custom binary / rely on a system `ffmpeg`
- Internet connection for API calls

## Testing

A smoke test suite runs the full request flow **without calling the real (paid) API** — the Stability endpoints are stubbed via a fake `fetch`, and a stub ffmpeg script stands in for the binary so stitching is exercised safely on any machine:

```bash
npm test
```

It verifies all endpoints, validation rules, the text-to-video pipeline, async start/poll, clip stitching, and campaign responses (29 checks).

## Notes & Limitations

- **Clip length:** each video is ~2 seconds (25 generated frames + 24 interpolated @ 24fps). Use `/generate-video/stitch` or campaign `shots[]` to assemble longer videos server-side.
- **Stitch duration math** assumes 2-second clips: `cut` totals `N × 2s`; `fade`/`dissolve` totals `N × 2s − (N−1) × transition_duration`.
- **Multi-shot jobs** hold clips in memory and expire after 30 minutes. This is a single-process, non-persistent store — swap `clipStoreService` for Redis/DB when running multiple instances.
- **Watermark:** output from the Stability platform API is watermarked.
- **Aspect ratio:** stable image generation produces square keyframes, so the default text-to-video output is 768×768. For true 16:9 / 9:16 results, provide a landscape/portrait image through `/generate-video/image`, the campaign image upload, or normalize with `/generate-video/stitch`'s `resolution` option.
- **Motion control:** low `motion_bucket_id` = subtle motion, high = dynamic. High `cfg_scale` = faithful to the image but can reduce motion quality.
- **Costs:** each text-to-video call consumes image **(SD3 Turbo)** + video **(SVD)** credits; stitching is local ffmpeg and costs nothing but CPU.

## License

ISC