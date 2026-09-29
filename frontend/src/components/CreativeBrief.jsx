export default function CreativeBrief({ brief, extraRows = [] }) {
  if (!brief) return null;
  const motionTxt = brief.motion
    ? `motion ${brief.motion.motion_bucket_id}, cfg ${brief.motion.cfg_scale}`
    : '';
  const rows = [
    ['Campaign', brief.campaign],
    ['Recommended resolution', brief.recommendedResolution],
    ['Motion', motionTxt],
    ...extraRows.filter((r) => r[1])
  ].filter((r) => r[1]);
  return (
    <details className="brief-box" open>
      <summary>📋 Creative brief</summary>
      <dl className="brief-rows">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>
        ))}
      </dl>
      {brief.imagePrompt ? (
        <div className="brief-image-prompt">
          <span>Image prompt</span>
          <p>{brief.imagePrompt}</p>
        </div>
      ) : null}
      {brief.notes ? <p className="brief-notes">{brief.notes}</p> : null}
    </details>
  );
}