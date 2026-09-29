export default function ErrorBox({ error, onRetry, retryLabel = 'Try again' }) {
  if (!error) return null;
  const message = (error && error.message) || 'Something went wrong.';
  const code = error && error.code;
  const detail = error && error.detail;

  let detailText = null;
  if (typeof detail === 'string' && detail.trim()) detailText = detail;
  else if (detail && typeof detail === 'object') {
    try { detailText = JSON.stringify(detail, null, 2).slice(0, 400); } catch (e) { detailText = null; }
  }

  return (
    <div className="error-box" role="alert">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <div className="error-body">
        <strong className="error-message">{message}</strong>
        {code ? <span className="chip chip-err mono">{code}</span> : null}
        {detailText ? <pre className="error-detail">{detailText}</pre> : null}
        {onRetry ? (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>{retryLabel}</button>
        ) : null}
      </div>
    </div>
  );
}