const { checkEligibility } = require("./eligibilityCheck");
const { validateDocuments } = require("./documentValidator");
const { checkCoverage } = require("./coverageChecker");
const { validateLimits } = require("./limitValidator");
const { reviewMedicalNecessity } = require("./medicalReview");
const { detectFraud } = require("./fraudDetector");
const { buildDecision } = require("./decisionBuilder");

// ─── Main Adjudication Function ───────────────────────────────────────────────
// This is what the controller calls after Gemini extraction is done.
//
// claimData: raw submission from the frontend/API
//   Required: member_id, member_name, claim_amount
//   Optional: member_join_date, ytd_claimed, hospital, cashless_request,
//             pre_auth_obtained, previous_claims_same_day
//
// extracted: structured JSON from geminiService.extractFromDocuments()
//   Contains: patient_name, doctor_reg, diagnosis, bill_items, total_amount, etc.
//
// Returns: final adjudication decision object

async function adjudicateClaim(claimData, extracted) {
  const claim_id = claimData.claim_id || `CLM_${Date.now()}`;

  console.log(`\n[Adjudication] Starting: ${claim_id}`);
  console.log(`[Adjudication] Member: ${claimData.member_name}, Amount: ₹${claimData.claim_amount}`);

  // ── Step 1: Eligibility ───────────────────────────────────────────────────
  const eligibility = checkEligibility({
    ...claimData,
    treatment_date: extracted.treatment_date || claimData.treatment_date,
    diagnosis: extracted.diagnosis,
  });
  console.log(`[Step 1] Eligibility: ${eligibility.passed ? "PASS" : "FAIL"} ${eligibility.reasons.join(", ")}`);

  // ── Step 2: Document Validation ───────────────────────────────────────────
  const documents = validateDocuments(extracted, claimData);
  console.log(`[Step 2] Documents: ${documents.passed ? "PASS" : "FAIL"} ${documents.reasons.join(", ")}`);

  // ── Step 3: Coverage ──────────────────────────────────────────────────────
  const coverage = checkCoverage(extracted, claimData);
  console.log(`[Step 3] Coverage: ${coverage.passed ? "PASS" : "FAIL"} ${coverage.reasons.join(", ")}`);

  // ── Step 4: Limits ────────────────────────────────────────────────────────
  const limits = validateLimits(claimData, extracted, coverage.excluded_items || []);
  console.log(`[Step 4] Limits: ${limits.passed ? "PASS" : "FAIL"} Approved: ₹${limits.approved_amount}`);

  // ── Step 5: Medical Necessity ─────────────────────────────────────────────
  const medical = reviewMedicalNecessity(extracted);
  console.log(`[Step 5] Medical: ${medical.passed ? "PASS" : "FAIL"} ${medical.reasons.join(", ")}`);

  // ── Fraud Detection ───────────────────────────────────────────────────────
  const fraud = detectFraud(claimData, extracted);
  if (fraud.flags.length > 0) {
    console.log(`[Fraud] Flags: ${fraud.flags.join(" | ")}`);
  }

  // ── Build Final Decision ──────────────────────────────────────────────────
  const decision = buildDecision({
    claim_id,
    eligibility,
    documents,
    coverage,
    limits,
    medical,
    fraud,
    claimData,
    extracted,
  });

  console.log(`[Adjudication] Decision: ${decision.decision} | Confidence: ${decision.confidence_score}`);
  return decision;
}

module.exports = { adjudicateClaim };