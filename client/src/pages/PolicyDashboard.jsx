import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdShield,
  MdEditNote,
  MdSave,
  MdClose,
  MdArrowBack,
  MdCheckCircle,
  MdError,
  MdWarning,
  MdCreditCard,
  MdTimer,
  MdSearch,
  MdCategory,
  MdLocalHospital,
  MdVisibility,
} from "react-icons/md";
import { getPolicy, updatePolicy } from "../services/policyApi";
import "./PolicyDashboard.css";

// ─── Section config ───────────────────────────────────────────────────────────
// Keys match the nested policy structure from server/config/policy.js

const SECTIONS = [
  {
    title: "Coverage Limits",
    Icon: MdShield,
    fields: [
      { key: "coverage_details.annual_limit",     label: "Annual Limit",         unit: "₹" },
      { key: "coverage_details.per_claim_limit",  label: "Per Claim Limit",      unit: "₹" },
      { key: "claim_requirements.minimum_claim_amount", label: "Minimum Claim Amount", unit: "₹" },
      { key: "claim_requirements.submission_timeline_days", label: "Submission Deadline", unit: "days" },
    ],
  },
  {
    title: "Consultation & Pharmacy",
    Icon: MdLocalHospital,
    fields: [
      { key: "coverage_details.consultation_fees.sub_limit",        label: "Consultation Sub-limit",      unit: "₹" },
      { key: "coverage_details.consultation_fees.copay_percentage",  label: "Co-payment",                 unit: "%" },
      { key: "coverage_details.consultation_fees.network_discount",  label: "Network Hospital Discount",  unit: "%" },
      { key: "coverage_details.pharmacy.sub_limit",                  label: "Pharmacy Sub-limit",         unit: "₹" },
      { key: "coverage_details.pharmacy.branded_drugs_copay",        label: "Branded Drugs Co-pay",       unit: "%" },
    ],
  },
  {
    title: "Diagnostics & Procedures",
    Icon: MdCategory,
    fields: [
      { key: "coverage_details.diagnostic_tests.sub_limit", label: "Diagnostics Sub-limit", unit: "₹" },
      { key: "coverage_details.dental.sub_limit",           label: "Dental Sub-limit",      unit: "₹" },
      { key: "coverage_details.dental.routine_checkup_limit", label: "Routine Checkup Limit", unit: "₹" },
      { key: "coverage_details.vision.sub_limit",           label: "Vision Sub-limit",      unit: "₹" },
      { key: "coverage_details.alternative_medicine.sub_limit", label: "Alternative Medicine", unit: "₹" },
    ],
  },
  {
    title: "Payment Rules",
    Icon: MdCreditCard,
    fields: [
      { key: "cashless_facilities.instant_approval_limit", label: "Cashless Instant Approval Limit", unit: "₹" },
      { key: "high_value_manual_review_threshold",         label: "High-Value Claim Threshold",      unit: "₹" },
      { key: "max_claims_per_day",                         label: "Max Claims Per Day (fraud)",       unit: ""  },
      { key: "manual_review_confidence_threshold",         label: "Manual Review Confidence Below",  unit: "%" },
    ],
  },
  {
    title: "Waiting Periods",
    Icon: MdTimer,
    fields: [
      { key: "waiting_periods.initial_waiting",              label: "General Waiting Period",    unit: "days" },
      { key: "waiting_periods.pre_existing_diseases",        label: "Pre-existing Diseases",     unit: "days" },
      { key: "waiting_periods.specific_ailments.diabetes",   label: "Diabetes",                  unit: "days" },
      { key: "waiting_periods.specific_ailments.hypertension", label: "Hypertension",            unit: "days" },
    ],
  },
  {
    title: "Review Thresholds",
    Icon: MdSearch,
    fields: [
      { key: "coverage_details.family_floater_limit", label: "Family Floater Limit", unit: "₹" },
      { key: "coverage_details.alternative_medicine.therapy_sessions_limit", label: "Therapy Sessions Limit", unit: "" },
      { key: "waiting_periods.maternity",             label: "Maternity Waiting Period", unit: "days" },
      { key: "waiting_periods.specific_ailments.joint_replacement", label: "Joint Replacement", unit: "days" },
    ],
  },
];

