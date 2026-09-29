import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { buildMarketingPayload, cleanShots } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { loadState, saveState } from '../lib/persist.js';
import { register } from '../lib/jobs.js';
import { addClip } from '../lib/library.js';
import { getCampaignsCached, ensurePresets, motionRange, cfgRange } from '../lib/presets.js';
import { slug } from '../lib/utils.js';
import TextField from '../components/TextField.jsx';
import TextAreaField from '../components/TextAreaField.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import SelectField from '../components/SelectField.jsx';
import SliderField from '../components/SliderField.jsx';
import NumberField from '../components/NumberField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import FileDrop from '../components/FileDrop.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ShotListBuilder from '../components/ShotListBuilder.jsx';
import CreativeBrief from '../components/CreativeBrief.jsx';

const MOOD_SUGGESTIONS = ['high-end', 'energetic', 'elegant', 'bold', 'luxurious', 'minimal', 'cozy', 'dramatic'];

const DEFAULT_SHOT = () => ({
  mood: '', surface: '', lighting: '', atmosphere: '', accent: '', style: '',
  motion_bucket_id: '', cfg_scale: ''
});

const DEFAULT_FORM = () => {
  const mk = getCampaignsCached().marketing;
  const phys = (mk.motionSettings && mk.motionSettings.physical) || { motion_bucket_id: 75, cfg_scale: 2.0 };
  return {
    name: '', type: 'physical', description: '', category: '',
    mood: '', surface: '', lighting: '', atmosphere: '', accent: '', style: '',
    motion_bucket_id: phys.motion_bucket_id,
    cfg_scale: phys.cfg_scale,
    seed: '',
    mode: 'single',
    transition: 'fade',
    resolution: 'source',
    transition_duration: 0.5,
    shots: [{ ...DEFAULT_SHOT() }, { ...DEFAULT_SHOT() }]
  };
};

