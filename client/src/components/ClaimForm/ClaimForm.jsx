import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DocumentUpload from "./DocumentUpload";
import Loader from "../shared/Loader";
import { submitClaim } from "../../services/api";
import "./ClaimForm.css";

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  member_id: "",
  member_name: "",
  member_join_date: "",
  claim_amount: "",
  treatment_date: "",
  hospital: "",
  cashless_request: false,
  pre_auth_obtained: false,
  ytd_claimed: "",
};

// ─── ClaimForm ────────────────────────────────────────────────────────────────
// Full OPD claim submission form.
// On submit: builds FormData, calls POST /api/claims, navigates to result page.

export default function ClaimForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validate() {
    if (!form.member_id.trim())   return "Member ID is required.";
    if (!form.member_name.trim()) return "Member name is required.";
    if (!form.claim_amount || Number(form.claim_amount) <= 0)
      return "Enter a valid claim amount.";
    if (files.length === 0)
      return "Please upload at least one document (prescription or bill).";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      // Build multipart/form-data — files + all claim fields
      const formData = new FormData();

      files.forEach((file) => formData.append("documents", file));

      // Append all text fields
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, val);
      });

      const { data } = await submitClaim(formData);

      // Navigate to the decision page, passing claim_id
      navigate(`/claims/${data.data.claim_id}`, { state: { decision: data.data } });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {submitting && (
        <Loader
          variant="fullscreen"
          message="Adjudicating your claim..."
        />
      )}

      <div className="claim-form-root">
        {/* Header */}
        <div className="claim-form-header">
          <button
            type="button"
            className="claim-form-back"
            onClick={() => navigate("/")}
          >
            ← Back
          </button>
          <div>
            <h1 className="claim-form-title">Submit OPD Claim</h1>
            <p className="claim-form-subtitle">
              Upload your medical documents and fill in the details below.
              Our AI will adjudicate your claim instantly.
            </p>
          </div>
        </div>

        <form
          className="claim-form"
          onSubmit={handleSubmit}
          noValidate
        >
          {/* ── Section: Member Details ──────────────────────────────────── */}
          <section className="claim-form-section">
            <h2 className="claim-form-section__title">
              <span className="claim-form-section__num">01</span>
              Member Details
            </h2>

            <div className="claim-form-grid">
              <div className="claim-form-field">
                <label htmlFor="member_id" className="claim-form-label">
                  Member ID <span className="claim-form-required">*</span>
                </label>
                <input
                  id="member_id"
                  name="member_id"
                  type="text"
                  className="claim-form-input"
                  placeholder="e.g. EMP001"
                  value={form.member_id}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="claim-form-field">
                <label htmlFor="member_name" className="claim-form-label">
                  Full Name <span className="claim-form-required">*</span>
                </label>
                <input
                  id="member_name"
                  name="member_name"
                  type="text"
                  className="claim-form-input"
                  placeholder="As on policy"
                  value={form.member_name}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="claim-form-field">
                <label htmlFor="member_join_date" className="claim-form-label">
                  Policy Start Date <span className="claim-form-required">*</span>
                </label>
                <input
                  id="member_join_date"
                  name="member_join_date"
                  type="date"
                  className="claim-form-input"
                  value={form.member_join_date}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="claim-form-field">
                <label htmlFor="ytd_claimed" className="claim-form-label">
                  Amount Already Claimed This Year (₹)
                </label>
                <input
                  id="ytd_claimed"
                  name="ytd_claimed"
                  type="number"
                  min="0"
                  className="claim-form-input"
                  placeholder="0"
                  value={form.ytd_claimed}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>
          </section>

          {/* ── Section: Claim Details ───────────────────────────────────── */}
          <section className="claim-form-section">
            <h2 className="claim-form-section__title">
              <span className="claim-form-section__num">02</span>
              Claim Details
            </h2>

            <div className="claim-form-grid">
              <div className="claim-form-field">
                <label htmlFor="claim_amount" className="claim-form-label">
                  Total Claim Amount (₹) <span className="claim-form-required">*</span>
                </label>
                <input
                  id="claim_amount"
                  name="claim_amount"
                  type="number"
                  min="1"
                  className="claim-form-input"
                  placeholder="e.g. 1500"
                  value={form.claim_amount}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="claim-form-field">
                <label htmlFor="treatment_date" className="claim-form-label">
                  Treatment Date 
                </label>
                <input
                  id="treatment_date"
                  name="treatment_date"
                  type="date"
                  className="claim-form-input"
                  value={form.treatment_date}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="claim-form-field">
                <label htmlFor="hospital" className="claim-form-label">
                  Hospital / Clinic Name <span className="claim-form-required">*</span>
                </label>
                <input
                  id="hospital"
                  name="hospital"
                  type="text"
                  className="claim-form-input"
                  placeholder="e.g. Apollo Hospitals"
                  value={form.hospital}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="claim-form-checks">
              <label className="claim-form-check">
                <input
                  type="checkbox"
                  name="cashless_request"
                  checked={form.cashless_request}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>This is a cashless claim (network hospital)</span>
              </label>

              <label className="claim-form-check">
                <input
                  type="checkbox"
                  name="pre_auth_obtained"
                  checked={form.pre_auth_obtained}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <span>Pre-authorization was obtained</span>
              </label>
            </div>
          </section>

          {/* ── Section: Documents ───────────────────────────────────────── */}
          <section className="claim-form-section">
            <h2 className="claim-form-section__title">
              <span className="claim-form-section__num">03</span>
              Upload Documents
            </h2>
            <p className="claim-form-section__hint">
              Upload prescription, medical bills, pharmacy receipts, or diagnostic reports.
              All documents for this claim should be added together.
            </p>
            <DocumentUpload files={files} onChange={setFiles} />
          </section>

          {/* ── Error ────────────────────────────────────────────────────── */}
          {error && (
            <div className="claim-form-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <div className="claim-form-footer">
            <p className="claim-form-footer__note">
              Your documents are processed securely. Decisions are generated by AI
              and may be subject to manual review.
            </p>
            <button
              type="submit"
              className="claim-form-submit"
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Submit Claim →"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}