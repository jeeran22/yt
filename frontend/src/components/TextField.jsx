export default function TextField({ label, value, onChange, placeholder, hint, list, disabled = false }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        className="input"
        value={value}
        placeholder={placeholder}
        list={list}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}