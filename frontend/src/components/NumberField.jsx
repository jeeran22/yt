import { randomInt } from '../lib/utils.js';

export default function NumberField({
  label, value, onChange, placeholder, min, max, randomize = false, hint, step = 1
}) {
  return (
    <label className="field">
      <span className="field-head">
        <span className="field-label">{label}</span>
        {randomize ? (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              const lo = (min !== undefined ? min : 0);
              const hi = (max !== undefined ? max : 4294967294);
              onChange(String(randomInt(Math.min(lo, hi), Math.min(hi, 4294967294))));
            }}
          >
            🎲 randomize
          </button>
        ) : null}
      </span>
      <input
        type="number"
        className="input"
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}