import { useEffect, useState } from 'react';
import * as jobStore from '../lib/jobs.js';
import { addClip } from '../lib/library.js';
import { formatTime, formatTtl } from '../lib/utils.js';
import ProgressBar from '../components/ProgressBar.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import EmptyState from '../components/EmptyState.jsx';

const STATUS_META = {
  starting:   { label: 'Starting…',   className: 'chip chip-warn' },
  submitting: { label: 'Submitting…', className: 'chip chip-warn' },
  queued:     { label: 'Queued',      className: 'chip chip-warn' },
  processing: { label: 'Processing',  className: 'chip chip-ok' },
  completed:  { label: 'Completed',   className: 'chip chip-ok' },
  failed:     { label: 'Failed',      className: 'chip chip-err' },
  expired:    { label: 'Expired',     className: 'chip chip-err' }
};

const KIND_META = {
  video:     { icon: '🎞️', label: 'Video generation' },
  marketing: { icon: '📢', label: 'Marketing campaign' },
  youtube:   { icon: '▶️', label: 'YouTube campaign' }
};

export default function JobsPanel() {
  const [jobs, setJobs] = useState(jobStore.listJobs);

  useEffect(() => {
    const refresh = () => setJobs(jobStore.listJobs());
    const unsub = jobStore.subscribe(refresh);
    const timer = setInterval(refresh, 5000); // keep the TTL countdown fresh
    return () => { unsub(); clearInterval(timer); };
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="panel panel-wide">
        <h2 className="panel-title">⚙️ Jobs Panel</h2>
        <p className="panel-sub">Every background job you start — async video generations and multi-shot campaigns — shows up here automatically.</p>
        <EmptyState
          icon="⚙️"
          title="No jobs yet"
          text="Use “Run as background job” in Image-to-Video, or “Shot sequence” mode in the campaign wizards, and the jobs will appear here with live progress."
        />
      </div>
    );
  }

  return (
    <div className="panel panel-wide">
      <h2 className="panel-title">⚙️ Jobs Panel</h2>
      <p className="panel-sub">
        Polling every ~2s. Jobs and their results live in the backend’s memory for <b>30 minutes</b> —
        downloading or retrying keeps them alive while you watch.
      </p>
      <div className="jobs-list">
        {jobs.map((job, i) => (
          <JobCard key={job.id + '-' + i} job={job} />
        ))}
      </div>
    </div>
  );
}
function JobCard({ job }) {
  const status = STATUS_META[job.status] || STATUS_META.processing;
  const kind = KIND_META[job.type] || KIND_META.video;
  const ttlLeft = jobStore.ttlRemainingMs(job);
  const isRunning = ['starting', 'submitting', 'queued', 'processing'].includes(job.status);
  const result = job.result;

  return (
    <article className="job-card">
      <div className="job-head">
        <span className="chip chip-muted">{kind.icon} {kind.label}</span>
        <span className={status.className}>{status.label}</span>
        <span className="job-time">started {formatTime(job.startedAt)}</span>
      </div>
      <h3 className="job-title">{job.title}</h3>

      {isRunning ? (
        <div className="job-progress">
          {job.kind === 'campaign' ? (
            <ProgressBar
              label={`Rendering shot ${Math.min(job.shotsDone + 1, job.shotsTotal || 1)} of ${job.shotsTotal || 1}`}
              value={job.shotsDone}
              max={job.shotsTotal || 1}
              status={job.status}
            />
          ) : (
            <ProgressBar label="Generating frames…" value={0} max={1} indeterminate status={job.status} />
          )}
          {job.pollPath ? <span className="mono job-poll">polling {job.pollPath}</span> : null}
        </div>
      ) : null}

      {job.status === 'failed' || job.status === 'expired' ? (
        <ErrorBox
          error={job.error}
          onRetry={() => jobStore.retryJob(job.id)}
          retryLabel="↻ Retry job"
        />
      ) : null}

      {job.status === 'completed' && result && result.videoUrl ? (
        <div className="job-result">
          <MediaPreview
            kind="video"
            src={result.videoUrl}
            alt={job.title}
            fileName={`${job.type}-${job.id ? job.id.slice(-8) : 'result'}.mp4`}
            meta={buildResultMeta(job, result)}
            actions={[
              {
                label: '➕ Add to clip library',
                className: 'btn-accent',
                onClick: () => addClip({ title: job.title, videoUrl: result.videoUrl, duration: result.durationSeconds, source: 'job' })
              }
            ]}
          />
          {result.shots && result.shots.length ? (
            <details className="brief-box done">
              <summary>Per-shot prompts ({result.shots.length})</summary>
              <ol className="shot-prompts">
                {result.shots.map((shot, i) => (
                  <li key={i}>
                    <strong>Shot {i + 1}</strong>
                    <p>{shot.prompt || '—'}</p>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="job-foot">
        <span className={`chip ${ttlLeft < 60_000 ? 'chip-warn' : 'chip-muted'}`}>
          {isRunning || job.status === 'failed'
            ? `results kept ~${formatTtl(ttlLeft)}`
            : (ttlLeft > 0 ? `kept ~${formatTtl(ttlLeft)}` : 'expired')}
        </span>
        {job.status === 'failed' || job.status === 'expired' ? (
          <button type="button" className="link-btn" onClick={() => jobStore.retryJob(job.id)}>retry</button>
        ) : null}
        <button type="button" className="link-btn link-danger" onClick={() => jobStore.removeJob(job.id)}>remove</button>
      </div>
    </article>
  );
}

function buildResultMeta(job, result) {
  const meta = [];
  if (result.clipCount) meta.push({ label: 'Clips', value: result.clipCount });
  if (result.durationSeconds) meta.push({ label: 'Length', value: `~${result.durationSeconds}s` });
  if (result.transition) meta.push({ label: 'Transition', value: result.transition });
  if (result.resolution) meta.push({ label: 'Resolution', value: result.resolution });
  if (result.seed !== undefined && result.seed !== null) meta.push({ label: 'Seed', value: result.seed });
  if (job.shotsTotal) meta.push({ label: 'Shots', value: job.shotsTotal });
  return meta;
}