# Stability Studio — Next.js Frontend (`frontend-next/`)

Production-ready **Next.js 15 (App Router) + TypeScript + Tailwind + TanStack Query** dashboard
for the Stability AI video engine in the repo root. Existing Vite app in `frontend/` is untouched.

## Design language
- Dark graphite `#090D16`, slate borders, **Electric Cyan `#06B6D4`** for Product Promo,
  **Vivid Purple `#A855F7`** for YouTube Creator Hub.
- Card ring + hover micro-interaction, glow shadows, pulsing loaders, skeleton shimmer.

## Run
```bash
# backend first (repo root)
npm install
npm run dev        # :1000

# frontend
cd frontend-next
npm install
npm run dev        # :3000 — /api rewrites to http://localhost:1000
npm run build && npm start   # production
```

## What was built (maps 1:1 to `frontend_development_plan.md`)
1. **Universal Campaign Form** — split-screen workspace. Left controls read live presets
   from `GET /campaigns` (cached 5 min, backend-mirrored fallbacks). Sub-tabs:
   *Product Promo* (physical/digital, image dropzone → compressed base64, name/desc/
   surface/lighting fields) and *YouTube Creator Hub* (niche grid, video-type pills, mood).
   Motion (1–255) + CFG (0–10) sliders with live badges + micro-copy hints.
2. **Storyboard Timeline** — horizontal drag-and-drop filmstrip (dnd-kit, up to 10 shots),
   per-shot summary + edit drawer with inherit-empty overrides, sticky toolbar with
   transition (cut/fade/dissolve), duration slider (0.1–2s), resolution normalize,
   live runtime estimate.
3. **Async pipeline + Preview Canvas** — TanStack Query polls
   `/campaigns/jobs/:id` and `/generate-video/result/:id` every 2.5s with delta backoff
   to 5s; shimmer loader + `Rendering shot X of Y…`; completed → native `<video>`,
   download link, toggleable **Creative Brief** pane (prompt, seed, notes).

## Guardrails
- Client validation blocks bad dispatches (empty prompt/topic/name, motion/CFG range,
  stitch 2–20, shots ≤10, transition duration 0.1–2s) with toasts + inline errors.
- Uploads compressed in-browser (max 1024px canvas) before base64.
- Backend error codes (`CONTENT_FILTERED`, `FFMPEG_*`, `JOB_NOT_FOUND`…) mapped to
  friendly copy with the raw code shown.
