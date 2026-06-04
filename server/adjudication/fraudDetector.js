const POLICY = require("../config/policy");

// ─── Fraud Detector ───────────────────────────────────────────────────────────
// Checks for suspicious patterns that warrant manual review.
// This doesn't auto-reject — it sets fraud flags and reduces confidence.
//
// claimData: full claim submission
//   - previous_claims_same_day: how many claims same member submitted today
//   - previous_claims_same_provider: claims at same clinic this month
// extracted: Gemini output
//
// Returns: { flags: [], confidence_deduction: number, needs_manual_review: boolean }

function detectFraud(claimData, extracted) {
  const flags = [];
  let confidence_deduction = 0;

  const claimAmount = claimData.claim_amount || extracted.total_amount || 0;

  // ── F1: Multiple claims on same day ──────────────────────────────────────
  const claimsSameDay = claimData.previous_claims_same_day || 0;
  if (claimsSameDay >= POLICY.max_claims_per_day) {
    flags.push("Multiple claims same day");
    flags.push("Unusual pattern detected");
    confidence_deduction += 0.35;
  }

  // ── F2: Frequent claims from same provider ───────────────────────────────
  const sameProviderClaims = claimData.previous_claims_same_provider || 0;
  if (sameProviderClaims >= 5) {
    flags.push(`Frequent claims from same provider detected (${sameProviderClaims}).`);
    confidence_deduction += 0.10;
  }

  // ── F3: High value claim ──────────────────────────────────────────────────
  if (claimAmount > POLICY.high_value_manual_review_threshold) {
    flags.push(
      `High-value claim (₹${claimAmount}) — auto-routed for manual review.`
    );
    confidence_deduction += 0.10;
  }

  // ── F4: Duplicate claim hook ──────────────────────────────────────────────
  if (claimData.is_duplicate_claim) {
    flags.push("Possible duplicate claim submission.");
    confidence_deduction += 0.30;
  }

  // ── F5: Document quality red flags from Gemini ───────────────────────────
  const qualityIssues = extracted.quality_issues || [];
  if (qualityIssues.some((q) => ["altered", "modified", "suspicious"].includes(q.toLowerCase()))) {
    flags.push("Document appears to have been altered or modified.");
    confidence_deduction += 0.30;
  }

  // ── F6: Diagnosis/age mismatch (basic) ───────────────────────────────────
  // Example: pediatric diagnosis for a 45-year-old, or vice versa
  const diagnosis = (extracted.diagnosis || "").toLowerCase();
  const patientAge = claimData.member_age || extracted.patient_age;

  if (patientAge !== null && patientAge !== undefined) {
    if (patientAge < 18 && diagnosis.includes("menopause")) {
      flags.push("Diagnosis 'menopause' inconsistent with patient age.");
      confidence_deduction += 0.15;
    }
    if (patientAge > 70 && diagnosis.includes("growth hormone")) {
      flags.push("Unusual diagnosis for patient age.");
      confidence_deduction += 0.10;
    }
  }

  // ── F7: Round-number billing ──────────────────────────────────────────────
  // Real medical bills rarely end in .00 for every item
  const billItems = extracted.bill_items || [];
  if (billItems.length >= 3) {
    const allRound = billItems.every((item) => item.amount % 100 === 0);
    if (allRound) {
      flags.push("All bill amounts are round numbers — verify authenticity.");
      confidence_deduction += 0.05;
    }
  }

  const highRiskFlags = [
    "Possible duplicate claim submission.",
    "Document appears to have been altered or modified.",
  ];

  const needs_manual_review =
    claimAmount > POLICY.high_value_manual_review_threshold ||
    flags.length > 0;

  return {
    flags,
    confidence_deduction,
    needs_manual_review,
  };
}

module.exports = { detectFraud };