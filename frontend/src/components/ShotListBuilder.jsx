// ---------------------------------------------------------------------------
// Shot list builder — the core of the multi-shot campaign wizards.
// Renders 2…10 collapsible shot cards; each shot is an object of optional
// overrides. `renderShot(shot, update)` renders the per-shot fields.
// ---------------------------------------------------------------------------

function countFilled(shot) {
  if (!shot) return 0;
  return Object.values(shot).filter((v) => v !== undefined && v !== null && String(v).trim() !== '').length;
}

export default function ShotListBuilder({
  shots = [],
  onChange,
  renderShot,
  newShot = {},
  min = 2,
  max = 10
}) {
  const update = (i, patch) => {
    const next = [...shots];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i) => onChange(shots.filter((_, idx) => idx !== i));
  const add = () => {
    if (shots.length < max) onChange([...shots, { ...newShot }]);
  };

  return (
    <div className="shot-builder">
      <div className="field-head">
        <span className="field-label">Shot list builder</span>
        <button type="button" className="link-btn" onClick={add} disabled={shots.length >= max}>
          + add shot ({shots.length}/{max})
        </button>
      </div>
      <p className="field-hint">
        Build a {min}–{max} shot sequence. Each shot can override the base settings —
        leave a field empty to inherit the base value. Shots are generated in order and stitched
        into one video after the last one finishes.
      </p>
      {shots.map((shot, i) => {
        const filled = countFilled(shot);
        return (
          <details key={i} className="shot-card" open={i === 0}>
            <summary>
              <span className="shot-num">Shot {i + 1}</span>
              {filled > 0 ? <span className="chip chip-ok">{filled} override{filled === 1 ? '' : 's'}</span> : <span className="chip chip-muted">inherits base</span>}
              {shots.length > min ? (
                <button
                  type="button"
                  className="link-btn link-danger"
                  onClick={(e) => { e.preventDefault(); remove(i); }}
                >
                  remove
                </button>
              ) : null}
            </summary>
            <div className="shot-fields">{renderShot(shot, (patch) => update(i, patch))}</div>
          </details>
        );
      })}
    </div>
  );
}