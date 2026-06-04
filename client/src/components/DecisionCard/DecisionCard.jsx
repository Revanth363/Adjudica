import Badge from "../shared/Badge";
import ConfidenceBar from "../shared/ConfidenceBar";
import EvidencePanel from "./EvidencePanel";
import "./DecisionCard.css";

// ─── DecisionCard ─────────────────────────────────────────────────────────────
// Renders the full adjudication result for a claim.
// decision: the full decision object from the API response.
// onResubmit: optional callback — shows "Submit New Claim" button

const DECISION_CONFIG = {
  APPROVED: {
    icon: "✓",
    heading: "Claim Approved",
    desc: "Your claim has been approved. The amount will be credited within 5–7 business days.",
    cls: "dc-verdict--approved",
    iconCls: "dc-verdict__icon--approved",
  },
  REJECTED: {
    icon: "✕",
    heading: "Claim Rejected",
    desc: "Your claim could not be approved. See the reasons below.",
    cls: "dc-verdict--rejected",
    iconCls: "dc-verdict__icon--rejected",
  },
  PARTIAL: {
    icon: "◑",
    heading: "Partially Approved",
    desc: "Part of your claim was approved. Some items were excluded — see details below.",
    cls: "dc-verdict--partial",
    iconCls: "dc-verdict__icon--partial",
  },
  MANUAL_REVIEW: {
    icon: "⟳",
    heading: "Sent for Manual Review",
    desc: "Your claim requires human review. A claims officer will contact you within 2 business days.",
    cls: "dc-verdict--review",
    iconCls: "dc-verdict__icon--review",
  },
};

function formatCurrency(amount) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export default function DecisionCard({ decision, onResubmit }) {
  if (!decision) return null;

  const config = DECISION_CONFIG[decision.decision] ?? DECISION_CONFIG["MANUAL_REVIEW"];

  const showApprovedAmount =
    decision.decision === "APPROVED" ||
    decision.decision === "PARTIAL";

  return (
    <div className="dc-root">
      {/* ── Verdict Banner ──────────────────────────────────────────────── */}
      <div className={`dc-verdict ${config.cls}`}>
        <div className={`dc-verdict__icon ${config.iconCls}`}>
          {config.icon}
        </div>
        <div className="dc-verdict__body">
          <div className="dc-verdict__top">
            <h2 className="dc-verdict__heading">{config.heading}</h2>
            <Badge decision={decision.decision} />
          </div>
          <p className="dc-verdict__desc">{config.desc}</p>
        </div>
      </div>

      {/* ── Claim Summary ───────────────────────────────────────────────── */}
      <div className="dc-summary">
        <div className="dc-summary__grid">
          <div className="dc-summary__item">
            <p className="dc-summary__label">Claim ID</p>
            <p className="dc-summary__value dc-summary__value--mono">
              {decision.claim_id}
            </p>
          </div>

          <div className="dc-summary__item">
            <p className="dc-summary__label">Claim Amount</p>
            <p className="dc-summary__value">
              {formatCurrency(decision.claim_amount)}
            </p>
          </div>

          {showApprovedAmount && (
            <div className="dc-summary__item">
              <p className="dc-summary__label">Approved Amount</p>
              <p className="dc-summary__value dc-summary__value--green">
                {formatCurrency(decision.approved_amount)}
              </p>
            </div>
          )}

          <div className="dc-summary__item">
            <p className="dc-summary__label">Decision</p>
            <Badge decision={decision.decision} />
          </div>
        </div>

        {/* Confidence score */}
        <div className="dc-summary__confidence">
          <ConfidenceBar score={decision.confidence_score} />
        </div>
      </div>

      {/* ── Deductions breakdown ────────────────────────────────────────── */}
      {decision.deductions && Object.keys(decision.deductions).length > 0 && (
        <div className="dc-deductions">
          <h3 className="dc-deductions__title">Amount Breakdown</h3>
          <ul className="dc-deductions__list">
            {decision.deductions.excluded_items != null && (
              <li>
                <span>Excluded items</span>
                <span className="dc-deductions__neg">
                  − {formatCurrency(decision.deductions.excluded_items)}
                </span>
              </li>
            )}
            {decision.deductions.per_claim_cap != null && (
              <li>
                <span>Per-claim limit cap</span>
                <span className="dc-deductions__neg">
                  − {formatCurrency(decision.deductions.per_claim_cap)}
                </span>
              </li>
            )}
            {decision.deductions.sub_limit != null && (
              <li>
                <span>Sub-limit deduction</span>
                <span className="dc-deductions__neg">
                  − {formatCurrency(decision.deductions.sub_limit)}
                </span>
              </li>
            )}
            {decision.deductions.network_discount != null && (
              <li>
                <span>Network discount</span>
                <span className="dc-deductions__neg">
                  − {formatCurrency(decision.deductions.network_discount)}
                </span>
              </li>
            )}
            {decision.deductions.copay != null && (
              <li>
                <span>Co-payment (10%)</span>
                <span className="dc-deductions__neg">
                  − {formatCurrency(decision.deductions.copay)}
                </span>
              </li>
            )}
            {showApprovedAmount && (
              <li className="dc-deductions__total">
                <span>Final Approved</span>
                <span className="dc-deductions__pos">
                  {formatCurrency(decision.approved_amount)}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── Rejection reasons ───────────────────────────────────────────── */}
      {decision.rejection_reasons?.length > 0 && (
        <div className="dc-reasons">
          <h3 className="dc-reasons__title">Rejection Reasons</h3>
          <ul className="dc-reasons__list">
            {decision.rejection_reasons.map((r) => (
              <li key={r}>
                <span className="dc-reasons__dot" />
                {r.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Rejected items (partial) ────────────────────────────────────── */}
      {decision.rejected_items?.length > 0 && (
        <div className="dc-reasons">
          <h3 className="dc-reasons__title">Excluded Items</h3>
          <ul className="dc-reasons__list">
            {decision.rejected_items.map((item, i) => (
              <li key={i}>
                <span className="dc-reasons__dot" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Fraud flags ─────────────────────────────────────────────────── */}
      {decision.fraud_flags?.length > 0 && (
        <div className="dc-fraud">
          <h3 className="dc-fraud__title">⚑ Fraud Flags Detected</h3>
          <ul className="dc-fraud__list">
            {decision.fraud_flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Next steps ──────────────────────────────────────────────────── */}
      {decision.next_steps && (
        <div className="dc-next">
          <h3 className="dc-next__title">Next Steps</h3>
          <p className="dc-next__text">{decision.next_steps}</p>
        </div>
      )}

      {/* ── Evidence trail ──────────────────────────────────────────────── */}
      {decision.evidence && (
        <EvidencePanel evidence={decision.evidence} />
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      {onResubmit && (
        <div className="dc-actions">
          <button className="dc-actions__btn" onClick={onResubmit}>
            Submit Another Claim
          </button>
        </div>
      )}
    </div>
  );
}