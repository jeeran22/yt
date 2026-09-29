/**
 * SMOKE TEST SUITE — validates the full request flow WITHOUT calling the
 * real (paid) Stability AI API.
 *
 * It stubs global.fetch with deterministic canned responses for the
 * Stability endpoints and makes real HTTP requests against the local
 * Express server. Run with:
 *
 *   npm test    (or)    node tests/smoke.js
 */

process.env.STABILITY_API_KEY = 'test-api-key';
process.env.PORT = '4871';
// Point the stitch service at the fake ffmpeg so CI-safe tests exercise
// the full stitch flow (temp files -> execFile -> merged output) without
// a real ffmpeg installation.
process.env.FFMPEG_PATH = 'node tests/stubs/stubFfmpeg.cjs';

const originalFetch = global.fetch;

const BASE = `http://localhost:${process.env.PORT}`;
const FAKE_IMAGE_B64 = Buffer.from('fake-png-bytes-for-testing-0123456789').toString('base64');
const FAKE_VIDEO_B64 = Buffer.from('fake-mp4-bytes-for-testing-0123456789').toString('base64');

// ---------------------------------------------------------------------------
// Stability API stub
// ---------------------------------------------------------------------------

let videoPostCount = 0;
const ASYNC_POST_NUMBER = 3; // 3rd POST to image-to-video simulates an async start

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Map([['content-type', 'application/json']]),
  json: async () => body,
  arrayBuffer: async () => { throw new Error('binary response not expected here'); }
});

global.fetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const u = String(url);

  // Pass local HTTP calls through to the real server
  if (u.startsWith(BASE)) {
    return originalFetch(url, options);
  }

  if (u.includes('/v2beta/stable-image/generate/sd3')) {
    return jsonResponse({ image: FAKE_IMAGE_B64, seed: 7 });
  }

  if (u.includes('/v2beta/image-to-video')) {
    if (method === 'GET') {
      return jsonResponse({ video: FAKE_VIDEO_B64, finish_reason: 'SUCCESS', seed: 42 });
    }
    videoPostCount += 1;
    if (videoPostCount === ASYNC_POST_NUMBER) {
      return jsonResponse({ id: 'test-gen-id-123', status: 'processing' }, 202);
    }
    return jsonResponse({ video: FAKE_VIDEO_B64, finish_reason: 'SUCCESS', seed: 42 });
  }

  throw new Error(`Unexpected fetch: ${method} ${u}`);
};

// ---------------------------------------------------------------------------
// Test framework
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const fetchJson = async (method, path, body) => {
  const res = await originalFetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, body: await res.json() };
};

