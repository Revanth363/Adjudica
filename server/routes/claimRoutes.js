const express = require("express");
const router = express.Router();
const { prepareClaimFiles } = require("../middleware/upload");
const {
  submitClaim,
  getAllClaims,
  getClaimById,
  deleteClaim,
  getClaimDocument,
} = require("../controllers/claimController");

// POST /api/claims — Submit a new claim (the full pipeline)
// prepareClaimFiles middleware normalizes file URLs from the request body
// into req.uploadedFiles before the controller runs
router.post("/", prepareClaimFiles, submitClaim);

// GET /api/claims — List all claims (optional ?status= and ?member_id= filters)
router.get("/", getAllClaims);

// GET /api/claims/:id/documents/:index — Stream a submitted document (blob-friendly)
router.get("/:id/documents/:index", getClaimDocument);

// GET /api/claims/:id — Get a single claim by claim_id
router.get("/:id", getClaimById);

// DELETE /api/claims/:id — Delete a claim by claim_id
router.delete("/:id", deleteClaim);

module.exports = router;
