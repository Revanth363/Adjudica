import "./EvidencePanel.css";

// ─── EvidencePanel ────────────────────────────────────────────────────────────
// Shows which adjudication step passed or failed and why.
// evidence: object from the decision API response — keyed by step name.

const STEP_LABELS = {
  eligibility: "Eligibility Check",
  documents:   "Document Validation",
  coverage:    "Coverage Verification",
  limits:      "Limit Validation",
  medical:     "Medical Necessity",
  fraud:       "Fraud Screening",
};

const REJECTION_LABELS = {
  POLICY_INACTIVE:       "Policy not active on treatment date",
  WAITING_PERIOD:        "Waiting period not satisfied",
  MEMBER_NOT_COVERED:    "Member not found in policy",
  MISSING_DOCUMENTS:     "Required documents missing",
  ILLEGIBLE_DOCUMENTS:   "Documents not readable",
  INVALID_PRESCRIPTION:  "Prescription invalid",
  DOCTOR_REG_INVALID:    "Doctor registration number invalid",
  DATE_MISMATCH:         "Document dates don't match",
  PATIENT_MISMATCH:      "Patient details don't match policy",
  SERVICE_NOT_COVERED:   "Service not covered under policy",
  EXCLUDED_CONDITION:    "Condition is excluded",
  PRE_AUTH_MISSING:      "Pre-authorization not obtained",
  ANNUAL_LIMIT_EXCEEDED: "Annual limit exhausted",
  SUB_LIMIT_EXCEEDED:    "Category sub-limit exceeded",
  PER_CLAIM_EXCEEDED:    "Per-claim limit exceeded",
  NOT_MEDICALLY_NECESSARY: "Treatment not medically justified",
  COSMETIC_PROCEDURE:    "Cosmetic procedure — not covered",
  EXPERIMENTAL_TREATMENT: "Experimental treatment",
  LATE_SUBMISSION:       "Submitted after 30-day deadline",
  DUPLICATE_CLAIM:       "Duplicate claim detected",
  BELOW_MIN_AMOUNT:      "Below minimum claim amount",
};

function StepRow({ stepKey, stepData }) {
  const label = STEP_LABELS[stepKey] || stepKey;
  const reasons = stepData?.reasons || [];
  const flags = stepData?.flags || [];
  const excludedItems = stepData?.excluded_items || [];

  const hasFailed = reasons.length > 0 || flags.length > 0;
  const hasExclusions = excludedItems.length > 0;

  // Fraud step has a different shape
  const isFraud = stepKey === "fraud";
  const passed = isFraud ? flags.length === 0 : stepData?.passed;

  return (
    <div className={`ep-step ${hasFailed ? "ep-step--fail" : "ep-step--pass"}`}>
      <div className="ep-step__header">
        <span className="ep-step__icon">
          {hasFailed ? "✕" : "✓"}
        </span>
        <span className="ep-step__label">{label}</span>
        <span className={`ep-step__status ${hasFailed ? "ep-step__status--fail" : "ep-step__status--pass"}`}>
          {hasFailed ? "Failed" : "Passed"}
        </span>
      </div>

      {reasons.length > 0 && (
        <ul className="ep-step__reasons">
          {reasons.map((r) => (
            <li key={r}>
              <code className="ep-step__code">{r}</code>
              <span className="ep-step__reason-label">
                {REJECTION_LABELS[r] ? ` — ${REJECTION_LABELS[r]}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {flags.length > 0 && (
        <ul className="ep-step__reasons ep-step__reasons--flags">
          {flags.map((f, i) => (
            <li key={i}>⚑ {f}</li>
          ))}
        </ul>
      )}

      {hasExclusions && (
        <ul className="ep-step__reasons ep-step__reasons--exclusions">
          {excludedItems.map((item, i) => (
            <li key={i}>
              🚫 <strong>{item.name}</strong> — ₹{item.amount?.toLocaleString("en-IN")} excluded
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EvidencePanel({ evidence }) {
  if (!evidence) return null;

  const stepKeys = ["eligibility", "documents", "coverage", "limits", "medical", "fraud"];

  return (
    <div className="ep-root">
      <h3 className="ep-title">Adjudication Evidence Trail</h3>
      <p className="ep-subtitle">
        Step-by-step breakdown of how the decision was reached.
      </p>
      <div className="ep-steps">
        {stepKeys.map((key) =>
          evidence[key] ? (
            <StepRow key={key} stepKey={key} stepData={evidence[key]} />
          ) : null
        )}
      </div>
    </div>
  );
}