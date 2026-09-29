import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { buildImageToVideoJson, buildImageToVideoForm } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { loadState, saveState } from '../lib/persist.js';
import { takePendingImage } from '../lib/shared.js';
import { register } from '../lib/jobs.js';
import { addClip } from '../lib/library.js';
import { motionRange, cfgRange } from '../lib/presets.js';
import { slug } from '../lib/utils.js';
import SliderField from '../components/SliderField.jsx';
import NumberField from '../components/NumberField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import FileDrop from '../components/FileDrop.jsx';
import EmptyState from '../components/EmptyState.jsx';

const DEFAULT_FORM = () => ({
  seed: '',
  motion_bucket_id: motionRange().default,
  cfg_scale: cfgRange().default
});

export default function ImageToVideo({ setTab }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM(), ...loadState('image-video', DEFAULT_FORM()) }));
  // If the user clicked "Animate this image" in the Image Gen tab, the image is
  // handed over through the shared store and consumed exactly once.
  const [shared] = useState(() => takePendingImage());
  const [file, setFile] = useState(null);
  const [added, setAdded] = useState(false);
  const [jobInfo, setJobInfo] = useState(null);
  const { busy, error, result, setError, run } = useRun();

  const motion = motionRange();
  const cfg = cfgRange();

  useEffect(() => {
    const onErr = (e) => setError(e.detail);
    document.addEventListener('filedrop-error', onErr);
    return () => document.removeEventListener('filedrop-error', onErr);
  }, []);

  const update = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      saveState('image-video', next);
      return next;
    });
  };

  const hasSource = Boolean(file || (shared && shared.dataUrl));

  const resolveSource = () => {
    if (file) return { kind: 'file', file, title: file.name };
    if (shared && shared.dataUrl) {
      return {
        kind: 'data',
        dataUrl: shared.dataUrl,
        mimeType: shared.mimeType || 'image/png',
        title: shared.title || 'Generated image'
      };
    }
    return null;
  };

  const buildPayload = (src) => (
    src.kind === 'file'
      ? buildImageToVideoForm(src.file, form)
      : buildImageToVideoJson({
          imageBase64: src.dataUrl,
          imageMimeType: src.mimeType,
          seed: form.seed,
          cfg_scale: form.cfg_scale,
          motion_bucket_id: form.motion_bucket_id
        })
  );

  const generate = async () => {
    setAdded(false);
    setJobInfo(null);
    const src = resolveSource();
    if (!src) {
      setError({ code: 'MISSING_IMAGE', message: 'Add an image first — upload one or animate the last generated image.' });
      return;
    }
    await run(() => api.generateVideoFromImage(buildPayload(src)));
  };

  const runInBackground = async () => {
    setAdded(false);
    setError(null);
    const src = resolveSource();
    if (!src) {
      setError({ code: 'MISSING_IMAGE', message: 'Add an image first — upload one or animate the last generated image.' });
      return;
    }
    const { job, ready } = register({ type: 'video', title: src.title || 'Image-to-video clip', body: buildPayload(src) });
    setJobInfo(job);
    ready.then(() => {
      if (job.status === 'completed' && job.result && job.result.videoUrl) setResult(job.result);
      else if (job.status === 'failed') setError(job.error);
    });
  };

  const addToLibrary = () => {
    if (!result || !result.videoUrl) return;
    addClip({
      title: shared && shared.title ? shared.title : 'Image-to-video clip',
      videoUrl: result.videoUrl,
      duration: result.durationSeconds,
      source: 'image-to-video'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
<div className="view-grid">
      <section className="panel">
        <div className="title-row">
          <h2 className="panel-title">🎞️ Image-to-Video</h2>
          {added ? <span className="chip chip-ok">Added to clip library ✓</span> : null}
        </div>
        <p className="panel-sub">Animate a single image into a ~2s clip with Stable Video Diffusion.</p>

        <div className="source-picker">
          <span className="field-label">Source image</span>
          {shared && shared.dataUrl ? (
            <div className="source-chip">
              <img src={shared.dataUrl} alt="" className="source-thumb" />
              <div className="file-meta">
                <strong>{shared.title || 'Last generated image'}</strong>
                <span>from Image Gen</span>
              </div>
            </div>
          ) : null}
          <FileDrop
            label="Drop an image here or click to browse"
            accept="image/*"
            file={file}
            onFile={setFile}
            onClear={() => setFile(null)}
            hint="PNG / JPEG / WEBP, up to 10 MB"
            maxSizeMB={10}
          />
          {!hasSource ? (
            <p className="field-hint">
              Tip: generate an image in the <b>Image Gen</b> tab, then hit <b>“Animate this image →”</b> and it pops in here automatically.
            </p>
          ) : null}
        </div>

        <SliderField
          label="Motion strength"
          value={form.motion_bucket_id}
          min={motion.min}
          max={motion.max}
          step={1}
          onChange={(v) => update({ motion_bucket_id: v })}
          hint={`Higher = more movement (default ${motion.default})`}
        />
        <SliderField
          label="CFG scale"
          value={form.cfg_scale}
          min={cfg.min}
          max={cfg.max}
          step={0.1}
          onChange={(v) => update({ cfg_scale: v })}
          format={(v) => v.toFixed(1)}
          hint={`How strictly the clip follows the prompt (default ${cfg.default})`}
        />
        <NumberField label="Seed (optional — empty = random)" value={form.seed} onChange={(v) => update({ seed: v })} placeholder="auto" min={0} max={4294967294} randomize />

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={generate}>
            {busy ? 'Animated…' : '▶ Generate clip'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={runInBackground}>
            ⟳ Run as background job
          </button>
        </div>
        {jobInfo ? (
          <div className="notice-box">
            <strong>⏳ Background job started.</strong>
            <span>Follow its progress in the Jobs panel.</span>
            <button type="button" className="link-btn" onClick={() => setTab('jobs')}>Open Jobs Panel →</button>
          </div>
        ) : null}
        {busy ? <Spinner label="Animating image with Stable Video Diffusion…" /> : null}
        <ErrorBox error={error} />
      </section>
<section className="panel">
        <h2 className="panel-title">Result</h2>
        {result && result.videoUrl ? (
          <MediaPreview
            kind="video"
            src={result.videoUrl}
            alt="Animated clip"
            fileName={`image-to-video-${slug(shared ? shared.title : 'clip')}.mp4`}
            meta={[
              { label: 'Motion', value: result.motion_bucket_id },
              { label: 'CFG', value: result.cfg_scale },
              { label: 'Seed', value: result.seed ?? '—' },
              { label: 'Length', value: result.durationSeconds ? `~${result.durationSeconds}s` : '~2s' },
              { label: 'Model', value: result.model || 'Stable Video Diffusion' }
            ]}
            actions={[
              { label: '➕ Add to clip library', className: 'btn-accent', onClick: addToLibrary }
            ]}
          />
        ) : (
          <EmptyState icon="🎞️" title="No clip yet" text="Your animated clip will appear here — ready to download or add to the clip library for stitching." />
        )}
      </section>
    </div>
  );
}