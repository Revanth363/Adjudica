const Claim = require("../models/Claim");

// ─── GET /api/reviews ─────────────────────────────────────────────────────────
// Lists claims that need manual review (review_status = PENDING or IN_REVIEW).
// These are claims where:
//   - adjudication decision was MANUAL_REVIEW (fraud flags, low confidence, high-value)
//   - or a reviewer has started looking at them but hasn't resolved yet

const getPendingReviews = async (req, res) => {
  try {
    const claims = await Claim.find({
      review_status: { $in: ["PENDING", "IN_REVIEW"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error) {
    console.error("[getPendingReviews] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── PATCH /api/reviews/:id/approve ───────────────────────────────────────────
// Reviewer approves a flagged claim.
// Body: { reviewed_by, final_approved_amount, reviewer_notes? }
//
// This overrides the automated MANUAL_REVIEW decision with a human APPROVED.
// The original automated decision stays in `decision` for audit trail.
// The human override goes into `final_decision`.

const approveReview = async (req, res) => {
  try {
    const { reviewed_by, final_approved_amount, reviewer_notes, final_decision } = req.body;

    if (!reviewed_by) {
      return res.status(400).json({
        success: false,
        message: "reviewed_by is required.",
      });
    }

    const claim = await Claim.findOne({ claim_id: req.params.id });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    if (claim.review_status === "RESOLVED") {
      return res.status(409).json({
        success: false,
        message: `Claim ${req.params.id} has already been resolved.`,
      });
    }

    // Determine approved amount: use reviewer's override if provided,
    // otherwise fall back to the adjudication engine's calculated amount
    const approvedAmount =
      final_approved_amount !== undefined
        ? Number(final_approved_amount)
        : claim.approved_amount || 0;

    claim.final_decision = final_decision || "APPROVED";
    claim.final_approved_amount = approvedAmount;
    claim.review_status = "RESOLVED";
    claim.reviewed_by = reviewed_by;
    claim.reviewed_at = new Date();
    if (reviewer_notes) {
      claim.reviewer_notes = reviewer_notes;
    }

    const updated = await claim.save();

    console.log(
      `[approveReview] Claim ${req.params.id} APPROVED by ${reviewed_by} — ₹${approvedAmount}`
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[approveReview] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── PATCH /api/reviews/:id/reject ────────────────────────────────────────────
// Reviewer rejects a flagged claim.
// Body: { reviewed_by, reviewer_notes }
//
// reviewer_notes is required here — a human must explain why they're rejecting
// something the system flagged for review rather than auto-rejecting.

const rejectReview = async (req, res) => {
  try {
    const { reviewed_by, reviewer_notes } = req.body;

    if (!reviewed_by) {
      return res.status(400).json({
        success: false,
        message: "reviewed_by is required.",
      });
    }

    if (!reviewer_notes) {
      return res.status(400).json({
        success: false,
        message: "reviewer_notes is required when rejecting a claim.",
      });
    }

    const claim = await Claim.findOne({ claim_id: req.params.id });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    if (claim.review_status === "RESOLVED") {
      return res.status(409).json({
        success: false,
        message: `Claim ${req.params.id} has already been resolved.`,
      });
    }

    claim.final_decision = "REJECTED";
    claim.final_approved_amount = 0;
    claim.review_status = "RESOLVED";
    claim.reviewed_by = reviewed_by;
    claim.reviewed_at = new Date();
    claim.reviewer_notes = reviewer_notes;

    const updated = await claim.save();

    console.log(
      `[rejectReview] Claim ${req.params.id} REJECTED by ${reviewed_by}`
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[rejectReview] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── PATCH /api/reviews/:id/notes ─────────────────────────────────────────────
// Reviewer adds notes to a claim without making a final decision.
// Moves the claim from PENDING → IN_REVIEW to signal it's being looked at.
// Body: { reviewed_by, reviewer_notes }

const addReviewNotes = async (req, res) => {
  try {
    const { reviewed_by, reviewer_notes } = req.body;

    if (!reviewed_by || !reviewer_notes) {
      return res.status(400).json({
        success: false,
        message: "reviewed_by and reviewer_notes are required.",
      });
    }

    const claim = await Claim.findOne({ claim_id: req.params.id });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    if (claim.review_status === "RESOLVED") {
      return res.status(409).json({
        success: false,
        message: `Claim ${req.params.id} has already been resolved. Cannot add more notes.`,
      });
    }

    // Mark as IN_REVIEW if it was still PENDING
    claim.review_status = "IN_REVIEW";
    claim.reviewed_by = reviewed_by;
    claim.reviewer_notes = reviewer_notes;

    const updated = await claim.save();

    console.log(
      `[addReviewNotes] Notes added to claim ${req.params.id} by ${reviewed_by}`
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[addReviewNotes] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getPendingReviews, approveReview, rejectReview, addReviewNotes };
