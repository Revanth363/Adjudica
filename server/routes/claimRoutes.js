const express = require("express");
const router = express.Router();
const { prepareClaimFiles } = require("../middleware/upload");
const {
  submitClaim,
  getAllClaims,
  getClaimById,
} = require("../controllers/claimController");

// POST /api/claims — Submit a new claim (the full pipeline)
// prepareClaimFiles middleware normalizes file URLs from the request body
// into req.uploadedFiles before the controller runs
router.post("/", prepareClaimFiles, submitClaim);

// GET /api/claims — List all claims (optional ?status= and ?member_id= filters)
router.get("/", getAllClaims);

// GET /api/claims/:id — Get a single claim by claim_id
router.get("/:id", getClaimById);

module.exports = router;
