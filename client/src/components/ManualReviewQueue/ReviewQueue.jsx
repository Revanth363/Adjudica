import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../shared/Badge";
import ConfidenceBar from "../shared/ConfidenceBar";
import Loader from "../shared/Loader";
import { submitReview } from "../../services/api";
import "./ReviewQueue.css";

// ─── ReviewQueue ──────────────────────────────────────────────────────────────
// Table of claims in MANUAL_REVIEW state.
// Lets a human reviewer approve, partially approve, or reject each claim.
//
// Props:
//   claims: Claim[] — from API
//   loading: boolean
//   onRefresh: () => void — called after a review is submitted

export default function ReviewQueue({ claims = [], loading, onRefresh }) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [reviewing, setReviewing] = useState(null); // claim_id being submitted
  const [reviewForms, setReviewForms] = useState({}); // { [claim_id]: { decision, notes } }
  const [submitError, setSubmitError] = useState(null);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function getForm(claimId) {
    return reviewForms[claimId] ?? { decision: "APPROVED", reviewer_notes: "" };
  }

  function setForm(claimId, patch) {
    setReviewForms((prev) => ({
      ...prev,
      [claimId]: { ...getForm(claimId), ...patch },
    }));
  }

  async function handleSubmitReview(claimId) {
    const form = getForm(claimId);
    if (!form.decision) return;

    setReviewing(claimId);
    setSubmitError(null);

    const claim = claims.find((c) => c.claim_id === claimId);
    const final_approved_amount = form.decision === "PARTIAL"
      ? (form.final_approved_amount !== undefined ? form.final_approved_amount : (claim?.approved_amount || 0))
      : undefined;

    try {
      await submitReview(claimId, {
        final_decision: form.decision,
        reviewer_notes: form.reviewer_notes,
        reviewed_by: "Manual Reviewer",
        final_approved_amount,
      });
      onRefresh?.();
      setExpandedId(null);
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setReviewing(null);
    }
  }

  if (loading) {
    return (
      <div className="rq-state">
        <Loader variant="spinner" message="Loading review queue..." />
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="rq-empty">
        <span className="rq-empty__icon"></span>
        <p className="rq-empty__msg">No claims pending manual review.</p>
      </div>
    );
  }

  return (
    <div className="rq-root">
      {submitError && (
        <div className="rq-error">{submitError}</div>
      )}

      <table className="rq-table">
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Member</th>
            <th>Diagnosis</th>
            <th>Amount</th>
            <th>Confidence</th>
            <th>Flags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => {
            const isExpanded = expandedId === claim.claim_id;
            const form = getForm(claim.claim_id);
            const isSubmitting = reviewing === claim.claim_id;

            return (
              <>
                <tr
                  key={claim.claim_id}
                  className={`rq-row ${isExpanded ? "rq-row--expanded" : ""}`}
                >
                  <td>
                    <button
                      className="rq-id-btn"
                      onClick={() => navigate(`/claims/${claim.claim_id}`)}
                    >
                      {claim.claim_id}
                    </button>
                  </td>
                  <td>
                    <p className="rq-member-name">{claim.member_name}</p>
                    <p className="rq-member-id">{claim.member_id}</p>
                  </td>
                  <td>
                    <p className="rq-diagnosis">
                      {claim.extracted?.diagnosis || "—"}
                    </p>
                  </td>
                  <td>
                    <p className="rq-amount">
                      ₹{Number(claim.claim_amount).toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td>
                    <div className="rq-confidence">
                      <span className="rq-confidence__num">
                        {Math.round((claim.confidence_score ?? 0) * 100)}%
                      </span>
                      <ConfidenceBar score={claim.confidence_score} showLabel={false} />
                    </div>
                  </td>
                  <td>
                    {claim.fraud_flags?.length > 0 ? (
                      <span className="rq-flags">
                        ⚑ {claim.fraud_flags.length} flag{claim.fraud_flags.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="rq-no-flags">None</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="rq-review-btn"
                      onClick={() => toggleExpand(claim.claim_id)}
                    >
                      {isExpanded ? "Close" : "Review"}
                    </button>
                  </td>
                </tr>

                {/* Expanded review panel */}
                {isExpanded && (
                  <tr key={`${claim.claim_id}-expand`} className="rq-expand-row">
                    <td colSpan={7}>
                      <div className="rq-panel">
                        {/* Fraud flags */}
                        {claim.fraud_flags?.length > 0 && (
                          <div className="rq-panel__flags">
                            <p className="rq-panel__flags-title">⚑ Fraud Flags</p>
                            <ul>
                              {claim.fraud_flags.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* AI notes */}
                        {claim.notes && (
                          <div className="rq-panel__notes">
                            <p className="rq-panel__notes-title">AI Notes</p>
                            <p>{claim.notes}</p>
                          </div>
                        )}

                        {/* Review form */}
                        <div className="rq-panel__form">
                          <div className="rq-panel__form-row">
                            <div className="rq-panel__field">
                              <label className="rq-panel__label">Your Decision</label>
                              <select
                                className="rq-panel__select"
                                value={form.decision}
                                onChange={(e) =>
                                  setForm(claim.claim_id, { decision: e.target.value })
                                }
                                disabled={isSubmitting}
                              >
                                <option value="APPROVED">Approve</option>
                                <option value="REJECTED">Reject</option>
                                <option value="PARTIAL">Partially Approve</option>
                              </select>
                            </div>

                            {form.decision === "PARTIAL" && (
                              <div className="rq-panel__field" style={{ minWidth: "150px" }}>
                                <label className="rq-panel__label">Approved Amount (₹)</label>
                                <input
                                  type="number"
                                  className="rq-panel__input"
                                  placeholder={claim.approved_amount || 0}
                                  value={form.final_approved_amount ?? ""}
                                  onChange={(e) =>
                                    setForm(claim.claim_id, { final_approved_amount: Number(e.target.value) })
                                  }
                                  disabled={isSubmitting}
                                  min="0"
                                  max={claim.claim_amount}
                                />
                              </div>
                            )}

                            <div className="rq-panel__field rq-panel__field--wide">
                              <label className="rq-panel__label">Reviewer Notes</label>
                              <input
                                type="text"
                                className="rq-panel__input"
                                placeholder="Add notes for the claimant..."
                                value={form.reviewer_notes}
                                onChange={(e) =>
                                  setForm(claim.claim_id, { reviewer_notes: e.target.value })
                                }
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>

                          <div className="rq-panel__actions">
                            <button
                              className="rq-panel__cancel"
                              onClick={() => setExpandedId(null)}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </button>
                            <button
                              className="rq-panel__submit"
                              onClick={() => handleSubmitReview(claim.claim_id)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? "Submitting..." : "Submit Review"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}