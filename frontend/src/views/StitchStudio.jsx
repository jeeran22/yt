import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { buildStitchPayload } from '../api/endpoints.js';
import useRun from '../lib/useRun.js';
import { subscribe, listClips, addClip } from '../lib/library.js';
import { fileToDataUrl } from '../lib/media.js';
import { videoResolutions } from '../lib/presets.js';
import { slug } from '../lib/utils.js';
import SegmentedControl from '../components/SegmentedControl.jsx';
import SelectField from '../components/SelectField.jsx';
import SliderField from '../components/SliderField.jsx';
import Spinner from '../components/Spinner.jsx';
import ErrorBox from '../components/ErrorBox.jsx';
import MediaPreview from '../components/MediaPreview.jsx';
import FileDrop from '../components/FileDrop.jsx';
import EmptyState from '../components/EmptyState.jsx';

const STITCH_MAX = 20;
const STITCH_MIN = 2;

function uuid() {
  return 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function StitchStudio() {
  const [clips, setClips] = useState(listClips);
  const [selected, setSelected] = useState([]);
  const [transition, setTransition] = useState('fade');
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [resolution, setResolution] = useState('source');
  const [added, setAdded] = useState(false);
  const { busy, error, result, setError, run } = useRun();

  // Live-read the in-memory clip library.
  useEffect(() => {
    const unsub = subscribe(() => setClips(listClips()));
    return unsub;
  }, []);

  const isSelected = (key) => selected.some((s) => s.key === key);

  const toggle = (clip) => {
    if (isSelected(clip.id)) {
      setSelected(selected.filter((s) => s.key !== clip.id));
    } else if (selected.length < STITCH_MAX) {
      setSelected([...selected, { key: clip.id, dataUrl: clip.videoUrl, title: clip.title }]);
    } else {
      setError({ code: 'TOO_MANY_CLIPS', message: `No more than ${STITCH_MAX} clips can be stitched at once.` });
    }
  };

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
    setSelected(next);
  };

  const removeSelected = (key) => setSelected(selected.filter((s) => s.key !== key));

  const addFiles = async (files) => {
    const extra = [];
    for (const f of Array.from(files || [])) {
      if (f.size > 25 * 1024 * 1024) {
        setError({ code: 'CLIP_TOO_LARGE', message: `"${f.name}" exceeds the 25 MB server limit.` });
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(f);
        extra.push({ key: uuid(), dataUrl, title: f.name });
      } catch (e) {
        setError({ code: 'INVALID_CLIPS', message: `Could not read "${f.name}".` });
      }
    }
    if (extra.length) setSelected([...selected, ...extra]);
  };

  const stitch = async () => {
    setAdded(false);
    if (selected.length < STITCH_MIN) {
      setError({ code: 'INVALID_CLIPS', message: `Add at least ${STITCH_MIN} clips to stitch a video.` });
      return;
    }
    if (selected.length > STITCH_MAX) {
      setError({ code: 'TOO_MANY_CLIPS', message: `No more than ${STITCH_MAX} clips can be stitched at once.` });
      return;
    }
    const payload = buildStitchPayload({
      clips: selected.map((s) => s.dataUrl),
      transition,
      resolution,
      transition_duration: transitionDuration
    });
    await run(() => api.stitchVideos(payload));
  };

  const addResultToLibrary = () => {
    if (!result || !result.videoUrl) return;
    addClip({
      title: `Stitched ${result.clipCount} clips (${result.transition})`,
      videoUrl: result.videoUrl,
      duration: result.durationSeconds,
      source: 'stitch'
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
<div className="view-grid">
      <section className="panel">
        <h2 className="panel-title">🧩 Stitch Studio</h2>
        <p className="panel-sub">Merge 2–20 clips into one MP4 with server-side transitions (ffmpeg).</p>

        <div className="field">
          <span className="field-head">
            <span className="field-label">Clip library</span>
            <span className="field-value">{clips.length} saved clip{clips.length === 1 ? '' : 's'}</span>
          </span>
          {clips.length ? (
            <ul className="library-grid">
              {clips.map((clip) => {
                const on = isSelected(clip.id);
                return (
                  <li key={clip.id} className={on ? 'library-item is-on' : 'library-item'}>
                    <button
                      type="button"
                      className="library-toggle"
                      aria-pressed={on}
                      onClick={() => toggle(clip)}
                      title={on ? 'Remove from selection' : 'Add to selection'}
                    >
                      {on ? '✓' : '+'}
                    </button>
                    <video className="library-thumb" src={clip.videoUrl} muted playsInline preload="metadata" />
                    <span className="library-title" title={clip.title}>{clip.title}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="field-hint">No saved clips yet. Generate videos in <b>Text-to-Video</b> / <b>Image-to-Video</b> and click <b>➕ Add to clip library</b> — they’ll show up here, or upload MP4s below.</p>
          )}
          <FileDrop
            label="Upload MP4 clips"
            accept="video/*,.mp4"
            file={null}
            onFile={(f) => addFiles([f])}
            onClear={() => {}}
            hint="MP4 clips, up to 25 MB each — they are added straight to the selection."
            maxSizeMB={25}
          />
        </div>

        <div className="field">
          <span className="field-head">
            <span className="field-label">Selected clips (in order)</span>
            <span className="field-value">{selected.length}/{STITCH_MAX}</span>
          </span>
          {selected.length ? (
            <ol className="selected-list">
              {selected.map((s, i) => (
                <li key={s.key} className="selected-item">
                  <span className="selected-index">{i + 1}</span>
                  <span className="selected-title" title={s.title}>{s.title}</span>
                  <span className="selected-actions">
                    <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
                    <button type="button" className="icon-btn" disabled={i === selected.length - 1} onClick={() => move(i, 1)} title="Move down">↓</button>
                    <button type="button" className="icon-btn icon-btn-danger" onClick={() => removeSelected(s.key)} title="Remove">✕</button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="field-hint">Pick clips from the library above or upload them — order here is the stitch order.</p>
          )}
          {selected.length ? (
            <button type="button" className="link-btn link-danger" onClick={() => setSelected([])}>clear all</button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Stitch settings</h2>
        <SegmentedControl
          label="Transition"
          value={transition}
          onChange={setTransition}
          options={[
            { value: 'cut', label: 'Cut' },
            { value: 'fade', label: 'Fade' },
            { value: 'dissolve', label: 'Dissolve' }
          ]}
        />
        {transition !== 'cut' ? (
          <SliderField
            label="Transition duration (s)"
            value={transitionDuration}
            min={0.1}
            max={2}
            step={0.1}
            onChange={setTransitionDuration}
            format={(v) => `${v.toFixed(1)}s`}
          />
        ) : null}
        <SelectField
          label="Output resolution"
          value={resolution}
          onChange={setResolution}
          options={[{ value: 'source', label: 'Source (no conversion)' }, ...videoResolutions()]}
          hint="Leave on “Source” for a fast, lossless concat."
        />

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={stitch}>
            {busy ? 'Stitching…' : '🧩 Stitch clips'}
          </button>
        </div>
        {busy ? <Spinner label="Merging clips with ffmpeg on the server…" /> : null}
        <ErrorBox error={error} />

        <h2 className="panel-title">Merged result</h2>
        {result && result.videoUrl ? (
          <MediaPreview
            kind="video"
            src={result.videoUrl}
            alt="Stitched video"
            fileName={`stitched-${result.clipCount}-clips-${result.transition}-${slug(result.resolution || 'source')}.mp4`}
            meta={[
              { label: 'Clips', value: result.clipCount },
              { label: 'Length', value: result.durationSeconds ? `~${result.durationSeconds}s` : '—' },
              { label: 'Transition', value: result.transition },
              { label: 'Resolution', value: result.resolution || 'source' }
            ]}
            actions={[
              { label: '➕ Add to clip library', className: 'btn-accent', onClick: addResultToLibrary }
            ]}
          />
        ) : (
          <EmptyState icon="🧩" title="No merged video yet" text="The stitched MP4 will appear here with preview, metadata and download." />
        )}
      </section>
    </div>
  );
}