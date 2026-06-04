const POLICY = require("../config/policy");
const { containsAny } = require("../utils/validators");

// ─── Step 3: Coverage Verification ───────────────────────────────────────────
// Checks if what the member claimed is actually covered by the policy.
//
// extracted: Gemini output (diagnosis, procedures, medicines, tests)
// claimData: submission data (claim_amount, hospital name for cashless)
//
// Returns:
//   { passed, reasons, notes, excluded_items, requires_pre_auth }

function checkCoverage(extracted, claimData) {
  const reasons = [];
  const notes = [];
  const excluded_items = [];
  let requires_pre_auth = false;

  const addReason = (reason) => {
    if (!reasons.includes(reason)) {
      reasons.push(reason);
    }
  };

  const diagnosis = extracted.diagnosis || "";
  const procedures = extracted.procedures || [];
  const tests = extracted.tests || [];
  const medicines = extracted.medicines || [];
  const billItems = extracted.bill_items || [];

  const allClaimedText = [
    diagnosis,
    ...procedures,
    ...tests,
    ...medicines,
    ...billItems.map((b) => b.name || ""),
  ].join(" ").toLowerCase();

  const claimKeywords = {
    consultation: [
      "consult",
      "consultation",
      "doctor fee",
      "doctor visit",
      "physician",
      "opd",
      "visit",
    ],
    diagnostic: [
      ...(POLICY.coverage_details.diagnostic_tests?.covered_tests || []),
      "test",
      "scan",
      "x-ray",
      "x ray",
      "ecg",
      "ultrasound",
      "mri",
      "ct scan",
      "blood",
      "urine",
      "diagnostic",
      "report",
      "lab",
    ],
    pharmacy: ["medicine", "medicines", "tablet", "capsule", "syrup", "drug", "pharmacy"],
    dental: [
      ...(POLICY.coverage_details.dental?.procedures_covered || []),
      "dental",
      "tooth",
      "teeth",
      "root canal",
      "filling",
      "extraction",
      "cleaning",
    ],
    vision: [
      "eye",
      "eyes",
      "glasses",
      "contact lens",
      "contact lenses",
      "vision",
      "ophthalmology",
      "spectacle",
      "spectacles",
      "lasik",
    ],
    alternative_medicine: [
      ...(POLICY.coverage_details.alternative_medicine?.covered_treatments || []),
      "ayur",
      "homeo",
      "unani",
      "panchakarma",
      "naturopathy",
      "ayurveda",
    ],
  };

  const matchesCategory = (category, text = allClaimedText) =>
    (claimKeywords[category] || []).some((keyword) => containsAny(text, [keyword]));

  const matchedCategories = Object.keys(claimKeywords).filter((category) =>
    matchesCategory(category)
  );

  const cosmeticItemKeywords = [
    "cosmetic",
    "aesthetic",
    "whiten",
    "whitening",
    "bleach",
    "bleaching",
    "botox",
    "liposuction",
    "hair transplant",
    "weight loss",
    "bariatric",
  ];

  // ── 3A: Check exclusions ──────────────────────────────────────────────────
  // Diagnosis-level exclusion: if the core reason for the visit is excluded,
  // reject everything.
  // Item-level exclusion: if one bill item is excluded, keep the rest for partial approval.

  const isObesityOrWeightLoss = containsAny(diagnosis, ["obesity", "weight loss", "bariatric", "slimming"]) ||
                                (procedures.length > 0 && procedures.every(p => containsAny(p, ["bariatric", "weight loss", "slimming", "diet plan"])));
                                
  const isCosmetic = containsAny(diagnosis, ["cosmetic", "aesthetic", "beauty", "whitening", "anti-aging"]) ||
                      (procedures.length > 0 && procedures.every(p => containsAny(p, ["cosmetic", "aesthetic", "whitening", "bleaching", "botox"])));

  const isExperimental = containsAny(diagnosis, ["experimental", "unproven", "investigational"]) ||
                         (procedures.length > 0 && procedures.every(p => containsAny(p, ["experimental", "unproven", "investigational"])));

  if (isObesityOrWeightLoss) {
    addReason("SERVICE_NOT_COVERED");
    notes.push("Weight loss treatments are excluded from coverage.");
    return { passed: false, reasons, notes, excluded_items: [], requires_pre_auth: false };
  }

  if (isCosmetic) {
    addReason("SERVICE_NOT_COVERED");
    notes.push("Cosmetic procedures are excluded from coverage.");
    return { passed: false, reasons, notes, excluded_items: [], requires_pre_auth: false };
  }
  
  if (isExperimental) {
    addReason("SERVICE_NOT_COVERED");
    notes.push("Experimental treatments are excluded from coverage.");
    return { passed: false, reasons, notes, excluded_items: [], requires_pre_auth: false };
  }

  const diagnosisExcluded = POLICY.exclusions.some((excl) =>
    containsAny(diagnosis, [excl])
  );

  const primaryPurposeExcluded =
    procedures.length > 0 &&
    procedures.every((proc) =>
      POLICY.exclusions.some((excl) => containsAny(proc, [excl]))
    );

  if (diagnosisExcluded || primaryPurposeExcluded) {
    addReason("EXCLUDED_CONDITION");
    notes.push(`Diagnosis "${diagnosis}" falls under excluded conditions. Entire claim is not covered.`);
    return { passed: false, reasons, notes, excluded_items: [], requires_pre_auth: false };
  }

  for (const item of billItems) {
    const itemText = (item.name || "").toLowerCase();
    const isExcluded = POLICY.exclusions.some((excl) =>
      itemText.includes(excl.toLowerCase())
    ) || cosmeticItemKeywords.some((keyword) => itemText.includes(keyword));

    if (isExcluded) {
      excluded_items.push({ name: item.name, amount: item.amount, reason: "EXCLUDED" });
      notes.push(`"${item.name}" is an excluded service under policy.`);
    }
  }

  if (excluded_items.length > 0) {
    notes.push(`${excluded_items.length} item(s) are excluded and will be deducted.`);
  }

  // ── 3B: Check if primary service is covered ───────────────────────────────
  // MVP matching: category-based coverage from policy details.
  // Consultation acts as the fallback when no specific category is detected.

  const consultationCovered =
    POLICY.coverage_details.consultation_fees?.covered === true &&
    (matchesCategory("consultation") || (matchedCategories.length === 0 && diagnosis));
  const diagnosticCovered =
    POLICY.coverage_details.diagnostic_tests?.covered === true && matchesCategory("diagnostic");
  const pharmacyCovered =
    POLICY.coverage_details.pharmacy?.covered === true && matchesCategory("pharmacy");
  const dentalCovered =
    POLICY.coverage_details.dental?.covered === true && matchesCategory("dental");
  const visionCovered =
    POLICY.coverage_details.vision?.covered === true && matchesCategory("vision");
  const alternativeCovered =
    POLICY.coverage_details.alternative_medicine?.covered === true &&
    matchesCategory("alternative_medicine");

  const anythingCovered =
    consultationCovered ||
    diagnosticCovered ||
    pharmacyCovered ||
    dentalCovered ||
    visionCovered ||
    alternativeCovered;

  if (!anythingCovered && !diagnosisExcluded) {
    if (!diagnosis) {
      addReason("SERVICE_NOT_COVERED");
      notes.push("Could not determine what service was provided. No covered service found.");
    }
  }

  // ── 3C: Pre-authorization ─────────────────────────────────────────────────
  // MRI / CT Scan remain explicit pre-auth services.

  const needsPreAuthService = POLICY.pre_auth_required_services.some((svc) =>
    containsAny(allClaimedText, [svc])
  );

  const claimAmount = claimData.claim_amount || extracted.total_amount || 0;

  if (needsPreAuthService) {
    requires_pre_auth = true;
    if (!claimData.pre_auth_obtained) {
      addReason("PRE_AUTH_MISSING");
      if (containsAny(allClaimedText, ["mri"]) && claimAmount > 10000) {
        notes.push("MRI requires pre-authorization for claims above ₹10000");
      } else {
        notes.push("Services like MRI, CT scan require pre-authorization.");
      }
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    notes,
    excluded_items,
    requires_pre_auth,
  };
}

module.exports = { checkCoverage };