export default function CampaignMarketing({ setTab }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM(), ...loadState('marketing', DEFAULT_FORM()) }));
  const [photoFile, setPhotoFile] = useState(null);
  const [added, setAdded] = useState(false);
  const [jobInfo, setJobInfo] = useState(null);
  const { busy, error, result, setResult, setError, run } = useRun();

  const presets = getCampaignsCached();
  const motion = motionRange();
  const cfg = cfgRange();

  // Keep the real presets in sync in the background (no-op after first load).
  useEffect(() => {
    ensurePresets().catch(() => {});
  }, []);

  const update = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      saveState('marketing', next);
      return next;
    });
  };

  const styleObject = () => ({
    mood: form.mood, surface: form.surface, lighting: form.lighting,
    atmosphere: form.atmosphere, accent: form.accent, style: form.style,
    motion_bucket_id: form.motion_bucket_id, cfg_scale: form.cfg_scale
  });

  const onTypeChange = (type) => {
    const ms = presets.marketing.motionSettings && presets.marketing.motionSettings[type];
    update({
      type,
      motion_bucket_id: ms ? ms.motion_bucket_id : form.motion_bucket_id,
      cfg_scale: ms ? ms.cfg_scale : form.cfg_scale
    });
  };

  const validateProduct = () => {
    if (!String(form.name).trim()) {
      setError({ code: 'MISSING_PRODUCT_NAME', message: 'Please give your product a name first.' });
      return false;
    }
    return true;
  };

  const submitSingle = async () => {
    setAdded(false);
    setJobInfo(null);
    if (!validateProduct()) return;
    const { body, form: asForm } = buildMarketingPayload({
      product: { name: form.name, type: form.type, description: form.description, category: form.category },
      style: styleObject(),
      photoFile,
      seed: form.seed
    });
    await run(() => api.marketingCampaign(body, asForm));
  };

  const submitShots = () => {
    setAdded(false);
    if (!validateProduct()) return;
    const cleaned = cleanShots(form.shots);
    if (cleaned.length !== form.shots.length || cleaned.length < 2) {
      setError({
        code: 'INVALID_SHOTS',
        message: 'Every shot needs at least one style override — fill a field or remove the shot.'
      });
      return;
    }
    setError(null);
    const { body } = buildMarketingPayload({
      product: { name: form.name, type: form.type, description: form.description, category: form.category },
      style: styleObject(),
      photoFile,
      seed: form.seed,
      shots: form.shots,
      transition: form.transition,
      resolution: form.resolution,
      transition_duration: form.transition_duration
    });
    const { job, ready } = register({
      type: 'marketing',
      title: `${form.name.trim()} — ${cleaned.length}-shot campaign`,
      body
    });
    setJobInfo(job);
    ready.then(() => {
      if (job.status === 'completed' && job.result && job.result.videoUrl) setResult(job.result);
      else if (job.status === 'failed') setError(job.error);
    });
  };

  const dueSubmit = () => (form.mode === 'single' ? submitSingle() : submitShots());

  const addResultToLibrary = () => {
    if (!result || !result.videoUrl) return;
    addClip({
      title: `${form.name.trim()} (marketing)`,
      videoUrl: result.videoUrl,
      duration: result.durationSeconds,
      source: 'campaign-marketing'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="view-grid">
      <section className="panel">
        <div className="title-row">
          <h2 className="panel-title">📢 Marketing Campaign</h2>
          {added ? <span className="chip chip-ok">Added to clip library ✓</span> : null}
        </div>
        <p className="panel-sub">Turn a product into a promo clip or a full multi-shot campaign — single response or async job.</p>

        <TextField label="Product name" value={form.name} onChange={(v) => update({ name: v })} placeholder="Aurora Smart Lamp" />
        <SegmentedControl
          label="Product type"
          value={form.type}
          onChange={onTypeChange}
          options={presets.marketing.productTypes.map((p) => ({ value: p.id, label: p.label }))}
        />
        <TextAreaField label="Description (optional)" value={form.description} onChange={(v) => update({ description: v })} rows={2} placeholder="What is it? Who is it for?" count={false} />
        <TextField label="Category (optional)" value={form.category} onChange={(v) => update({ category: v })} placeholder="home, beauty, software…" />
        <FileDrop
          label="Product photo (optional — upload for a true 16:9 / 9:16 result)"
          accept="image/*"
          file={photoFile}
          onFile={setPhotoFile}
          onClear={() => setPhotoFile(null)}
          hint="PNG / JPEG / WEBP, up to 10 MB"
          maxSizeMB={10}
        />

        <h3 className="sub-heading">Visual style</h3>
        <datalist id="mood-list">{MOOD_SUGGESTIONS.map((m) => <option key={m} value={m} />)}</datalist>
        <TextField label="Mood" value={form.mood} onChange={(v) => update({ mood: v })} placeholder="high-end, energetic, elegant…" list="mood-list" hint="Defaults to “high-end”." />
        <TextField label="Surface" value={form.surface} onChange={(v) => update({ surface: v })} placeholder="a sleek rotating turntable" />
        <TextField label="Lighting" value={form.lighting} onChange={(v) => update({ lighting: v })} placeholder="dramatic rim lighting and soft reflections" />
        <TextField label="Atmosphere" value={form.atmosphere} onChange={(v) => update({ atmosphere: v })} placeholder="gentle haze, floating dust particles…" />
        <TextField label="Accent colour" value={form.accent} onChange={(v) => update({ accent: v })} placeholder="cyan" />
        <TextField label="Style" value={form.style} onChange={(v) => update({ style: v })} placeholder="high-end commercial advertisement aesthetic" />
        <SliderField label="Motion strength" value={form.motion_bucket_id} min={motion.min} max={motion.max} step={1} onChange={(v) => update({ motion_bucket_id: v })} />
        <SliderField label="CFG scale" value={form.cfg_scale} min={cfg.min} max={cfg.max} step={0.1} onChange={(v) => update({ cfg_scale: v })} format={(v) => v.toFixed(1)} />
        <NumberField label="Seed (optional — empty = random)" value={form.seed} onChange={(v) => update({ seed: v })} placeholder="auto" min={0} max={4294967294} randomize />

        {/*P1*/}
        <h3 className="sub-heading">Delivery</h3>
        <SegmentedControl
          label="Mode"
          value={form.mode}
          onChange={(v) => update({ mode: v })}
          options={[
            { value: 'single', label: 'Single shot' },
            { value: 'shots', label: 'Shot sequence' }
          ]}
        />
        {form.mode === 'shots' ? (
          <>
            <ShotListBuilder
              shots={form.shots}
              onChange={(shots) => update({ shots })}
              newShot={DEFAULT_SHOT()}
              min={2}
              max={10}
              renderShot={(shot, u) => (
                <div className="shot-fields-grid">
                  <TextField label="Mood" value={shot.mood} onChange={(v) => u({ mood: v })} placeholder="inherit" list="mood-list" />
                  <TextField label="Surface" value={shot.surface} onChange={(v) => u({ surface: v })} placeholder="inherit" />
                  <TextField label="Lighting" value={shot.lighting} onChange={(v) => u({ lighting: v })} placeholder="inherit" />
                  <TextField label="Atmosphere" value={shot.atmosphere} onChange={(v) => u({ atmosphere: v })} placeholder="inherit" />
                  <TextField label="Accent" value={shot.accent} onChange={(v) => u({ accent: v })} placeholder="inherit" />
                  <TextField label="Style" value={shot.style} onChange={(v) => u({ style: v })} placeholder="inherit" />
                  <NumberField label="Motion (auto)" value={shot.motion_bucket_id} onChange={(v) => u({ motion_bucket_id: v })} placeholder="auto" min={1} max={255} />
                  <NumberField label="CFG (auto)" value={shot.cfg_scale} onChange={(v) => u({ cfg_scale: v })} placeholder="auto" min={0} max={10} step={0.1} />
                </div>
              )}
            />
            <SelectField
              label="Transition between shots"
              value={form.transition}
              onChange={(v) => update({ transition: v })}
              options={[
                { value: 'cut', label: 'Cut' },
                { value: 'fade', label: 'Fade' },
                { value: 'dissolve', label: 'Dissolve' }
              ]}
            />
            {form.transition !== 'cut' ? (
              <SliderField
                label="Transition duration (s)"
                value={form.transition_duration}
                min={0.1}
                max={2}
                step={0.1}
                onChange={(v) => update({ transition_duration: v })}
                format={(v) => `${v.toFixed(1)}s`}
              />
            ) : null}
            <SelectField
              label="Output resolution"
              value={form.resolution}
              onChange={(v) => update({ resolution: v })}
              options={[{ value: 'source', label: 'Source (no conversion)' }, ...(presets.marketing.supportedResolutions || [])]}
            />
          </>
        ) : null}

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={dueSubmit}>
            {busy ? 'Working…' : (form.mode === 'single' ? '📢 Generate promo' : '▶ Start multi-shot job')}
          </button>
        </div>
        {jobInfo ? (
          <div className="notice-box">
            <strong>⏳ Multi-shot job queued.</strong>
            <span>Shots are generated one by one, then stitched. Track progress in the Jobs panel.</span>
            <button type="button" className="link-btn" onClick={() => setTab('jobs')}>Open Jobs Panel →</button>
          </div>
        ) : null}
        {busy ? <Spinner label="Generating marketing video…" /> : null}
        <ErrorBox error={error} />
      </section>
      {/*P2*/}
      <section className="panel">
        <h2 className="panel-title">Result & brief</h2>
        {result && result.videoUrl ? (
          <>
            <MediaPreview
              kind="video"
              src={result.videoUrl}
              alt={`${form.name} promo`}
              fileName={`marketing-${slug(form.name)}.mp4`}
              meta={[
                { label: 'Campaign', value: result.campaign },
                { label: 'Product', value: result.product ? result.product.name : form.name },
                { label: 'Seed', value: result.seed ?? '—' },
                { label: 'Length', value: result.durationSeconds ? `~${result.durationSeconds}s` : '~2s' }
              ]}
              actions={[
                { label: '➕ Add to clip library', className: 'btn-accent', onClick: addResultToLibrary }
              ]}
            />
            {result.sourceImage ? (
              <div className="keyframe-block">
                <span className="field-label">Source frame</span>
                <img src={result.sourceImage} alt="Source" className="keyframe-img" />
              </div>
            ) : null}
            <CreativeBrief brief={result.creativeBrief} extraRows={[['Prompt', result.prompt]]} />
          </>
        ) : (
          <EmptyState icon="📢" title="No promo yet" text="Your campaign video and creative brief will appear here." />
        )}
      </section>
    </div>
  );
}