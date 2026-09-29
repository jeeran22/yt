export default function Spinner({ label = 'Working…', size = 'md', inline = false }) {
  return (
    <div className={`spinner-wrap spinner-${size}${inline ? ' is-inline' : ''}`} role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}