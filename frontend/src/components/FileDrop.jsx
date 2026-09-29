import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../lib/media.js';

// Single-file drag & drop uploader (image/video). `onFile(file)` is called
// with the chosen File so the caller decides how to send it (multipart etc.).
export default function FileDrop({
  label, accept = '', hint, file, onFile, onClear, maxSizeMB = 25
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let url = null;
    if (file && typeof file.type === 'string' && file.type.startsWith('image/')) {
      url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);

  const handleFiles = (list) => {
    const f = list && list[0];
    if (f) {
      if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
        // surface a clear error through the normal channel
        const evt = new CustomEvent('filedrop-error', {
          detail: { message: `This file exceeds the ${maxSizeMB} MB server limit.`, code: 'CLIP_TOO_LARGE' }
        });
        document.dispatchEvent(evt);
        return;
      }
      onFile(f);
    }
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {file ? (
        <div className="file-chip">
          {preview ? <img className="file-thumb" src={preview} alt="" /> : <span className="file-thumb file-thumb-fallback">📁</span>}
          <div className="file-meta">
            <strong title={file.name}>{file.name}</strong>
            <span className="file-size">{formatBytes(file.size)}</span>
          </div>
          <button type="button" className="link-btn" onClick={onClear}>remove</button>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone${drag ? ' is-drag' : ''}`}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <span className="dropzone-icon" aria-hidden="true">☁️</span>
          <span className="dropzone-text">{label || 'Drop a file here or click to browse'}</span>
          {hint ? <span className="dropzone-hint">{hint}</span> : null}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="visually-hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}