export default function SliderField({ label, value, min, max, step = 1, onChange, hint, format }) {
  return (
    <label className="field">
      <span className="field-head">
        <span className="field-label">{label}</span>
        <span className="field-value mono">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </span>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}