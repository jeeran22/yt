# Stability Studio — Frontend

A single-page web app for the **Stability AI Image & Video Studio** backend in the
parent folder. Marketing teams and YouTubers can generate images, text-to-video,
image-to-video, stitch clips, and run single or multi-shot campaign videos —
all with a theme-switchable UI.

Built with **React 18 + Vite 5**, plain `fetch()` (no axios) and **plain CSS with
CSS-variable theming** (8 built-in themes).

---

## Quick start

> Requires Node **>= 20** (Vite 5).

```bash
# 1. Make sure the backend is running on port 1000
#    (from the repo root):
#    npm install && npm run dev
#    → creates .env with STABILITY_API_KEY if needed

# 2. Start the frontend dev server
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

The Vite dev server proxies every request under `/api` to the backend at
`http://localhost:1000` (with the `/api` prefix stripped), so there is no CORS
configuration needed.

## Production build

```bash
cd frontend
npm run build     # outputs to frontend/dist
npm run preview   # serve the production build locally
```

Set `VITE_API_BASE` at build time to point at a backend prefix if you deploy the
static build somewhere other than behind the `/api` proxy:

```bash
# example: same-origin static deployment served by the backend itself
VITE_API_BASE='' npm run build
```

## Structure

```
frontend/
├── index.html              # shell + pre-paint theme bootstrap (no flash)
├── vite.config.js          # /api → http://localhost:1000 dev proxy
├── src/
│   ├── main.jsx            # entry, tab router (#/hash), header, theme picker,
│   │                       # health banner + global job poller
│   ├── api/
│   │   ├── client.js       # all backend calls, unwraps {data}, error→friendly copy
│   │   └── endpoints.js    # payload builders (match controllers exactly)
│   ├── lib/
│   │   ├── media.js        # dataURL ↔ Blob ↔ objectURL, downloads
│   │   ├── polling.js      # poll-with-backoff helper
│   │   ├── presets.js      # cached GET /models + GET /campaigns (with fallbacks)
│   │   ├── jobs.js         # in-memory job registry (202 async jobs, retry/TTL)
│   │   ├── library.js      # in-memory clip library for Stitch Studio
│   │   ├── shared.js       # handoff: Image Gen → Image-to-Video
│   │   ├── theme.js        # theme list + persistence (localStorage)
│   │   ├── persist.js      # localStorage form history per tool
│   │   ├── utils.js        # slug / time / seed helpers
│   │   └── useRun.js       # busy/error/result hook used by every view
│   ├── components/         # SliderField, SelectField, NumberField, TextField,
│   │                       # TextAreaField, SegmentedControl, Spinner, ErrorBox,
│   │                       # FileDrop, MediaPreview, ProgressBar, ShotListBuilder,
│   │                       # CreativeBrief, EmptyState, ThemePicker
│   ├── views/
│   │   ├── ImageGen.jsx            # A — prompt → image, “Animate this image →”
│   │   ├── TextToVideo.jsx         # B — prompt → keyframe → clip
│   │   ├── ImageToVideo.jsx        # C — file upload or reuse image, sync/async
│   │   ├── StitchStudio.jsx        # D — clip library + uploads → merged MP4
│   │   ├── CampaignMarketing.jsx   # E — product promo (single or shot sequence)
│   │   ├── CampaignYouTube.jsx     # F — niche videos (single or shot sequence)
│   │   └── JobsPanel.jsx           # G — all async jobs: status, progress, retry
│   └── styles.css          # CSS variables + theme palettes + layout
```

## Themes

Open the **palette button in the header** (next to the Jobs shortcut) to switch
themes instantly:

`Dark Studio` (default) · `Light` · `Midnight` · `Amethyst` · `Solarized` ·
`OLED Black` · `Synthwave` · `Sepia Paper`

The choice is stored in `localStorage` (`studio-theme`). On the very first visit
the app follows the OS `prefers-color-scheme`. `index.html` applies the saved
theme before first paint so there is no flash of the wrong palette.

## Key UX behaviour

- **Async-first:** long operations (async image-to-video, multi-shot campaigns)
  are never awaited inline. They return a 202, get registered in the in-memory
  **Jobs Panel**, and are polled every 2s with progress bars
  (shots done / total) and a 30-minute TTL warning. Failed jobs offer **retry**
  with the exact same payload.
- **Clip library:** videos generated anywhere can be added to the in-memory
  library (`+ Add to clip library`) and assembled in Stitch Studio (order,
  transitions, resolution).
- **Image handoff:** “Animate this image →” in Image Gen drops the image into
  Image-to-Video.
- **Smart forms:** every tool remembers its inputs in localStorage; sliders show
  live values; seeds have a 🎲 randomize button; client-side checks stop bad
  requests before they hit the backend.
- **Friendly errors:** backend error codes (`INVALID_*`, `MISSING_*`,
  `FFMPEG_*`, `JOB_NOT_FOUND`, `CONTENT_FILTERED`, …) are mapped to readable
  copy with the original code shown as a chip.

## Notes

- No database/auth — the frontend calls the key-secured backend directly.
- Generated assets live only in browser memory (per session); jobs and clips do
  not survive a page refresh.
- The backend keeps multi-shot job results for **30 minutes** (polls extend the
  TTL); async Stability video generations expire after ~10 minutes.