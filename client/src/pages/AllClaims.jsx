import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiTrash2 } from "react-icons/fi";
import Loader from "../components/shared/Loader";
import { getAllClaims, deleteClaim } from "../services/api";
import "./AllClaims.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function badgeClass(decision) {
  switch (decision) {
    case "APPROVED":
      return "all-badge all-badge--approved";
    case "REJECTED":
      return "all-badge all-badge--rejected";
    case "PARTIAL":
      return "all-badge all-badge--partial";
    case "MANUAL_REVIEW":
      return "all-badge all-badge--manual";
    default:
      return "all-badge all-badge--pending";
  }
}

function badgeLabel(decision) {
  if (decision === "MANUAL_REVIEW") return "MANUAL REVIEW";
  return decision || "PENDING";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AllClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");

  const handleDelete = async (claimId) => {
    if (!window.confirm(`Are you sure you want to delete claim ${claimId}?`)) {
      return;
    }
    try {
      await deleteClaim(claimId);
      setClaims((prev) => prev.filter((c) => c.claim_id !== claimId));
    } catch (err) {
      console.error("Failed to delete claim:", err);
      alert(err.response?.data?.error || "Failed to delete claim.");
    }
  };

  useEffect(() => {
    async function fetchClaims() {
      try {
        const { data } = await getAllClaims();
        setClaims(data.data || []);
      } catch (err) {
        setError("Failed to load claims. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
  }, []);

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = claims.filter((c) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    const idMatch = (c.claim_id || "").toLowerCase().includes(q);
    const nameMatch = (c.member_name || "").toLowerCase().includes(q);
    const dateStr = new Date(c.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).toLowerCase();
    const dateMatch = dateStr.includes(q);
    return idMatch || nameMatch || dateMatch;
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="all-root">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <div className="all-nav">
        <button className="all-nav__back" onClick={() => navigate("/")}>
          ← Home
        </button>
        <span className="all-nav__title">All Claims</span>
        <div className="all-nav__actions">
      
          <button
            className="all-nav__btn all-nav__btn--primary"
            onClick={() => navigate("/submit")}
          >
            + Submit New Claim
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="all-inner">
        <h1 className="all-heading">Claims Dashboard</h1>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        {!loading && !error && claims.length > 0 && (
          <div className="all-filter">
            <FiSearch className="all-filter__icon" />
            <input
              type="text"
              className="all-filter__input"
              placeholder="Search by Claim ID, Member Name, or Date…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <button
                className="all-filter__clear"
                onClick={() => setFilterText("")}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader variant="spinner" message="Loading claims..." />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="all-error">
            <p>⚠️ {error}</p>
            <button className="all-retry" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && claims.length === 0 && (
          <div className="all-empty">
            <span className="all-empty__icon">📋</span>
            <p className="all-empty__msg">No claims found. Submit your first claim to get started.</p>
          </div>
        )}

        {/* Claims list */}
        {!loading && !error && claims.length > 0 && (
          <>
            {filtered.length === 0 ? (
              <div className="all-empty">
                <FiSearch className="all-empty__icon" />
                <p className="all-empty__msg">
                  No claims match &ldquo;{filterText}&rdquo;
                </p>
              </div>
            ) : (
              <ul className="all-list">
                {filtered.map((c) => {
                  const displayDecision = c.review_status === "RESOLVED" ? c.final_decision : c.decision;
                  return (
                    <li
                      key={c.claim_id}
                      className="all-item"
                      onClick={() => navigate(`/claims/${c.claim_id}`)}
                    >
                      <div className="all-item__left">
                        <span className="all-item__id">{c.claim_id}</span>
                        <span className="all-item__member">{c.member_name}</span>
                      </div>
                      <div className="all-item__right">
                        <span className="all-item__amount">
                          ₹ {Number(c.claim_amount).toLocaleString("en-IN")}
                        </span>
                        <span className="all-item__date">
                          {new Date(c.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className={badgeClass(displayDecision)}>
                          {badgeLabel(displayDecision)}
                        </span>
                        <button
                          className="all-item__delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.claim_id);
                          }}
                          aria-label={`Delete claim ${c.claim_id}`}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
