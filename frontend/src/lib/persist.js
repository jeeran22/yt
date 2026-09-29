// ---------------------------------------------------------------------------
// Tiny localStorage-backed persistence for form values (prompt/param history).
// ---------------------------------------------------------------------------

const PREFIX = 'studio:';

export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : (typeof fallback === 'function' ? fallback() : fallback);
  } catch (e) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* storage full or unavailable — ignore */
  }
}