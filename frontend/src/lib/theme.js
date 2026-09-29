// ---------------------------------------------------------------------------
// Theme management. Themes are CSS custom-property palettes keyed on the
// <html data-theme="..."> attribute (see styles.css for the palettes).
// The choice is persisted in localStorage and pre-applied by index.html.
// ---------------------------------------------------------------------------

export const THEMES = {
  dark:     { name: 'Dark Studio', swatch: ['#0e1117', '#7c5cff', '#222b3a'] },
  light:    { name: 'Light',       swatch: ['#f6f7fb', '#3b82f6', '#ffffff'] },
  midnight: { name: 'Midnight',    swatch: ['#070b14', '#38bdf8', '#111a2e'] },
  amethyst: { name: 'Amethyst',    swatch: ['#141020', '#b96cf0', '#2a1e40'] },
  solarized:{ name: 'Solarized',   swatch: ['#002b36', '#268bd2', '#073642'] },
  oled:     { name: 'OLED Black',  swatch: ['#000000', '#00e676', '#101010'] },
  synthwave:{ name: 'Synthwave',   swatch: ['#15052b', '#ff2bd2', '#00e5ff'] },
  sepia:    { name: 'Sepia Paper', swatch: ['#f4ecd8', '#8b5a2b', '#efe4cf'] }
};

const KEY = 'studio-theme';

export function applyTheme(id, { persist = true } = {}) {
  if (!THEMES[id]) id = 'dark';
  document.documentElement.setAttribute('data-theme', id);
  if (persist) {
    try { localStorage.setItem(KEY, id); } catch (e) { /* ignore */ }
  }
}

export function currentlyAppliedTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function cycleTheme() {
  const ids = Object.keys(THEMES);
  const cur = currentlyAppliedTheme();
  const next = ids[(ids.indexOf(cur) + 1) % ids.length];
  applyTheme(next);
  return next;
}