const fetchForm = async (method, path, formData) => {
  const res = await originalFetch(BASE + path, { method, body: formData });
  return { status: res.status, body: await res.json() };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('\n🚀 Starting smoke tests (Stability API is stubbed)...\n');

  // Boot the server (validateApiKey requires the env var set above)
  require('../src/server');
  await sleep(600);

  // 1. Health & models
  console.log('\n[health & models]');
  const health = await fetchJson('GET', '/health');
  check('GET /health → 200 healthy', health.status === 200 && health.body.status === 'healthy', JSON.stringify(health));

  const models = await fetchJson('GET', '/models');
  check('GET /models → image + video info',
    models.status === 200 &&
    models.body.data.currentModel === 'Stable Diffusion 3 Turbo' &&
    models.body.data.video.name === 'Stable Video Diffusion',
    JSON.stringify(models.body));

  // 2. Campaign presets
  console.log('\n[campaign presets]');
  const presets = await fetchJson('GET', '/campaigns');
  check('GET /campaigns → presets',
    presets.status === 200 &&
    presets.body.data.marketing.productTypes.length === 2 &&
    presets.body.data.youtube.niches.length === 10,
    JSON.stringify(presets.body));

  // 3. Text-to-video
  console.log('\n[text-to-video]');
  const ttv = await fetchJson('POST', '/generate-video', {
    prompt: 'A soft drink can rotating slowly on a glossy turntable, studio lighting',
    width: 768,
    height: 768
  });
  check('POST /generate-video → 200 with data URL video',
    ttv.status === 200 &&
    ttv.body.data.videoUrl.startsWith('data:video/mp4;base64,') &&
    ttv.body.data.sourceImage.startsWith('data:image/png;base64,') &&
    ttv.body.data.model === 'Stable Video Diffusion',
    JSON.stringify(ttv.body).substring(0, 300));

  const ttvMissing = await fetchJson('POST', '/generate-video', {});
  check('POST /generate-video {} → 400 MISSING_PROMPT',
    ttvMissing.status === 400 && ttvMissing.body.code === 'MISSING_PROMPT',
    JSON.stringify(ttvMissing.body));

  const ttvBadMotion = await fetchJson('POST', '/generate-video', { prompt: 'test', motion_bucket_id: 999 });
  check('POST /generate-video invalid motion_bucket_id → 400',
    ttvBadMotion.status === 400 && ttvBadMotion.body.code === 'INVALID_MOTION_BUCKET',
    JSON.stringify(ttvBadMotion.body));

  // 4. Image-to-video (multipart upload)
  console.log('\n[image-to-video]');
  const form = new FormData();
  form.append('image', new Blob([Buffer.from(FAKE_IMAGE_B64, 'base64')], { type: 'image/png' }), 'product.png');
  form.append('motion_bucket_id', '60');
  form.append('cfg_scale', '1.5');
  const itv = await fetchForm('POST', '/generate-video/image', form);
  check('POST /generate-video/image (multipart, string numbers) → 200',
    itv.status === 200 &&
    itv.body.data.videoUrl.startsWith('data:video/mp4;base64,') &&
    itv.body.data.motion_bucket_id === 60 &&
    itv.body.data.cfg_scale === 1.5,
    JSON.stringify(itv.body).substring(0, 300));

  const itvBad = await fetchJson('POST', '/generate-video/image', {});
  check('POST /generate-video/image {} → 400 MISSING_IMAGE',
    itvBad.status === 400 && itvBad.body.code === 'MISSING_IMAGE',
    JSON.stringify(itvBad.body));

  // 5. Async generation
  console.log('\n[async generation]');
  const formA = new FormData();
  formA.append('image', new Blob([Buffer.from(FAKE_IMAGE_B64, 'base64')], { type: 'image/png' }), 'input.png');
  const started = await fetchForm('POST', '/generate-video/async', formA);
  check('POST /generate-video/async → 202 with generation id',
    started.status === 202 && started.body.data.id === 'test-gen-id-123',
    JSON.stringify(started.body));

  const polled = await fetchJson('GET', '/generate-video/result/test-gen-id-123');
  check('GET /generate-video/result/:id → completed video',
    polled.status === 200 && polled.body.data.complete === true &&
    polled.body.data.videoUrl.startsWith('data:video/mp4;base64,'),
    JSON.stringify(polled.body).substring(0, 300));

  // 6. Marketing campaign
  console.log('\n[marketing campaigns]');
  const mkt = await fetchJson('POST', '/campaigns/marketing', {
    product: {
      name: 'Aurora Wireless Earbuds',
      type: 'physical',
      description: 'premium noise-cancelling earbuds with 32-hour battery'
    },
    style: { mood: 'premium' }
  });
  check('POST /campaigns/marketing → 200 with creative brief',
    mkt.status === 200 &&
    mkt.body.data.campaign === 'marketing' &&
    mkt.body.data.videoUrl.startsWith('data:video/mp4;base64,') &&
    !!mkt.body.data.creativeBrief &&
    mkt.body.data.motion.motion_bucket_id === 75,
    JSON.stringify(mkt.body).substring(0, 300));

  const mktImg = await fetchJson('POST', '/campaigns/marketing', {
    product: { name: 'Fitness Tracker App', type: 'digital', imageBase64: FAKE_IMAGE_B64, imageFormat: 'png' }
  });
  check('POST /campaigns/marketing with product image → animates it directly',
    mktImg.status === 200 &&
    mktImg.body.data.campaign === 'marketing' &&
    mktImg.body.data.sourceImage !== null,
    JSON.stringify(mktImg.body).substring(0, 300));

  const mktBad = await fetchJson('POST', '/campaigns/marketing', {});
  check('POST /campaigns/marketing {} → 400 MISSING_PRODUCT',
    mktBad.status === 400 && mktBad.body.code === 'MISSING_PRODUCT',
    JSON.stringify(mktBad.body));

  const mktBadType = await fetchJson('POST', '/campaigns/marketing', { product: { name: 'X', type: 'hologram' } });
  check('POST /campaigns/marketing invalid type → 400 INVALID_PRODUCT_TYPE',
    mktBadType.status === 400 && mktBadType.body.code === 'INVALID_PRODUCT_TYPE',
    JSON.stringify(mktBadType.body));

  // 7. YouTube campaign
  console.log('\n[youtube campaigns]');
  const yt = await fetchJson('POST', '/campaigns/youtube', {
    niche: 'tech',
    videoType: 'intro',
    topic: 'Top 5 smartphones of 2026',
    mood: 'energetic'
  });
  check('POST /campaigns/youtube → 200 with niche-flavoured prompt',
    yt.status === 200 &&
    yt.body.data.campaign === 'youtube' &&
    yt.body.data.niche === 'tech' &&
    yt.body.data.prompt.includes('holographic UI elements'),
    JSON.stringify(yt.body).substring(0, 300));

  const ytBad = await fetchJson('POST', '/campaigns/youtube', { niche: 'alien-tech' });
  check('POST /campaigns/youtube invalid niche → 400 INVALID_NICHE',
    ytBad.status === 400 && ytBad.body.code === 'INVALID_NICHE',
    JSON.stringify(ytBad.body));

  // 8. Image-to-video via JSON base64 (no multipart)
  console.log('\n[json base64 image]');
  const itvJson = await fetchJson('POST', '/generate-video/image', { imageBase64: FAKE_IMAGE_B64 });
  check('POST /generate-video/image (JSON imageBase64) → 200',
    itvJson.status === 200 && itvJson.body.data.videoUrl.startsWith('data:video/mp4;base64,'),
    JSON.stringify(itvJson.body).substring(0, 300));

  // 9. 404 listing
  console.log('\n[404]');
  const nf = await fetchJson('GET', '/does-not-exist');
  check('GET unknown → 404 with updated route list',
    nf.status === 404 && nf.body.availableRoutes.includes('POST /generate-video'),
    JSON.stringify(nf.body));

  // 10. Stitch endpoint (ffmpeg is stubbed via stubFfmpeg.cjs)
  console.log('\n[stitch]');
  const CLIP_A = `data:video/mp4;base64,${FAKE_VIDEO_B64}`;
  const CLIP_B = `data:video/mp4;base64,${Buffer.from('second-fake-mp4-9876543210').toString('base64')}`;

  const stitchCut = await fetchJson('POST', '/generate-video/stitch', {
    clips: [CLIP_A, CLIP_B],
    transition: 'cut'
  });
  check('POST /generate-video/stitch (cut, 2 clips) → 200 merged',
    stitchCut.status === 200 &&
    stitchCut.body.data.videoUrl.startsWith('data:video/mp4;base64,') &&
    stitchCut.body.data.clipCount === 2 &&
    stitchCut.body.data.durationSeconds === 4,
    JSON.stringify(stitchCut.body).substring(0, 300));

  const stitchFade = await fetchJson('POST', '/generate-video/stitch', {
    clips: [CLIP_A, CLIP_B, CLIP_A],
    transition: 'fade',
    resolution: '1024x576',
    transition_duration: 0.5
  });
  check('POST /generate-video/stitch (fade + normalize) → 200, duration 5',
    stitchFade.status === 200 &&
    stitchFade.body.data.clipCount === 3 &&
    stitchFade.body.data.durationSeconds === 5 &&
    stitchFade.body.data.resolution === '1024x576',
    JSON.stringify(stitchFade.body).substring(0, 300));

  const stitchBadClips = await fetchJson('POST', '/generate-video/stitch', { clips: [CLIP_A] });
  check('POST /generate-video/stitch 1 clip → 400 INVALID_CLIPS',
    stitchBadClips.status === 400 && stitchBadClips.body.code === 'INVALID_CLIPS',
    JSON.stringify(stitchBadClips.body));

  const stitchBadTransition = await fetchJson('POST', '/generate-video/stitch', { clips: [CLIP_A, CLIP_B], transition: 'warp' });
  check('POST /generate-video/stitch bad transition → 400 INVALID_TRANSITION',
    stitchBadTransition.status === 400 && stitchBadTransition.body.code === 'INVALID_TRANSITION',
    JSON.stringify(stitchBadTransition.body));

  const stitchBadResolution = await fetchJson('POST', '/generate-video/stitch', { clips: [CLIP_A, CLIP_B], resolution: '999x999' });
  check('POST /generate-video/stitch bad resolution → 400 INVALID_RESOLUTION',
    stitchBadResolution.status === 400 && stitchBadResolution.body.code === 'INVALID_RESOLUTION',
    JSON.stringify(stitchBadResolution.body));

  // 11. Multi-shot campaigns (async jobs)
  console.log('\n[multi-shot campaigns]');
  const mktJob = await fetchJson('POST', '/campaigns/marketing', {
    product: { name: 'Aurora Wireless Earbuds', type: 'physical' },
    style: { mood: 'premium' },
    shots: [{ mood: 'premium' }, { mood: 'energetic' }],
    transition: 'fade'
  });
  check('POST /campaigns/marketing with shots → 202 job id',
    mktJob.status === 202 && !!mktJob.body.data.jobId && mktJob.body.data.shotsTotal === 2,
    JSON.stringify(mktJob.body));

  let mktPoll = { body: { data: { status: 'queued' } } };
  for (let i = 0; i < 30; i++) {
    await sleep(150);
    mktPoll = await fetchJson('GET', `/campaigns/jobs/${mktJob.body.data.jobId}`);
    if (mktPoll.body.data.status === 'completed' || mktPoll.body.data.status === 'failed') break;
  }
  check('GET /campaigns/jobs/:id (marketing) → completed stitched video',
    mktPoll.body.data.status === 'completed' &&
    mktPoll.body.data.result.videoUrl.startsWith('data:video/mp4;base64,') &&
    mktPoll.body.data.result.clipCount === 2 &&
    mktPoll.body.data.result.shots.length === 2 &&
    mktPoll.body.data.result.transition === 'fade',
    JSON.stringify(mktPoll.body).substring(0, 300));

  const ytJob = await fetchJson('POST', '/campaigns/youtube', {
    niche: 'tech',
    shots: [{ videoType: 'intro', topic: 'Unboxing the phone' }, { videoType: 'b_roll', topic: 'Chipset close-up' }]
  });
  check('POST /campaigns/youtube with shots → 202 job id',
    ytJob.status === 202 && ytJob.body.data.shotsTotal === 2,
    JSON.stringify(ytJob.body));

  let ytPoll = { body: { data: { status: 'queued' } } };
  for (let i = 0; i < 30; i++) {
    await sleep(150);
    ytPoll = await fetchJson('GET', `/campaigns/jobs/${ytJob.body.data.jobId}`);
    if (ytPoll.body.data.status === 'completed' || ytPoll.body.data.status === 'failed') break;
  }
  check('GET /campaigns/jobs/:id (youtube) → completed with 2 shots',
    ytPoll.body.data.status === 'completed' && ytPoll.body.data.result.clipCount === 2,
    JSON.stringify(ytPoll.body).substring(0, 300));

  const missingJob = await fetchJson('GET', '/campaigns/jobs/does-not-exist');
  check('GET /campaigns/jobs/does-not-exist → 404 JOB_NOT_FOUND',
    missingJob.status === 404 && missingJob.body.code === 'JOB_NOT_FOUND',
    JSON.stringify(missingJob.body));

  const mktBadShots = await fetchJson('POST', '/campaigns/marketing', { product: { name: 'X' }, shots: [{}] });
  check('POST /campaigns/marketing bad shots → 400 INVALID_SHOTS',
    mktBadShots.status === 400 && mktBadShots.body.code === 'INVALID_SHOTS',
    JSON.stringify(mktBadShots.body));


  // -------------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('='.repeat(60) + '\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});