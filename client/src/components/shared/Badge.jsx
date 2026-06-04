import "./Badge.css";

// ─── Badge ────────────────────────────────────────────────────────────────────
// Renders a colored status pill for claim decisions.
// decision: "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW" | "PENDING"

const DECISION_MAP = {
  APPROVED:      { label: "Approved",       cls: "badge--approved" },
  REJECTED:      { label: "Rejected",       cls: "badge--rejected" },
  PARTIAL:       { label: "Partial",        cls: "badge--partial"  },
  MANUAL_REVIEW: { label: "Manual Review",  cls: "badge--review"   },
  PENDING:       { label: "Pending",        cls: "badge--pending"  },
};

export default function Badge({ decision }) {
  const config = DECISION_MAP[decision] ?? { label: decision, cls: "badge--pending" };

  return (
    <span className={`badge ${config.cls}`}>
      {config.label}
    </span>
  );
}