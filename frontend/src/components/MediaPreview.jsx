import { useEffect, useState } from 'react';
import {
  dataUrlToObjectUrl,
  revokeObjectUrl,
  downloadDataUrl,
  dataUrlMime
} from '../lib/media.js';

// Renders an image or video from a data URL / object URL with metadata chips,
// a download button and optional extra actions (e.g. "Add to clip library").
export default function MediaPreview({
  kind = 'video', src, alt, meta = [], fileName, actions = [], badge
}) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!src) { setUrl(null); return undefined; }
    if (src.startsWith('blob:')) { setUrl(src); return undefined; }
    const objectUrl = dataUrlToObjectUrl(src);
    setUrl(objectUrl);
    return () => revokeObjectUrl(objectUrl);
  }, [src]);

  if (!src) return null;

  const defaultName = (() => {
    const mime = dataUrlMime(src);
    const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'bin');
    return `media.${ext}`;
  })();

  return (
    <div className="media-preview">
      {badge ? <span className="media-badge chip">{badge}</span> : null}
      <div className="media-stage">
        {kind === 'video'
          ? <video src={url} controls muted playsInline />
          : <img src={url} alt={alt || ''} className="media-img" />}
      </div>
      {meta && meta.length ? (
        <div className="media-meta">
          {meta.map((m) => (m ? <span key={m.label} className="chip chip-muted">{m.label}: <b>{m.value}</b></span> : null))}
        </div>
      ) : null}
      <div className="media-actions">
        <button type="button" className="btn btn-primary" onClick={() => downloadDataUrl(src, fileName || defaultName)}>
          ⬇ Download
        </button>
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            className={`btn ${a.className || 'btn-ghost'}`}
            disabled={a.disabled}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}