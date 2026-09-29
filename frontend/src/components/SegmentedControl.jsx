export default function SegmentedControl({ label, value, options = [], onChange }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const text = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
          const isOn = value === val;
          return (
            <button
              key={String(val)}
              type="button"
              role="radio"
              aria-checked={isOn}
              className={isOn ? 'segmented-opt is-on' : 'segmented-opt'}
              onClick={() => onChange(val)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}