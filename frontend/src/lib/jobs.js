// ---------------------------------------------------------------------------
// Jobs registry (in-memory, per session).
//
// Long-running operations must NEVER be awaited inline:
//   1. Call the /async or /campaigns/* endpoint which answers 202 + an id.
//   2. Register the job here (submit happens once at registration).
//   3. A global poller (main.jsx) refreshes active jobs every 2s.
//   4. JobsPanel renders whatever is in this registry.
//
// Jobs also carry everything needed to RETRY (re-submit the exact same body).
// ---------------------------------------------------------------------------

import api from '../api/client.js';

export const JOB_TTL_MS = 30 * 60 * 1000; // backend expires jobs after 30 min

let jobs = [];
let listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit() {
  listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
}

function uuid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'job-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// type: 'video' | 'marketing' | 'youtube'
// body: plain object (JSON) or FormData (multipart), exact same payload the
//       endpoint expects — it is kept around for retries.
export function register({ type, title, body }) {
  const job = {
    id: uuid(),
    type,
    kind: type === 'video' ? 'video' : 'campaign',
    title,
    status: 'starting',           // starting → submitting → queued/processing → completed/failed/expired
    shotsTotal: 1,
    shotsDone: 0,
    pollPath: null,
    result: null,
    error: null,
    body,
    startedAt: Date.now(),
    _interval: 2000,              // backoff starts at 2s and grows to 5s
    _nextPoll: 0
  };
  jobs.unshift(job);
  emit();
  // The initial submission is kicked off right away. `ready` resolves when the
  // backend has answered (202 + id, or a synchronous 200 result).
  const ready = submit(job);
  return { job, ready };
}

async function submit(job) {
  job.status = 'submitting';
  emit();
  try {
    let data;
    if (job.type === 'video') {
      data = await api.startAsyncVideo(job.body);
    } else if (job.type === 'marketing') {
      data = await api.marketingCampaign(job.body, job.body instanceof FormData);
    } else {
      data = await api.youtubeCampaign(job.body);
    }

    if (data && data.jobId) {
      // Campaign multi-shot job -> 202 { jobId, status, shotsTotal, pollUrl }
      job.id = data.jobId;
      job.status = data.status || 'queued';
      job.shotsTotal = data.shotsTotal || job.shotsTotal;
      job.shotsDone = 0;
      job.pollPath = data.pollUrl;
    } else if (data && data.id) {
      // Async video generation -> 202 { id, status }
      job.id = data.id;
      job.status = data.status || 'processing';
      job.pollPath = `/generate-video/result/${encodeURIComponent(data.id)}`;
    } else {
      // Some accounts respond synchronously with the final video.
      job.status = 'completed';
      job.result = data;
    }
  } catch (e) {
    job.status = 'failed';
    job.error = e;
  }
  emit();
}

// Called by the global poller in main.jsx. Backs off from 2s up to 5s per job.
export async function refreshJob(job) {
  if (!job || ['completed', 'failed', 'expired'].includes(job.status)) return;

  const now = Date.now();
  if (job._nextPoll && now < job._nextPoll) return;
  job._interval = Math.min((job._interval || 2000) * 1.25, 5000);
  job._nextPoll = now + job._interval;

  try {
    if (job.kind === 'video') {
      const data = await api.getVideoResult(job.id);
      if (data && data.complete) {
        job.status = 'completed';
        job.result = data;
      } else {
        job.status = 'processing';
      }
    } else {
      const data = await api.getCampaignJob(job.id);
      job.status = data.status || job.status;
      job.shotsTotal = data.shotsTotal || job.shotsTotal;
      job.shotsDone = data.shotsDone || job.shotsDone;
      if (data.result) {
        job.result = data.result;
        job.status = 'completed';
      }
      if (data.error) {
        job.status = 'failed';
        job.error = typeof data.error === 'string' ? { message: data.error } : data.error;
      }
    }
  } catch (e) {
    if (e.code === 'JOB_NOT_FOUND' || e.code === 'GENERATION_NOT_FOUND' || (e.status === 404)) {
      job.status = 'expired';
      job.error = e;
    }
    // transient errors are kept silent — the next poll may succeed
  }
  emit();
}

export function retryJob(id) {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  job.status = 'starting';
  job.error = null;
  job.result = null;
  job.shotsDone = 0;
  job.shotsTotal = 1;
  emit();
  submit(job);
}

export function removeJob(id) {
  jobs = jobs.filter((j) => j.id !== id);
  emit();
}

export function listJobs() {
  return jobs;
}

export function activeJobs() {
  return jobs.filter((j) => ['starting', 'submitting', 'queued', 'processing'].includes(j.status));
}

export function ttlRemainingMs(job) {
  return Math.max(0, JOB_TTL_MS - (Date.now() - job.startedAt));
}