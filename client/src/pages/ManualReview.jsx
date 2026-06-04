import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReviewQueue from "../components/ManualReviewQueue/ReviewQueue";
import { getReviewQueue } from "../services/api";
import "./ClaimStatus.css";

export default function ManualReview() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchQueue() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getReviewQueue();
      // The API response wrapper is { success: true, count: N, data: Claim[] }
      setClaims(data.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load claims pending manual review.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  return (
    <div className="cs-root">
      {/* Navbar strip */}
      <div className="cs-nav">
        <button className="cs-nav__back" onClick={() => navigate("/")}>
          ← Home
        </button>
        <span className="cs-nav__title">Manual Review Queue</span>
        <div style={{ width: "80px" }}></div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", color: "#111827", margin: "0 0 8px 0" }}>Claims Pending Review</h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
            Inspect flagged claims, check AI confidence levels, view fraud warning logs, and make override decisions.
          </p>
        </div>

        {error && (
          <div style={{ padding: "16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#b91c1c", marginBottom: "20px" }}>
             {error}
          </div>
        )}

        <ReviewQueue claims={claims} loading={loading} onRefresh={fetchQueue} />
      </div>
    </div>
  );
}
