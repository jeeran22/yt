import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { buildTextToVideoPayload } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { loadState, saveState } from '../lib/persist.js';
import { ensurePresets, motionRange, cfgRange } from '../lib/presets.js';
import { addClip } from '../lib/library.js';
import { slug } from '../lib/utils.js';
import TextAreaField from '../components/TextAreaField.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import SliderField from '../components/SliderField.jsx';
import NumberField from '../components/NumberField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import EmptyState from '../components/EmptyState.jsx';

const DEFAULT_FORM = () => ({
  prompt: '',
  size: 768,
  seed: '',
  motion_bucket_id: motionRange().default,
  cfg_scale: cfgRange().default
});

export default function TextToVideo() {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM(), ...loadState('text-video', DEFAULT_FORM()) }));
  const [added, setAdded] = useState(false);
  const { busy, error, result, setError, run } = useRun();

  const update = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      saveState('text-video', next);
      return next;
    });
  };

  const generate = async () => {
    if (!String(form.prompt).trim()) {
      setError({ code: 'MISSING_PROMPT', message: 'Please enter a text prompt first.' });
      return;
    }
    setAdded(false);
    await run(() => api.generateVideoFromText(buildTextToVideoPayload(form)));
  };

  const addToLibrary = () => {
    if (!result || !result.videoUrl) return;
    addClip({
      title: String(form.prompt).slice(0, 60) || 'Text-to-video',
      videoUrl: result.videoUrl,
      duration: result.durationSeconds,
      source: 'text-to-video'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const motion = motionRange();
  const cfg = cfgRange();

  // Load real model metadata so slider ranges reflect the backend (no-op after first visit).
  useEffect(() => {
    ensurePresets().catch(() => {});
  }, []);

  return (
    <div className="view-grid">
      <section className="panel">
        <h2 className="title-row">
          <span className="panel-title">🎬 Text-to-Video</span>
          {added ? <span className="chip chip-ok">Added to clip library ✓</span> : null}
        </h2>
        <p className="panel-sub">
          Render a keyframe with SD3 Turbo, then animate it into a ~2s clip with Stable Video Diffusion.
        </p>

        <TextAreaField
          label="Prompt"
          value={form.prompt}
          onChange={(v) => update({ prompt: v })}
          placeholder="A glowing coral reef swaying gently, sun rays piercing turquoise water…"
          rows={5}
          maxLength={10000}
          hint="This prompt becomes the starting frame of the video."
        />

        <SegmentedControl label="Keyframe size (px)" value={form.size} onChange={(v) => update({ size: Number(v) })} options={[512, 768, 1024]} />
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
            {busy ? 'Generating…' : '🎬 Generate video'}
          </button>
        </div>
        {busy ? <Spinner label="Generating keyframe + animating (can take a minute)…" /> : null}
        <ErrorBox error={error} />
      </section>

      <section className="panel">
        <h2 className="panel-title">Result</h2>
        {result && result.videoUrl ? (
          <>
            <MediaPreview
              kind="video"
              src={result.videoUrl}
              alt={result.prompt || 'Generated video'}
              fileName={`text-to-video-${slug(result.prompt, 'clip')}.mp4`}
              meta={[
                { label: 'Resolution', value: result.dimensions ? `${result.dimensions.width}×${result.dimensions.height}` : `${form.size}×${form.size}` },
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
            {result.sourceImage ? (
              <div className="keyframe-block">
                <span className="field-label">Keyframe frame</span>
                <img src={result.sourceImage} alt="Keyframe" className="keyframe-img" />
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState icon="🎬" title="No video yet" text="Your animated clip and its keyframe will appear here." />
        )}
      </section>
    </div>
  );
}