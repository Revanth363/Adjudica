const POLICY = require("../config/policy");

// ─── Step 4: Limit Validation ─────────────────────────────────────────────────
// Validates the claim amount against all policy limits.
// Also calculates the final approved amount after copay and network discounts.
//
// claimData: { claim_amount, ytd_claimed (year-to-date already claimed), hospital }
// extracted: Gemini output (bill_items for sub-limit checks)
// excluded_items: from coverageChecker (items already excluded before limit check)
//
// Returns:
//   { passed, reasons, notes, approved_amount, deductions }

function validateLimits(claimData, extracted, excluded_items = []) {
  const reasons = [];
  const notes = [];
  const deductions = {};

  const annualLimit = POLICY.coverage_details.annual_limit;
  const perClaimLimit = POLICY.coverage_details.per_claim_limit;
  const minimumClaimAmount = POLICY.claim_requirements.minimum_claim_amount;
  const consultationCopayPercentage = POLICY.coverage_details.consultation_fees?.copay_percentage || 0;
  const pharmacyCopayPercentage = POLICY.coverage_details.pharmacy?.branded_drugs_copay || 0;
  const consultationNetworkDiscount = POLICY.coverage_details.consultation_fees?.network_discount || 0;

  const claimAmount = claimData.claim_amount || extracted.total_amount || 0;
  const ytdClaimed = claimData.ytd_claimed || 0;

  // Amount to actually evaluate after removing excluded items
  const excludedTotal = excluded_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  let evaluableAmount = claimAmount - excludedTotal;

  if (excludedTotal > 0) {
    deductions.excluded_items = excludedTotal;
    notes.push(`Excluded items total: ₹${excludedTotal}. Evaluating ₹${evaluableAmount}.`);
  }

  // ── 4A: Minimum claim amount ─────────────────────────────────────────────
  if (evaluableAmount < minimumClaimAmount) {
    reasons.push("BELOW_MIN_AMOUNT");
    notes.push(
      `Claim amount ₹${evaluableAmount} is below the minimum claim threshold of ₹${minimumClaimAmount}.`
    );
    return { passed: false, reasons, notes, approved_amount: 0, deductions };
  }

  // ── 4B: Per-claim limit ───────────────────────────────────────────────────
  // Check what categories are being claimed — if a category has a sub-limit
  // higher than the per-claim limit, the sub-limit governs for that category.
  // Example: dental sub-limit is ₹10,000 but per-claim is ₹5,000.
  // A pure dental claim of ₹8,000 should be allowed up to the dental sub-limit.
  const billItems_forCategoryCheck = extracted.bill_items || [];
  const isDentalOnly =
    billItems_forCategoryCheck.length > 0 &&
    billItems_forCategoryCheck.every((item) => {
      const name = (item.name || "").toLowerCase();
      return (
        name.includes("dental") ||
        name.includes("root canal") ||
        name.includes("tooth") ||
        name.includes("teeth") ||
        name.includes("filling")
      );
    });

  const effectivePerClaimLimit = isDentalOnly
    ? POLICY.coverage_details.dental?.sub_limit || perClaimLimit
    : perClaimLimit;

  if (evaluableAmount > effectivePerClaimLimit) {
    reasons.push("PER_CLAIM_EXCEEDED");
    notes.push(
      `Claim amount ₹${evaluableAmount} exceeds the ` +
      (isDentalOnly ? `dental` : `per-claim`) +
      ` limit of ₹${effectivePerClaimLimit}.`
    );
    evaluableAmount = effectivePerClaimLimit;
    deductions.per_claim_cap = claimAmount - excludedTotal - evaluableAmount;
  }

  // ── 4C: Annual limit ──────────────────────────────────────────────────────
  const remainingAnnual = annualLimit - ytdClaimed;
  if (remainingAnnual <= 0) {
    reasons.push("ANNUAL_LIMIT_EXCEEDED");
    notes.push(
      `Annual limit of ₹${annualLimit} has been exhausted. ` +
        `YTD claimed: ₹${ytdClaimed}.`
    );
    return { passed: false, reasons, notes, approved_amount: 0, deductions };
  }

  if (evaluableAmount > remainingAnnual) {
    notes.push(
      `Claim partially capped at remaining annual limit. ` +
        `Remaining: ₹${remainingAnnual}, Claimed: ₹${evaluableAmount}.`
    );
    deductions.annual_cap = evaluableAmount - remainingAnnual;
    evaluableAmount = remainingAnnual;
    // This is a partial approval — don't add to rejection reasons
  }

  // ── 4D: Sub-limits by category ────────────────────────────────────────────
  // Check each bill item against category sub-limits
  const billItems = extracted.bill_items || [];
  const categoryTotals = {
    consultation: 0,
    pharmacy: 0,
    diagnostic: 0,
    dental: 0,
    vision: 0,
    alternative_medicine: 0,
  };

  for (const item of billItems) {
    // Skip if this item was already excluded at the coverage checker step
    const isAlreadyExcluded = excluded_items.some(
      (ex) => (ex.name || "").toLowerCase() === (item.name || "").toLowerCase() && ex.amount === item.amount
    );
    if (isAlreadyExcluded) continue;

    const name = (item.name || "").toLowerCase();
    if (name.includes("consult") || name.includes("visit") || name.includes("doctor fee")) {
      categoryTotals.consultation += item.amount;
    } else if (
      name.includes("medicine") ||
      name.includes("tablet") ||
      name.includes("capsule") ||
      name.includes("syrup") ||
      name.includes("pharmacy")
    ) {
      categoryTotals.pharmacy += item.amount;
    } else if (
      name.includes("test") ||
      name.includes("scan") ||
      name.includes("x-ray") ||
      name.includes("mri") ||
      name.includes("blood") ||
      name.includes("urine") ||
      name.includes("report") ||
      name.includes("diagnostic")
    ) {
      categoryTotals.diagnostic += item.amount;
    } else if (
      name.includes("dental") ||
      name.includes("root canal") ||
      name.includes("tooth") ||
      name.includes("teeth")
    ) {
      categoryTotals.dental += item.amount;
    } else if (
      name.includes("eye") ||
      name.includes("glasses") ||
      name.includes("contact lens") ||
      name.includes("spectacle") ||
      name.includes("spectacles") ||
      name.includes("vision") ||
      name.includes("lasik")
    ) {
      categoryTotals.vision += item.amount;
    } else if (
      name.includes("ayur") ||
      name.includes("panchakarma") ||
      name.includes("therapy") ||
      name.includes("homeo")
    ) {
      categoryTotals.alternative_medicine += item.amount;
    }
  }

  let subLimitDeduction = 0;
  for (const [category, total] of Object.entries(categoryTotals)) {
    if (total === 0) continue;
    const limitMap = {
      consultation: POLICY.coverage_details.consultation_fees?.sub_limit,
      pharmacy: POLICY.coverage_details.pharmacy?.sub_limit,
      diagnostic: POLICY.coverage_details.diagnostic_tests?.sub_limit,
      dental: POLICY.coverage_details.dental?.sub_limit,
      vision: POLICY.coverage_details.vision?.sub_limit,
      alternative_medicine: POLICY.coverage_details.alternative_medicine?.sub_limit,
    };
    const limit = limitMap[category];
    if (limit && total > limit) {
      const excess = total - limit;
      subLimitDeduction += excess;
      notes.push(
        `${category} sub-limit: claimed ₹${total}, limit is ₹${limit}. Excess ₹${excess} deducted.`
      );
    }
  }

  if (subLimitDeduction > 0) {
    deductions.sub_limit = subLimitDeduction;
    evaluableAmount = Math.max(0, evaluableAmount - subLimitDeduction);
    if (evaluableAmount === 0) {
      reasons.push("SUB_LIMIT_EXCEEDED");
    }
  }

  // ── 4E: Network discount ─────────────────────────────────────────────────
  const hospitalName = (claimData.hospital || "").toLowerCase();
  const isNetworkHospital = POLICY.network_hospitals.some((h) =>
    hospitalName.includes(h.toLowerCase())
  );

  let networkDiscountAmount = 0;
  if (isNetworkHospital && claimData.cashless_request) {
    networkDiscountAmount = Math.round(evaluableAmount * (consultationNetworkDiscount / 100));
    deductions.network_discount = networkDiscountAmount;
    evaluableAmount = evaluableAmount - networkDiscountAmount;
    notes.push(
      `Network hospital identified. Consultation network discount of ${consultationNetworkDiscount}% is available under policy. Discount: ₹${networkDiscountAmount}.`
    );
  }

  // ── 4F: Co-payment ────────────────────────────────────────────────────────
  let copayAmount = 0;
  let copayNote = "";

  // Skip copay if network discount was applied (cashless hospital discount covers copay)
  if (networkDiscountAmount > 0) {
    copayNote = "Co-payment waived due to network hospital cashless discount.";
  } else if (categoryTotals.consultation > 0) {
    copayAmount = Math.round(evaluableAmount * (consultationCopayPercentage / 100));
    copayNote = `Consultation co-payment (${consultationCopayPercentage}%): ₹${copayAmount}.`;
  } else if (categoryTotals.pharmacy > 0) {
    const pharmacyBase = Math.min(categoryTotals.pharmacy, evaluableAmount);
    copayAmount = Math.round(pharmacyBase * (pharmacyCopayPercentage / 100));
    copayNote = `Pharmacy branded-drug co-payment (${pharmacyCopayPercentage}%): ₹${copayAmount}.`;
  } else {
    copayNote = "No co-payment applied for this claim category.";
  }

  deductions.copay = copayAmount;
  const approved_amount = evaluableAmount - copayAmount;
  notes.push(`${copayNote} Final approved: ₹${approved_amount}.`);

  return {
    passed: reasons.length === 0,
    reasons,
    notes,
    approved_amount,
    deductions,
  };
}

module.exports = { validateLimits };