export default function EmptyState({ icon = '📄', title, text, actions = [] }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {actions.length ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}