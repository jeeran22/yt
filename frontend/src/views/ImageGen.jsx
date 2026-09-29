import { useState } from 'react';
import api from '../api/client.js';
import { buildImagePayload } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { loadState, saveState } from '../lib/persist.js';
import { setPendingImage } from '../lib/shared.js';
import TextAreaField from '../components/TextAreaField.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import NumberField from '../components/NumberField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import EmptyState from '../components/EmptyState.jsx';

const DEFAULT_FORM = () => ({ prompt: '', size: 1024, format: 'png', seed: '' });

export default function ImageGen({ setTab }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM(), ...loadState('image', DEFAULT_FORM()) }));
  const { busy, error, result, setError, run } = useRun();

  const update = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      saveState('image', next);
      return next;
    });
  };

  const generate = async () => {
    if (!String(form.prompt).trim()) {
      setError({ code: 'MISSING_PROMPT', message: 'Please enter a text prompt first.' });
      return;
    }
    await run(() => api.generateImage(buildImagePayload(form)));
  };

  const animateThis = () => {
    if (!result || !result.imageUrl) return;
    setPendingImage({
      dataUrl: result.imageUrl,
      mimeType: `image/${result.format || form.format || 'png'}`,
      title: String(form.prompt).slice(0, 80) || 'Generated image'
    });
    setTab('image-video');
  };

  return (
    <div className="view-grid">
      <section className="panel">
        <h2 className="panel-title">🖼️ Image Gen</h2>
        <p className="panel-sub">Create still images from a text prompt with Stable Diffusion 3 Turbo.</p>

        <TextAreaField
          label="Prompt"
          value={form.prompt}
          onChange={(v) => update({ prompt: v })}
          placeholder="A cinematic product photograph of a glass perfume bottle on wet stone, dramatic rim lighting…"
          rows={5}
          maxLength={10000}
          hint="Describe the composition, style, lighting and mood."
        />

        <SegmentedControl label="Size (px)" value={form.size} onChange={(v) => update({ size: Number(v) })} options={[512, 768, 1024]} />
        <SegmentedControl label="Format" value={form.format} onChange={(v) => update({ format: v })} options={['png', 'jpeg', 'webp']} />
        <NumberField label="Seed (optional — empty = random)" value={form.seed} onChange={(v) => update({ seed: v })} placeholder="auto" min={0} max={4294967294} randomize hint="Same seed + same prompt reproduces the same result." />

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={generate}>
            {busy ? 'Generating…' : '✨ Generate'}
          </button>
        </div>
        {busy ? <Spinner label="Generating image with SD3 Turbo…" /> : null}
        <ErrorBox error={error} />
        {result ? (
          <p className="fresh-note">✓ Generated. Use <b>“Animate this image →”</b> below to turn it into a video clip.</p>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="panel-title">Result</h2>
        {result && result.imageUrl ? (
          <MediaPreview
            kind="image"
            src={result.imageUrl}
            alt={result.prompt || 'Generated image'}
            fileName={`stable-diffusion-${result.seed ?? 'img'}.${result.format || 'png'}`}
            meta={[
              { label: 'Size', value: result.dimensions ? `${result.dimensions.width}×${result.dimensions.height}` : `${form.size}×${form.size}` },
              { label: 'Format', value: (result.format || form.format).toUpperCase() },
              { label: 'Seed', value: result.seed ?? '—' },
              { label: 'Model', value: result.model || 'Stable Diffusion 3 Turbo' }
            ]}
            actions={[
              { label: '🎞 Animate this image →', className: 'btn-accent', onClick: animateThis }
            ]}
          />
        ) : (
          <EmptyState icon="🖼️" title="No image yet" text="Your generated image will appear here with a download button." />
        )}
      </section>
    </div>
  );
}