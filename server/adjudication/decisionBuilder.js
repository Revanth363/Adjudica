const POLICY = require("../config/policy");

// ─── Decision Builder ─────────────────────────────────────────────────────────
// Takes results from all adjudication steps and assembles the final decision.
// This is the last step — it decides APPROVED / REJECTED / PARTIAL / MANUAL_REVIEW.
//
// Parameters: all step results + claim metadata
// Returns: final decision object matching the spec in adjudication_rules.md

function buildDecision({
  claim_id,
  eligibility,
  documents,
  coverage,
  limits,
  medical,
  fraud,
  claimData,
  extracted,
}) {
  // ── Collect all rejection reasons from all steps ──────────────────────────
  const allReasons = [
    ...(eligibility.reasons || []),
    ...(documents.reasons || []),
    ...(coverage.reasons || []),
    ...(limits.reasons || []),
    ...(medical.reasons || []),
  ];

  // ── Collect all notes ─────────────────────────────────────────────────────
  const allNotes = [
    ...(eligibility.notes || []),
    ...(documents.notes || []),
    ...(coverage.notes || []),
    ...(limits.notes || []),
    ...(medical.notes || []),
  ];

  // ── Calculate confidence score ────────────────────────────────────────────
  // Start at 1.0, deduct from each step's confidence_deduction, then fraud
  const baseConfidence = 1.0;
  const totalDeduction =
    (documents.confidence_deduction || 0) +
    (medical.confidence_deduction || 0) +
    (fraud.confidence_deduction || 0);

  let confidence_score = Math.max(0, baseConfidence - totalDeduction);
  confidence_score = Math.round(confidence_score * 100) / 100; // 2 decimal places

  // ── Determine final decision ──────────────────────────────────────────────

  let decision;
  let approved_amount = limits.approved_amount || 0;
  let rejected_items = [];
  let next_steps = "";

  // Priority 1: Hard rejections (policy, eligibility, fraud indicators that exceed threshold)
  const hardRejectionReasons = [
    "POLICY_INACTIVE",
    "WAITING_PERIOD",
    "MEMBER_NOT_COVERED",
    "MISSING_DOCUMENTS",
    "MISSING_TREATMENT_DATE",
    "ILLEGIBLE_DOCUMENTS",
    "EXCLUDED_CONDITION",
    "ANNUAL_LIMIT_EXCEEDED",
    "BELOW_MIN_AMOUNT",
    "NOT_MEDICALLY_NECESSARY",
    "COSMETIC_PROCEDURE",
    "EXPERIMENTAL_TREATMENT",
    "PRE_AUTH_MISSING",
    "LATE_SUBMISSION",
    "DUPLICATE_CLAIM",
    "SERVICE_NOT_COVERED",
    "PER_CLAIM_EXCEEDED",
    "DOCTOR_REG_INVALID",
"PATIENT_MISMATCH",
"DATE_MISMATCH",
"INVALID_PRESCRIPTION",
  ];

  const hasHardRejection = allReasons.some((r) => hardRejectionReasons.includes(r));

  // Priority 2: Manual review conditions
  const needsManualReview =
    fraud.needs_manual_review ||
    confidence_score < POLICY.manual_review_confidence_threshold;

  // Priority 3: Partial approval (some items excluded but treatment itself is covered)
  const hasExcludedItems =
    coverage.excluded_items && coverage.excluded_items.length > 0;

  if (needsManualReview && (!hasHardRejection || fraud.confidence_deduction >= 0.30)) {
    // Fraud flags or very low confidence → manual review overrides everything
    // except clear-cut hard rejections like missing documents
    if (fraud.confidence_deduction >= 0.30) {
      decision = "MANUAL_REVIEW";
      approved_amount = 0;
      next_steps =
        "Your claim has been flagged for manual review due to document or pattern concerns. " +
        "A claims officer will contact you within 2 business days.";
    } else if (hasHardRejection) {
      decision = "REJECTED";
      approved_amount = 0;
      next_steps = buildRejectionNextSteps(allReasons);
    } else {
      decision = "MANUAL_REVIEW";
      approved_amount = 0;
      next_steps =
        "Claim routed for manual review. A claims officer will review and respond within 2 business days.";
    }
  } else if (hasHardRejection) {
    decision = "REJECTED";
    approved_amount = 0;
    next_steps = buildRejectionNextSteps(allReasons);
  } else if (hasExcludedItems && !hasHardRejection) {
    // Some items covered, some not — partial approval
    decision = "PARTIAL";
    rejected_items = coverage.excluded_items.map(
      (item) => `${item.name} — excluded (cosmetic/non-covered)`
    );
    next_steps =
      "Your claim has been partially approved. Excluded items are not reimbursable under your policy. " +
      "The approved amount will be credited within 5-7 business days.";
  } else {
    // All checks passed
    decision = "APPROVED";
    next_steps =
      "Your claim has been approved. The amount will be credited to your registered bank account within 5-7 business days.";
  }

  // ── Final output ──────────────────────────────────────────────────────────
  return {
    claim_id,
    decision,
    approved_amount,
    rejection_reasons: allReasons,
    rejected_items,
    fraud_flags: fraud.flags,
    confidence_score,
    notes: allNotes.join(" | "),
    deductions: limits.deductions || {},
    next_steps,
    // Evidence trail — which step caused what (important for transparency)
    evidence: {
      eligibility: { passed: eligibility.passed, reasons: eligibility.reasons },
      documents: { passed: documents.passed, reasons: documents.reasons },
      coverage: { passed: coverage.passed, reasons: coverage.reasons, excluded_items: coverage.excluded_items },
      limits: { passed: limits.passed, reasons: limits.reasons },
      medical: { passed: medical.passed, reasons: medical.reasons },
      fraud: { flags: fraud.flags },
    },
  };
}

function buildRejectionNextSteps(reasons) {
  const steps = [];

  if (reasons.includes("MISSING_DOCUMENTS")) {
    steps.push("Resubmit with a valid prescription from a registered doctor and medical bill.");
  }
  if (reasons.includes("MISSING_TREATMENT_DATE")) {
    steps.push("Resubmit with a document that clearly shows the treatment date so policy timing can be verified.");
  }
  if (reasons.includes("DOCTOR_REG_INVALID")) {
    steps.push("Ensure prescription includes the doctor's valid registration number (format: STATE/NUMBER/YEAR).");
  }
  if (reasons.includes("WAITING_PERIOD")) {
    steps.push("This condition has a waiting period under your policy. Please check your eligible date in the notes.");
  }
  if (reasons.includes("PRE_AUTH_MISSING")) {
    steps.push("Obtain pre-authorization from your insurer before high-value treatments or specific procedures like MRI/CT scan.");
  }
  if (reasons.includes("EXCLUDED_CONDITION") || reasons.includes("SERVICE_NOT_COVERED")) {
    steps.push("This treatment is not covered under your current policy. Contact HR to review your plan.");
  }

  if (steps.length === 0) {
    steps.push("Please contact your HR or the Plum support team for assistance with this claim.");
  }

  return steps.join(" ");
}

module.exports = { buildDecision };