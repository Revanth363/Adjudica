import axios from "axios";

// Base URL from env — never hardcoded
// In .env: VITE_API_URL=http://localhost:5000/api
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000, // 60s — Gemini extraction can take time
});

// ── Claims ────────────────────────────────────────────────────────────────────

// Submit a new claim with documents
// formData: FormData with files + claim fields
export const submitClaim = (formData) =>
  API.post("/claims", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Get a single claim by ID
export const getClaimById = (claimId) => API.get(`/claims/${claimId}`);

// Get all claims (with optional filters)
export const getAllClaims = (params = {}) => API.get("/claims", { params });

// ── Manual Review ─────────────────────────────────────────────────────────────

// Get all claims pending manual review
export const getReviewQueue = () => API.get("/reviews");

// Submit a manual review decision (Approve, Reject, or Partial)
export const submitReview = (claimId, payload) => {
  const { final_decision, reviewer_notes, reviewed_by, final_approved_amount } = payload;
  if (final_decision === "REJECTED") {
    return API.patch(`/reviews/${claimId}/reject`, { reviewer_notes, reviewed_by });
  } else {
    // Both APPROVED and PARTIAL call the approve endpoint on the backend
    return API.patch(`/reviews/${claimId}/approve`, {
      reviewer_notes,
      reviewed_by,
      final_decision,
      final_approved_amount,
    });
  }
};

export default API;