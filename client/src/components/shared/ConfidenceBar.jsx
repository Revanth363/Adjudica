import "./ConfidenceBar.css";

// ─── ConfidenceBar ────────────────────────────────────────────────────────────
// Visual meter showing adjudication confidence score (0–1 or 0–100).
// score: number — accepts either 0.94 or 94 (normalized internally)
// showLabel: boolean — whether to show "94%" text alongside the bar

function normalizeScore(score) {
  if (score == null) return 0;
  // Accept both 0.94 and 94 formats
  return score > 1 ? score : score * 100;
}

function getColorClass(pct) {
  if (pct >= 85) return "conf-bar__fill--high";
  if (pct >= 70) return "conf-bar__fill--mid";
  return "conf-bar__fill--low";
}

function getLabel(pct) {
  if (pct >= 85) return "High confidence";
  if (pct >= 70) return "Moderate confidence";
  return "Low confidence";
}

export default function ConfidenceBar({ score, showLabel = true }) {
  const pct = normalizeScore(score);
  const colorClass = getColorClass(pct);

  return (
    <div className="conf-bar">
      {showLabel && (
        <div className="conf-bar__header">
          <span className="conf-bar__title">Confidence Score</span>
          <span className="conf-bar__pct">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="conf-bar__track">
        <div
          className={`conf-bar__fill ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="conf-bar__hint">{getLabel(pct)}</p>
      )}
    </div>
  );
}