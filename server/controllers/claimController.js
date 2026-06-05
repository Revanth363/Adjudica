const Claim = require("../models/Claim");
const { extractFromDocuments } = require("../services/geminiService");
const { adjudicateClaim } = require("../adjudication");

// ─── POST /api/claims ─────────────────────────────────────────────────────────
// The critical pipeline:
//   1. Validate input
//   2. Extract data from documents via Gemini Vision
//   3. Run adjudication engine (eligibility → docs → coverage → limits → medical → fraud)
//   4. Save claim + decision to MongoDB
//   5. Return full result
//
// req.uploadedFiles is set by prepareClaimFiles middleware (normalized file URLs)

const submitClaim = async (req, res) => {
  try {
    const {
      member_id,
      member_name,
      claim_amount,
      treatment_date,
      member_join_date,
      ytd_claimed,
      hospital,
      cashless_request,
      pre_auth_obtained,
      previous_claims_same_day,
      previous_claims_same_provider,
      member_verified,
      member_age,
      pre_existing_disease,
      is_duplicate_claim,
    } = req.body;

    // ── 1. Validate required fields ────────────────────────────────────────
    if (!member_id || !member_name || !claim_amount) {
      return res.status(400).json({
        success: false,
        message: "member_id, member_name, and claim_amount are required.",
      });
    }

    const files = req.uploadedFiles || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one document URL is required (file_urls, document_urls, or files).",
      });
    }

    // ── 2. Extract data from documents via Gemini ──────────────────────────
    console.log(`\n[submitClaim] Starting extraction for ${member_name} (${files.length} file(s))`);

    let extracted;
    try {
      extracted = await extractFromDocuments(files);
    } catch (extractionError) {
      console.error("[submitClaim] Gemini extraction failed:", extractionError.message);
      return res.status(422).json({
        success: false,
        message: "Document extraction failed. Please ensure documents are clear and readable.",
        error: extractionError.message,
      });
    }

    console.log("[submitClaim] Extraction complete:", JSON.stringify(extracted, null, 2));

    // ── 3. Run adjudication ────────────────────────────────────────────────
    const claimData = {
      member_id,
      member_name,
      claim_amount: Number(claim_amount),
      treatment_date: treatment_date || extracted.treatment_date,
      member_join_date,
      ytd_claimed: Number(ytd_claimed) || 0,
      hospital: hospital || extracted.hospital_name,
      cashless_request: cashless_request === true || cashless_request === "true",
      pre_auth_obtained: pre_auth_obtained === true || pre_auth_obtained === "true",
      previous_claims_same_day: Number(previous_claims_same_day) || 0,
      previous_claims_same_provider: Number(previous_claims_same_provider) || 0,
      member_verified: member_verified !== false && member_verified !== "false",
      member_age: member_age ? Number(member_age) : undefined,
      pre_existing_disease: pre_existing_disease === true || pre_existing_disease === "true",
      is_duplicate_claim: is_duplicate_claim === true || is_duplicate_claim === "true",
    };

    let adjudicationResult;
    try {
      adjudicationResult = await adjudicateClaim(claimData, extracted);
    } catch (adjError) {
      console.error("[submitClaim] Adjudication failed:", adjError.message);
      return res.status(500).json({
        success: false,
        message: "Adjudication engine error.",
        error: adjError.message,
      });
    }

    // ── 4. Generate claim ID ───────────────────────────────────────────────
    const claim_id = adjudicationResult.claim_id || `CLM_${Date.now()}`;

    // ── 5. Build and save Claim document ───────────────────────────────────
    const claim = new Claim({
      // Identity
      claim_id,

      // Member info (from user submission)
      member_id,
      member_name,
      member_join_date,
      claim_amount: Number(claim_amount),
      treatment_date: claimData.treatment_date,
      ytd_claimed: claimData.ytd_claimed,
      hospital: claimData.hospital,
      cashless_request: claimData.cashless_request,
      pre_auth_obtained: claimData.pre_auth_obtained,
      previous_claims_same_day: claimData.previous_claims_same_day,
      previous_claims_same_provider: claimData.previous_claims_same_provider,
      member_verified: claimData.member_verified,
      pre_existing_disease: claimData.pre_existing_disease,
      is_duplicate_claim: claimData.is_duplicate_claim,

      // Uploaded file references (Cloudinary URLs)
      files: files.map((f) => ({
        filename: f.filename,
        url: f.url,
        public_id: f.public_id || undefined,
      })),

      // Gemini extracted data
      extracted: {
        patient_name: extracted.patient_name,
        patient_age: extracted.patient_age,
        treatment_date: extracted.treatment_date,
        doctor_name: extracted.doctor_name,
        doctor_registration_number: extracted.doctor_registration_number,
        doctor_registration_visible: extracted.doctor_registration_visible,
        clinic_name: extracted.clinic_name,
        hospital_name: extracted.hospital_name,
        diagnosis: extracted.diagnosis,
        service_type: extracted.service_type,
        medicines: extracted.medicines || [],
        tests: extracted.tests || [],
        procedures: extracted.procedures || [],
        bill_items: extracted.bill_items || [],
        raw_claim_amount: extracted.raw_claim_amount,
        total_amount: extracted.total_amount,
        is_prescription_present: extracted.is_prescription_present,
        is_bill_present: extracted.is_bill_present,
        document_types: extracted.document_types || [],
        language: extracted.language,
        quality_issues: extracted.quality_issues || [],
        extraction_confidence: extracted.extraction_confidence,
      },

      // Adjudication decision
      decision: adjudicationResult.decision,
      approved_amount: adjudicationResult.approved_amount,
      rejection_reasons: adjudicationResult.rejection_reasons || [],
      rejected_items: adjudicationResult.rejected_items || [],
      fraud_flags: adjudicationResult.fraud_flags || [],
      confidence_score: adjudicationResult.confidence_score,
      notes: adjudicationResult.notes,
      next_steps: adjudicationResult.next_steps,
      deductions: adjudicationResult.deductions || {},
      evidence: adjudicationResult.evidence || {},

      // Manual review status
      review_status:
        adjudicationResult.decision === "MANUAL_REVIEW" ? "PENDING" : "NOT_REQUIRED",
    });

    const savedClaim = await claim.save();
    console.log(`[submitClaim] Claim ${claim_id} saved — Decision: ${adjudicationResult.decision}`);

    // ── 6. Return response ─────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      data: savedClaim,
    });
  } catch (error) {
    console.error("[submitClaim] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ─── GET /api/claims ──────────────────────────────────────────────────────────
// List all claims, newest first.
// Optional query params:
//   ?status=APPROVED|REJECTED|PARTIAL|MANUAL_REVIEW|PENDING
//   ?member_id=EMP001

const getAllClaims = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.decision = req.query.status.toUpperCase();
    }
    if (req.query.member_id) {
      filter.member_id = req.query.member_id;
    }

    const claims = await Claim.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error) {
    console.error("[getAllClaims] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET /api/claims/:id ──────────────────────────────────────────────────────
// Fetch a single claim by claim_id (not Mongo _id).

const getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findOne({ claim_id: req.params.id }).lean();

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: claim,
    });
  } catch (error) {
    console.error("[getClaimById] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── DELETE /api/claims/:id ──────────────────────────────────────────────────
// Delete a single claim by claim_id.

const deleteClaim = async (req, res) => {
  try {
    const claim = await Claim.findOneAndDelete({ claim_id: req.params.id });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Claim ${req.params.id} deleted successfully.`,
    });
  } catch (error) {
    console.error("[deleteClaim] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── GET /api/claims/:id/documents/:index ────────────────────────────────────
// Proxies a stored document so the client can open it as a blob (avoids CORS).

const getClaimDocument = async (req, res) => {
  try {
    const claim = await Claim.findOne({ claim_id: req.params.id }).lean();
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: `Claim ${req.params.id} not found.`,
      });
    }

    const index = Number.parseInt(req.params.index, 10);
    const file = claim.files?.[index];
    if (!file?.url) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const upstream = await fetch(file.url);
    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch document from storage.",
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get("content-type") ||
      (file.filename?.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename || `document-${index + 1}`)}"`
    );
    return res.send(buffer);
  } catch (error) {
    console.error("[getClaimDocument] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  submitClaim,
  getAllClaims,
  getClaimById,
  deleteClaim,
  getClaimDocument,
};
