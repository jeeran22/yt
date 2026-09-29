/**
 * Clip / Job Store Service
 *
 * In-memory store for multi-shot campaign jobs. The multi-shot campaign
 * endpoints return a jobId immediately and a background worker generates
 * each shot, stitches them, and stores the final result here for polling
 * via GET /campaigns/jobs/:id.
 *
 * Jobs (including their base64 clips and merged result) expire after
 * JOB_TTL_MS to bound memory usage. This is a single-process, non-persistent
 * store — for multi-instance deployments swap in Redis or a DB.
 */

const crypto = require('node:crypto');

const JOB_TTL_MS = 30 * 60 * 1000;

class ClipStoreService {
  constructor() {
    this.jobs = new Map();
  }

  create(kind, meta = {}) {
    this._sweep();
    const now = Date.now();
    const job = {
      id: crypto.randomUUID(),
      kind,
      status: 'queued',
      meta,
      shotsTotal: meta.shotsTotal || 0,
      shotsDone: 0,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + JOB_TTL_MS
    };
    this.jobs.set(job.id, job);
    return job;
  }

  get(id) {
    this._sweep();
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }
    // touch — keep alive while being polled
    job.expiresAt = Date.now() + JOB_TTL_MS;
    return job;
  }

  update(id, patch) {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }
    Object.assign(job, patch, { updatedAt: Date.now() });
    return job;
  }

  _sweep() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.expiresAt < now) {
        this.jobs.delete(id);
      }
    }
  }
}

module.exports = new ClipStoreService();