// ─── Nested key helpers ───────────────────────────────────────────────────────
// Get/set a deeply nested value using dot-notation key like "coverage_details.annual_limit"

function getNestedValue(obj, dotKey) {
  return dotKey.split(".").reduce((acc, k) => acc?.[k], obj);
}

function setNestedValue(obj, dotKey, value) {
  const keys = dotKey.split(".");
  const result = JSON.parse(JSON.stringify(obj)); // deep clone
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] == null) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

// ─── Format display value ─────────────────────────────────────────────────────

function formatValue(value, unit) {
  if (value == null || value === "") return "—";
  // Form already stores confidence as 70 (converted in getInputValue), not 0.7
  // So all % fields including confidence display correctly with this single rule
  if (unit === "₹")    return `₹${Number(value).toLocaleString("en-IN")}`;
  if (unit === "%")    return `${value}%`;
  if (unit === "days") return `${value} days`;
  return value;
}

function getInputValue(policy, dotKey) {
  const raw = getNestedValue(policy, dotKey);
  // Store confidence as percentage for easy editing
  if (dotKey === "manual_review_confidence_threshold") {
    return raw != null ? (parseFloat(raw) * 100).toFixed(0) : 70;
  }
  return raw ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PolicyDashboard() {
  const navigate = useNavigate();

  const [policy, setPolicy]     = useState(null);  // raw nested object from server
  const [form, setForm]         = useState({});     // flat { dotKey: value } for editing
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPolicy();
        setPolicy(data);
        // Build flat form from all section fields
        const flat = {};
        SECTIONS.forEach((section) =>
          section.fields.forEach(({ key }) => {
            flat[key] = getInputValue(data, key);
          })
        );
        setForm(flat);
      } catch {
        setError("Failed to load policy terms. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCancel() {
    // Reset form back to what's on the server
    const flat = {};
    SECTIONS.forEach((section) =>
      section.fields.forEach(({ key }) => {
        flat[key] = getInputValue(policy, key);
      })
    );
    setForm(flat);
    setEditMode(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Build updated nested object by applying all form values onto current policy
      let updated = JSON.parse(JSON.stringify(policy));
      SECTIONS.forEach((section) =>
        section.fields.forEach(({ key }) => {
          let val = form[key];
          // Convert confidence back from % to decimal
          if (key === "manual_review_confidence_threshold") {
            val = parseFloat(val) / 100;
          } else if (!isNaN(val) && val !== "") {
            val = Number(val);
          }
          updated = setNestedValue(updated, key, val);
        })
      );
      await updatePolicy(updated);
      setPolicy(updated);
      setEditMode(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Dirty count ───────────────────────────────────────────────────────────
  const dirtyCount = policy
    ? Object.keys(form).filter(
        (k) => String(form[k]) !== String(getInputValue(policy, k))
      ).length
    : 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pd-root">
        <div className="pd-loading">
          <div className="pd-loading__spinner" />
          <p>Loading policy terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd-root">

      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <nav className="pd-nav">
        <button className="pd-nav__back" onClick={() => navigate("/")}>
          <MdArrowBack size={16} />
          <span>Home</span>
        </button>

        <div className="pd-nav__center">
          <MdShield size={26} color="#7e57c2" />
          <div>
            <p className="pd-nav__title">Policy Configuration</p>
            <p className="pd-nav__sub">
              {policy?.policy_name ?? "OPD Policy"} &middot; {policy?.policy_id ?? ""}
            </p>
          </div>
        </div>

        <div className="pd-nav__actions">
          {!editMode ? (
            <button
              className="pd-btn pd-btn--primary"
              onClick={() => setEditMode(true)}
            >
              <MdEditNote size={17} />
              Edit Policy
            </button>
          ) : (
            <>
              <button
                className="pd-btn pd-btn--ghost"
                onClick={handleCancel}
                disabled={saving}
              >
                <MdClose size={15} />
                Cancel
              </button>
              <button
                className="pd-btn pd-btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                <MdSave size={15} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {success && (
        <div className="pd-alert pd-alert--success">
          <MdCheckCircle size={16} />
          Policy terms updated successfully.
        </div>
      )}
      {error && (
        <div className="pd-alert pd-alert--error">
          <MdError size={16} />
          {error}
        </div>
      )}

      {/* ── Edit banner ──────────────────────────────────────────────────── */}
      {editMode && (
        <div className="pd-edit-banner">
          <MdWarning size={15} />
          <span>
            You are editing policy terms.
            {dirtyCount > 0 && (
              <strong className="pd-edit-banner__count">
                &nbsp;{dirtyCount} field{dirtyCount > 1 ? "s" : ""} changed.
              </strong>
            )}
            &nbsp;Changes apply to all new claims immediately.
          </span>
        </div>
      )}

      {/* ── Policy meta strip ─────────────────────────────────────────────── */}
      {policy && !editMode && (
        <div className="pd-meta-strip">
          <div className="pd-meta-item">
            <span className="pd-meta-label">Company</span>
            <span className="pd-meta-value">{policy.policy_holder?.company}</span>
          </div>
          <div className="pd-meta-divider" />
          <div className="pd-meta-item">
            <span className="pd-meta-label">Employees Covered</span>
            <span className="pd-meta-value">{policy.policy_holder?.employees_covered}</span>
          </div>
          <div className="pd-meta-divider" />
          <div className="pd-meta-item">
            <span className="pd-meta-label">Effective From</span>
            <span className="pd-meta-value">{policy.effective_date}</span>
          </div>
          <div className="pd-meta-divider" />
          <div className="pd-meta-item">
            <span className="pd-meta-label">Policy ID</span>
            <span className="pd-meta-value pd-meta-value--mono">{policy.policy_id}</span>
          </div>
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="pd-grid">
        {SECTIONS.map((section) => {
          const { Icon } = section;
          return (
            <div className="pd-card" key={section.title}>
              <div className="pd-card__header">
                <Icon size={18} color="#7e57c2" />
                <h2 className="pd-card__title">{section.title}</h2>
              </div>

              <div className="pd-card__fields">
                {section.fields.map(({ key, label, unit }) => {
                  const current  = form[key] ?? "";
                  const original = getInputValue(policy, key);
                  const isDirty  = editMode && String(current) !== String(original);

                  return (
                    <div
                      className={`pd-field ${isDirty ? "pd-field--dirty" : ""}`}
                      key={key}
                    >
                      <div className="pd-field__left">
                        <span className="pd-field__label">{label}</span>
                        {isDirty && (
                          <span className="pd-field__changed">changed</span>
                        )}
                      </div>

                      {editMode ? (
                        <div className="pd-field__input-wrap">
                          {unit === "₹" && (
                            <span className="pd-field__unit">₹</span>
                          )}
                          <input
                            id={key}
                            name={key}
                            type="number"
                            min={0}
                            className="pd-field__input"
                            value={current}
                            onChange={handleChange}
                            disabled={saving}
                          />
                          {unit !== "₹" && unit && (
                            <span className="pd-field__unit pd-field__unit--right">
                              {unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="pd-field__value">
                          {formatValue(current, unit)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sticky save bar ──────────────────────────────────────────────── */}
      {editMode && (
        <div className="pd-save-bar">
          <p className="pd-save-bar__hint">
            {dirtyCount > 0
              ? `${dirtyCount} field${dirtyCount > 1 ? "s" : ""} modified — review carefully before saving.`
              : "No changes made yet."}
          </p>
          <div className="pd-save-bar__actions">
            <button
              className="pd-btn pd-btn--ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              <MdClose size={15} />
              Discard
            </button>
            <button
              className="pd-btn pd-btn--primary"
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
            >
              <MdSave size={15} />
              {saving ? "Saving..." : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}