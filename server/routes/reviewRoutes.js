const express = require("express");
const router = express.Router();
const {
  getPendingReviews,
  approveReview,
  rejectReview,
  addReviewNotes,
} = require("../controllers/reviewController");

// GET /api/reviews — List claims pending manual review
router.get("/", getPendingReviews);

// PATCH /api/reviews/:id/approve — Reviewer approves a flagged claim
router.patch("/:id/approve", approveReview);

// PATCH /api/reviews/:id/reject — Reviewer rejects a flagged claim
router.patch("/:id/reject", rejectReview);

// PATCH /api/reviews/:id/notes — Reviewer adds notes without final decision
router.patch("/:id/notes", addReviewNotes);

module.exports = router;
