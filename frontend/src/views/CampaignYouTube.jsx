import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { buildYouTubePayload, cleanShots } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { loadState, saveState } from '../lib/persist.js';
import { register } from '../lib/jobs.js';
import { addClip } from '../lib/library.js';
import { getCampaignsCached, ensurePresets, motionRange, cfgRange, videoResolutions } from '../lib/presets.js';
import { slug } from '../lib/utils.js';
import TextField from '../components/TextField.jsx';
import SegmentedControl from '../components/SegmentedControl.jsx';
import SelectField from '../components/SelectField.jsx';
import SliderField from '../components/SliderField.jsx';
import NumberField from '../components/NumberField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ShotListBuilder from '../components/ShotListBuilder.jsx';
import CreativeBrief from '../components/CreativeBrief.jsx';

const DEFAULT_SHOT = () => ({
  niche: '', videoType: '', topic: '', mood: '', style: '',
  motion_bucket_id: '', cfg_scale: ''
});

const withInherit = (opts) => [{ value: '', label: 'Inherit' }, ...opts];

const DEFAULT_FORM = () => {
  const yt = getCampaignsCached().youtube;
  const ym = (yt.motionSettings && yt.motionSettings.b_roll) || { motion_bucket_id: 100, cfg_scale: 1.8 };
  return {
    niche: 'tech', videoType: 'b_roll', topic: '', mood: 'energetic',
    style: '',
    motion_bucket_id: ym.motion_bucket_id,
    cfg_scale: ym.cfg_scale,
    seed: '',
    mode: 'single',
    transition: 'fade',
    resolution: 'source',
    transition_duration: 0.5,
    shots: [{ ...DEFAULT_SHOT() }, { ...DEFAULT_SHOT() }]
  };
};

