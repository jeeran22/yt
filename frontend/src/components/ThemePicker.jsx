import { useEffect, useRef, useState } from 'react';
import { THEMES, applyTheme } from '../lib/theme.js';

// Theme dropdown — lets users switch between the dark studio, light and a
// handful of alternative palettes. Choice is persisted to localStorage.
export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(() => (typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('data-theme') || 'dark')
    : 'dark'));
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const select = (id) => {
    applyTheme(id);
    setCur(id);
    setOpen(false);
  };

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        type="button"
        className="theme-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="theme-swatch" aria-hidden="true">
          <i style={{ backgroundColor: THEMES[cur].swatch[1] }} />
          <i style={{ backgroundColor: THEMES[cur].swatch[2] }} />
          <i style={{ backgroundColor: THEMES[cur].swatch[0] }} />
        </span>
        <span className="theme-name">{THEMES[cur].name}</span>
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="theme-menu" role="listbox" aria-label="Theme">
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={cur === id}
              className={cur === id ? 'theme-item is-active' : 'theme-item'}
              onClick={() => select(id)}
            >
              <span className="theme-swatch" aria-hidden="true">
                <i style={{ backgroundColor: t.swatch[1] }} />
                <i style={{ backgroundColor: t.swatch[2] }} />
                <i style={{ backgroundColor: t.swatch[0] }} />
              </span>
              <span className="theme-item-name">{t.name}</span>
              {cur === id ? <span className="check" aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}