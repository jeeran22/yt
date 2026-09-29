export default function TextAreaField({ label, value, onChange, placeholder, rows = 4, maxLength, hint, count = true }) {
  const len = value ? value.length : 0;
  return (
    <label className="field">
      <span className="field-head">
        <span className="field-label">{label}</span>
        {count && maxLength ? <span className="field-value">{len}/{maxLength}</span> : null}
      </span>
      <textarea
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}