export default function CampaignYouTube({ setTab }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM(), ...loadState('youtube', DEFAULT_FORM()) }));
  const [added, setAdded] = useState(false);
  const [jobInfo, setJobInfo] = useState(null);
  const { busy, error, result, setResult, setError, run } = useRun();

  const presets = getCampaignsCached();
  const motion = motionRange();
  const cfg = cfgRange();

  useEffect(() => {
    ensurePresets().catch(() => {});
  }, []);

  const update = (patch) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      saveState('youtube', next);
      return next;
    });
  };

  const styleObject = () => ({
    style: form.style,
    motion_bucket_id: form.motion_bucket_id,
    cfg_scale: form.cfg_scale
  });

  const onVideoTypeChange = (videoType) => {
    const ms = presets.youtube.motionSettings && presets.youtube.motionSettings[videoType];
    update({
      videoType,
      motion_bucket_id: ms ? ms.motion_bucket_id : form.motion_bucket_id,
      cfg_scale: ms ? ms.cfg_scale : form.cfg_scale
    });
  };

  const validate = () => {
    if (!String(form.topic).trim()) {
      setError({ code: 'INVALID_TOPIC', message: 'Please describe the video topic first.' });
      return false;
    }
    return true;
  };

  const submitSingle = async () => {
    setAdded(false);
    setJobInfo(null);
    if (!validate()) return;
    await run(() => api.youtubeCampaign(buildYouTubePayload({
      niche: form.niche,
      videoType: form.videoType,
      topic: form.topic,
      mood: form.mood,
      style: styleObject(),
      seed: form.seed
    })));
  };

  const submitShots = () => {
    setAdded(false);
    if (!validate()) return;
    const cleaned = cleanShots(form.shots);
    if (cleaned.length !== form.shots.length || cleaned.length < 2) {
      setError({
        code: 'INVALID_SHOTS',
        message: 'Every shot needs at least one override — fill a field or remove the shot.'
      });
      return;
    }
    setError(null);
    const { body } = buildYouTubePayload({
      niche: form.niche,
      videoType: form.videoType,
      topic: form.topic,
      mood: form.mood,
      style: styleObject(),
      seed: form.seed,
      shots: form.shots,
      transition: form.transition,
      resolution: form.resolution,
      transition_duration: form.transition_duration
    });
    const { job, ready } = register({
      type: 'youtube',
      title: `${form.topic.trim().slice(0, 48)} — ${cleaned.length}-shot video`,
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
      title: `${form.topic.trim().slice(0, 48)} (${form.niche})`,
      videoUrl: result.videoUrl,
      duration: result.durationSeconds,
      source: 'campaign-youtube'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const nicheOptions = () => presets.youtube.niches.map((n) => ({ value: n, label: n }));
  const videoTypeOptions = () => presets.youtube.videoTypes.map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));
  const moodOptions = () => presets.youtube.moods.map((m) => ({ value: m, label: m }));

  return (
    <div className="view-grid">
      <section className="panel">
        <div className="title-row">
          <h2 className="panel-title">▶️ YouTube Campaign</h2>
          {added ? <span className="chip chip-ok">Added to clip library ✓</span> : null}
        </div>
        <p className="panel-sub">Niche creator videos — single clip or a full intro → b-roll → outro sequence.</p>

        <SelectField label="Niche" value={form.niche} onChange={(v) => update({ niche: v })} options={nicheOptions()} />
        <SelectField label="Video type" value={form.videoType} onChange={onVideoTypeChange} options={videoTypeOptions()} />
        <TextField label="Topic" value={form.topic} onChange={(v) => update({ topic: v })} placeholder="Building a home NAS from recycled parts" hint="What is the video about?" />
        <SegmentedControl label="Mood" value={form.mood} onChange={(v) => update({ mood: v })} options={moodOptions()} />
        <TextField label="Style (optional)" value={form.style} onChange={(v) => update({ style: v })} placeholder="glowing circuit patterns, neon blue accents" />
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
            { value: 'single', label: 'Single clip' },
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
                  <SelectField label="Niche" value={shot.niche} onChange={(v) => u({ niche: v })} options={withInherit(nicheOptions())} />
                  <SelectField label="Video type" value={shot.videoType} onChange={(v) => u({ videoType: v })} options={withInherit(videoTypeOptions())} />
                  <SelectField label="Mood" value={shot.mood} onChange={(v) => u({ mood: v })} options={withInherit(moodOptions())} />
                  <TextField label="Topic" value={shot.topic} onChange={(v) => u({ topic: v })} placeholder="inherit" />
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
              options={[{ value: 'source', label: 'Source (no conversion)' }, ...videoResolutions()]}
            />
          </>
        ) : null}

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={dueSubmit}>
            {busy ? 'Working…' : (form.mode === 'single' ? '▶ Generate video' : '▶ Start multi-shot job')}
          </button>
        </div>
        {jobInfo ? (
          <div className="notice-box">
            <strong>⏳ Multi-shot job queued.</strong>
            <span>Each shot renders in order, then everything is stitched. Track progress in the Jobs panel.</span>
            <button type="button" className="link-btn" onClick={() => setTab('jobs')}>Open Jobs Panel →</button>
          </div>
        ) : null}
        {busy ? <Spinner label="Generating YouTube video…" /> : null}
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
              alt={`${form.topic} — ${form.niche}`}
              fileName={`youtube-${slug(form.topic)}.mp4`}
              meta={[
                { label: 'Niche', value: result.niche || form.niche },
                { label: 'Type', value: (result.videoType || form.videoType).replace(/_/g, ' ') },
                { label: 'Mood', value: result.mood || form.mood },
                { label: 'Seed', value: result.seed ?? '—' },
                { label: 'Length', value: result.durationSeconds ? `~${result.durationSeconds}s` : '~2s' }
              ]}
              actions={[
                { label: '➕ Add to clip library', className: 'btn-accent', onClick: addResultToLibrary }
              ]}
            />
            {result.sourceImage ? (
              <div className="keyframe-block">
                <span className="field-label">Keyframe</span>
                <img src={result.sourceImage} alt="Keyframe" className="keyframe-img" />
              </div>
            ) : null}
            <CreativeBrief
              brief={result.creativeBrief}
              extraRows={[['Prompt', result.prompt]]}
            />
          </>
        ) : (
          <EmptyState icon="▶️" title="No video yet" text="Your YouTube clip and creative brief will appear here." />
        )}
      </section>
    </div>
  );
}