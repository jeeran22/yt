export default function ProgressBar({ value, max, label, status = 'processing', indeterminate = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress-wrap">
      {label ? (
        <div className="progress-head">
          <span>{label}</span>
          {!indeterminate ? <span className="chip chip-ok">{pct}%</span> : null}
        </div>
      ) : null}
      <div className={`progress${indeterminate ? ' is-indeterminate' : ''}${status === 'failed' ? ' is-failed' : ''}`}>
        {!indeterminate ? <div className="progress-fill" style={{ width: `${pct}%` }} /> : <div className="progress-fill" />}
      </div>
    </div>
  );
}