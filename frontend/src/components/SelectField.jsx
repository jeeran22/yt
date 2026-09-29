export default function SelectField({ label, value, options = [], onChange, hint, disabled = false }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
          return (
            <option key={String(val)} value={val}>{text}</option>
          );
        })}
      </select>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}