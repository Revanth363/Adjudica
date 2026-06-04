import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiX } from "react-icons/fi";
import DecisionCard from "../components/DecisionCard/DecisionCard";
import Loader from "../components/shared/Loader";
import { getClaimById } from "../services/api";
import "./ClaimStatus.css";

// ─── ClaimStatus ──────────────────────────────────────────────────────────────
// Two entry points:
//   1. Navigated from ClaimForm after submission — decision is in location.state
//   2. Accessed directly via /claims/:id — fetches from API

export default function ClaimStatus() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [decision, setDecision] = useState(location.state?.decision || null);
  const [loading, setLoading] = useState(!decision && !!id);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // If we already have the decision from navigation state, skip the fetch
    if (decision || !id) return;

    async function fetchClaim() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await getClaimById(id);
        setDecision(data.data);
      } catch (err) {
        const msg =
          err.response?.status === 404
            ? `Claim "${id}" not found.`
            : "Failed to load claim. Please try again.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchClaim();
  }, [id]);

  // ── Search form (when accessed without an ID) ─────────────────────────────
  const [searchId, setSearchId] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    const trimmed = searchId.trim();
    if (!trimmed) return;
    navigate(`/claims/${trimmed}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="cs-root">
      {/* Navbar strip */}
      <div className="cs-nav">
        <button className="cs-nav__back" onClick={() => navigate("/")}>
          ← Home
        </button>
        <span className="cs-nav__title">Claim Status</span>
        <button
          className="cs-nav__submit"
          onClick={() => navigate("/submit")}
        >
          New Claim
        </button>
      </div>

      <div className="cs-inner">
        {/* Search bar — always visible so user can look up another claim */}
        <form className="cs-search" onSubmit={handleSearch}>
          <input
            type="text"
            className="cs-search__input"
            placeholder="Enter Claim ID — e.g. CLM_1234567890"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" className="cs-search__btn">Look Up</button>
          <button type="button" className="cs-search__btn" onClick={() => navigate('/all-claims')}>All Claims</button>
        </form>
        {loading && (
          <div className="cs-state">
            <Loader variant="spinner" message="Fetching claim..." />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="cs-error">
            <p>⚠️ {error}</p>
            <button
              className="cs-error__btn"
              onClick={() => navigate("/submit")}
            >
              Submit a New Claim
            </button>
          </div>
        )}

        {/* Empty state — no ID in URL and no result yet */}
        {!id && !decision && !loading && !error && (
          <div className="cs-empty">
            <span className="cs-empty__icon">🔍</span>
            <p className="cs-empty__msg">
              Enter a Claim ID above to check its status.
            </p>
          </div>
        )}

        {/* Decision */}
        {decision && !loading && (
          <div className="cs-result">
            <div className="cs-result__meta">
              <span className="cs-result__id">{decision.claim_id}</span>
              {decision.createdAt && (
                <span className="cs-result__date">
                  Submitted on{" "}
                  {new Date(decision.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {decision.extracted ? (
              <>
                {/* Mobile sidebar toggle button */}
                <button
                  className="cs-mobile-toggle"
                  onClick={() => setIsSidebarOpen(true)}
                  type="button"
                >
                  <FiArrowLeft size={16} />
                  <span>Medical Insights</span>
                </button>

                {/* Sidebar background overlay */}
                {isSidebarOpen && (
                  <div
                    className="cs-sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                )}

                <div className="cs-grid">
                  <div className="cs-col cs-col--left">
                    <DecisionCard decision={decision} onResubmit={null} />
                  </div>
                  <div className={`cs-col cs-col--right ${isSidebarOpen ? "cs-sidebar--open" : ""}`}>
                    <div className="cs-sidebar-header">
                      <span className="cs-sidebar-header__title">Medical Details</span>
                      <button
                        className="cs-sidebar-close"
                        onClick={() => setIsSidebarOpen(false)}
                        type="button"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                    <div className="cs-medical">
                    <h3 className="cs-medical__title">Medical & Extraction Insights</h3>
                    <p className="cs-medical__subtitle">
                      Clinical data extracted from submitted documents.
                    </p>

                    <div className="cs-medical__section">
                      <h4 className="cs-medical__section-title">Patient & Treatment</h4>
                      <div className="cs-medical__grid">
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Patient Name</span>
                          <span className="cs-medical__value">
                            {decision.extracted.patient_name || decision.member_name || "—"}
                          </span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Patient Age</span>
                          <span className="cs-medical__value">
                            {decision.extracted.patient_age ? `${decision.extracted.patient_age} years` : "—"}
                          </span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Treatment Date</span>
                          <span className="cs-medical__value">
                            {decision.extracted.treatment_date
                              ? new Date(decision.extracted.treatment_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Treatment Type</span>
                          <span className="cs-medical__value cs-medical__value--type">
                            {decision.extracted.service_type || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cs-medical__section">
                      <h4 className="cs-medical__section-title">Diagnosis & Medical Provider</h4>
                      <div className="cs-medical__grid">
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Diagnosis</span>
                          <span className="cs-medical__value cs-medical__value--diagnosis">
                            {decision.extracted.diagnosis || "—"}
                          </span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Doctor Name</span>
                          <span className="cs-medical__value">{decision.extracted.doctor_name || "—"}</span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Doctor Reg. No</span>
                          <span className="cs-medical__value cs-medical__value--mono">
                            {decision.extracted.doctor_registration_number || "—"}
                          </span>
                        </div>
                        <div className="cs-medical__item">
                          <span className="cs-medical__label">Facility Name</span>
                          <span className="cs-medical__value">
                            {decision.extracted.clinic_name || decision.extracted.hospital_name || decision.hospital || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {decision.extracted.medicines && decision.extracted.medicines.length > 0 && (
                      <div className="cs-medical__section">
                        <h4 className="cs-medical__section-title">Prescribed Medicines</h4>
                        <ul className="cs-medical__list">
                          {decision.extracted.medicines.map((med, idx) => (
                            <li key={idx} className="cs-medical__list-item">
                              <span className="cs-medical__bullet">💊</span>
                              <span className="cs-medical__list-text">{med}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {((decision.extracted.tests && decision.extracted.tests.length > 0) ||
                      (decision.extracted.procedures && decision.extracted.procedures.length > 0)) && (
                      <div className="cs-medical__section">
                        <h4 className="cs-medical__section-title">Diagnostics & Procedures</h4>
                        <ul className="cs-medical__list">
                          {decision.extracted.tests?.map((test, idx) => (
                            <li key={`test-${idx}`} className="cs-medical__list-item">
                              <span className="cs-medical__bullet">🔬</span>
                              <span className="cs-medical__list-text">{test}</span>
                            </li>
                          ))}
                          {decision.extracted.procedures?.map((proc, idx) => (
                            <li key={`proc-${idx}`} className="cs-medical__list-item">
                              <span className="cs-medical__bullet">🩺</span>
                              <span className="cs-medical__list-text">{proc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {decision.extracted.bill_items && decision.extracted.bill_items.length > 0 && (
                      <div className="cs-medical__section">
                        <h4 className="cs-medical__section-title">Invoice Itemization</h4>
                        <div className="cs-medical__bills">
                          {decision.extracted.bill_items.map((item, idx) => (
                            <div key={idx} className="cs-medical__bill-row">
                              <span className="cs-medical__bill-name">{item.name}</span>
                              <span className="cs-medical__bill-amount">
                                ₹{Number(item.amount).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="cs-single-col">
              <DecisionCard decision={decision} onResubmit={null} />
            </div>
          )}

            <div className="cs-actions-bar">
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}