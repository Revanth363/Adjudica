// ─── Policy Configuration ─────────────────────────────────────────────────────
// This is the single source of truth for all policy terms.
// In a real system this would be loaded from a database per company/plan.
// For now we use the Plum assignment's implied policy terms.

const POLICY = {
  // ── Metadata ────────────────────────────────────────────────────────────────
  policy_id: "PLUM_OPD_2024",
  policy_name: "Plum OPD Advantage",
  effective_date: "2024-01-01",
  policy_holder: {
    company: "TechCorp Solutions Pvt Ltd",
    employees_covered: 500,
    dependents_covered: true,
  },

  // ── Coverage details (original JSON structure preserved) ────────────────────
  coverage_details: {
    annual_limit: 50000,
    per_claim_limit: 5000,
    family_floater_limit: 150000,
    consultation_fees: {
      covered: true,
      sub_limit: 2000,
      copay_percentage: 10,
      network_discount: 20,
    },
    diagnostic_tests: {
      covered: true,
      sub_limit: 10000,
      pre_authorization_required: false,
      covered_tests: [
        "Blood tests",
        "Urine tests",
        "X-rays",
        "ECG",
        "Ultrasound",
        "MRI (with pre-auth)",
        "CT Scan (with pre-auth)",
      ],
    },
    pharmacy: {
      covered: true,
      sub_limit: 15000,
      generic_drugs_mandatory: true,
      branded_drugs_copay: 30,
    },
    dental: {
      covered: true,
      sub_limit: 10000,
      routine_checkup_limit: 2000,
      procedures_covered: ["Filling", "Extraction", "Root canal", "Cleaning"],
      cosmetic_procedures: false,
    },
    vision: {
      covered: true,
      sub_limit: 5000,
      eye_test_covered: true,
      glasses_contact_lenses: true,
      lasik_surgery: false,
    },
    alternative_medicine: {
      covered: true,
      sub_limit: 8000,
      covered_treatments: ["Ayurveda", "Homeopathy", "Unani"],
      therapy_sessions_limit: 20,
    },
  },

  // ── Network hospitals ────────────────────────────────────────────────────────
  network_hospitals: [
    "Apollo Hospitals",
    "Fortis Healthcare",
    "Max Healthcare",
    "Manipal Hospitals",
    "Narayana Health",
  ],

  // ── Cashless / pre-authorization rules ────────────────────────────────────────
  cashless_facilities: {
    available: true,
    network_only: true,
    pre_approval_required: false,
    instant_approval_limit: 5000,
  },

  // Services that require pre-auth regardless of amount (explicit from coverage)
  pre_auth_required_services: ["MRI", "CT Scan"],

  // ── Waiting periods (in days) ─────────────────────────────────────────────────
  waiting_periods: {
    initial_waiting: 30,
    pre_existing_diseases: 365,
    maternity: 270,
    specific_ailments: {
      diabetes: 90,
      hypertension: 90,
      joint_replacement: 730,
    },
  },

  // ── Exclusions ───────────────────────────────────────────────────────────────
  exclusions: [
    "Cosmetic procedures",
    "Weight loss treatments",
    "Infertility treatments",
    "Experimental treatments",
    "Self-inflicted injuries",
    "Adventure sports injuries",
    "War and nuclear risks",
    "HIV/AIDS treatment",
    "Alcoholism/drug abuse treatment",
    "Non-allopathic treatments (except listed)",
    "Vitamins and supplements (unless prescribed for deficiency)",
  ],

  // ── Claim requirements ───────────────────────────────────────────────────────
  claim_requirements: {
    documents_required: [
      "Original bills and receipts",
      "Prescription from registered doctor",
      "Diagnostic test reports (if applicable)",
      "Pharmacy bills with prescription",
      "Doctor's registration number must be visible",
      "Patient details must match policy records",
    ],
    submission_timeline_days: 30,
    minimum_claim_amount: 500,
  },

  // ── Legacy / convenience mappings (kept for backward compatibility) ─────────
  // Note: min_claim_amount and submission_deadline_days were removed to avoid
  // duplicating values that are defined under `claim_requirements`.

  // ── Manual review & thresholds (kept from existing config)
  manual_review_confidence_threshold: 0.7,
  high_value_manual_review_threshold: 25000,
  max_claims_per_day: 2,
};

module.exports = POLICY;