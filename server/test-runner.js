// ─── Test Runner ──────────────────────────────────────────────────────────────
// Run: node test_runner.js
// Simulates Gemini extraction by providing pre-extracted data for each test case.
// Tests ONLY the adjudication rule engine — not the LLM extraction.
//
// This mirrors how you'd do unit testing in a real company.

const { adjudicateClaim } = require("./adjudication/index");

// ─── TC001: Simple Consultation — should be APPROVED ─────────────────────────
const TC001 = {
  claimData: {
    claim_id: "TC001",
    member_id: "EMP001",
    member_name: "Rajesh Kumar",
    member_join_date: "2024-01-01", // joined long ago — no waiting period issue
    claim_amount: 1500,
    ytd_claimed: 0,
    treatment_date: "2024-11-01",
  },
  extracted: {
    patient_name: "Rajesh Kumar",
    treatment_date: "2024-11-01",
    doctor_name: "Dr. Sharma",
    doctor_reg: "KA/45678/2015",
    diagnosis: "Viral fever",
    medicines: ["Paracetamol 650mg", "Vitamin C"],
    tests: ["CBC", "Dengue test"],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 1000 },
      { name: "Diagnostic Tests", amount: 500 },
    ],
    total_amount: 1500,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.95,
  },
};

// ─── TC002: Dental — should be PARTIAL (root canal approved, whitening rejected) ─
const TC002 = {
  claimData: {
    claim_id: "TC002",
    member_id: "EMP002",
    member_name: "Priya Singh",
    member_join_date: "2024-01-01",
    claim_amount: 12000,
    ytd_claimed: 0,
    treatment_date: "2024-10-15",
  },
  extracted: {
    patient_name: "Priya Singh",
    treatment_date: "2024-10-15",
    doctor_name: "Dr. Patel",
    doctor_reg: "MH/23456/2018",
    diagnosis: "Tooth decay requiring root canal",
    medicines: [],
    tests: [],
    procedures: ["Root canal treatment", "Teeth whitening"],
    bill_items: [
      { name: "Root Canal Treatment", amount: 8000 },
      { name: "Teeth Whitening", amount: 4000 },
    ],
    total_amount: 12000,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.92,
  },
};

// ─── TC003: Limit Exceeded — should be REJECTED (PER_CLAIM_EXCEEDED) ─────────
const TC003 = {
  claimData: {
    claim_id: "TC003",
    member_id: "EMP003",
    member_name: "Amit Verma",
    member_join_date: "2024-01-01",
    claim_amount: 7500,
    ytd_claimed: 0,
    treatment_date: "2024-10-20",
  },
  extracted: {
    patient_name: "Amit Verma",
    treatment_date: "2024-10-20",
    doctor_name: "Dr. Gupta",
    doctor_reg: "DL/34567/2016",
    diagnosis: "Gastroenteritis",
    medicines: ["Antibiotics", "Probiotics"],
    tests: [],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 2000 },
      { name: "Medicines", amount: 5500 },
    ],
    total_amount: 7500,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.98,
  },
};

// ─── TC004: Missing Prescription — should be REJECTED (MISSING_DOCUMENTS) ────
const TC004 = {
  claimData: {
    claim_id: "TC004",
    member_id: "EMP004",
    member_name: "Sneha Reddy",
    member_join_date: "2024-01-01",
    claim_amount: 2000,
    ytd_claimed: 0,
    treatment_date: "2024-10-25",
  },
  extracted: {
    patient_name: "Sneha Reddy",
    treatment_date: "2024-10-25",
    doctor_name: null,
    doctor_reg: null,
    diagnosis: null,
    medicines: [],
    tests: [],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 1500 },
      { name: "Medicines", amount: 500 },
    ],
    total_amount: 2000,
    document_types: ["bill"],
    is_prescription_present: false,
    is_bill_present: true, // no prescription
    quality_issues: [],
    extraction_confidence: 1.0,
  },
};

// ─── TC005: Waiting Period — should be REJECTED (WAITING_PERIOD) ─────────────
const TC005 = {
  claimData: {
    claim_id: "TC005",
    member_id: "EMP005",
    member_name: "Vikram Joshi",
    member_join_date: "2024-09-01",
    claim_amount: 3000,
    ytd_claimed: 0,
    treatment_date: "2024-10-15",
  },
  extracted: {
    patient_name: "Vikram Joshi",
    treatment_date: "2024-10-15",
    doctor_name: "Dr. Mehta",
    doctor_reg: "GJ/56789/2014",
    diagnosis: "Type 2 Diabetes",
    medicines: ["Metformin", "Glimepiride"],
    tests: [],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 1000 },
      { name: "Medicines", amount: 2000 },
    ],
    total_amount: 3000,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.96,
  },
};

// ─── TC006: Alternative Medicine — should be APPROVED ────────────────────────
const TC006 = {
  claimData: {
    claim_id: "TC006",
    member_id: "EMP006",
    member_name: "Kavita Nair",
    member_join_date: "2024-01-01",
    claim_amount: 4000,
    ytd_claimed: 0,
    treatment_date: "2024-10-28",
  },
  extracted: {
    patient_name: "Kavita Nair",
    treatment_date: "2024-10-28",
    doctor_name: "Vaidya Krishnan",
    doctor_reg: "AYUR/KL/2345/2019",
    diagnosis: "Chronic joint pain",
    medicines: [],
    tests: [],
    procedures: ["Panchakarma therapy"],
    bill_items: [
      { name: "Consultation Fee", amount: 1000 },
      { name: "Panchakarma Therapy Charges", amount: 3000 },
    ],
    total_amount: 4000,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.89,
  },
};

// ─── TC007: MRI without pre-auth — should be REJECTED (PRE_AUTH_MISSING) ─────
const TC007 = {
  claimData: {
    claim_id: "TC007",
    member_id: "EMP007",
    member_name: "Suresh Patil",
    member_join_date: "2024-01-01",
    claim_amount: 15000,
    ytd_claimed: 0,
    treatment_date: "2024-11-02",
    pre_auth_obtained: false,
  },
  extracted: {
    patient_name: "Suresh Patil",
    treatment_date: "2024-11-02",
    doctor_name: "Dr. Rao",
    doctor_reg: "AP/67890/2017",
    diagnosis: "Suspected lumbar disc herniation",
    medicines: [],
    tests: ["MRI Lumbar Spine"],
    procedures: [],
    bill_items: [{ name: "MRI Lumbar Spine", amount: 15000 }],
    total_amount: 15000,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.94,
  },
};

// ─── TC008: Fraud flags — should be MANUAL_REVIEW ────────────────────────────
const TC008 = {
  claimData: {
    claim_id: "TC008",
    member_id: "EMP008",
    member_name: "Ravi Menon",
    member_join_date: "2024-01-01",
    claim_amount: 4800,
    ytd_claimed: 0,
    treatment_date: "2024-10-30",
    previous_claims_same_day: 3, // 3 previous claims same day
  },
  extracted: {
    patient_name: "Ravi Menon",
    treatment_date: "2024-10-30",
    doctor_name: "Dr. Khan",
    doctor_reg: "UP/45678/2016",
    diagnosis: "Migraine",
    medicines: ["Sumatriptan", "Propranolol"],
    tests: [],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 2000 },
      { name: "Medicines", amount: 2800 },
    ],
    total_amount: 4800,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.85,
  },
};

// ─── TC009: Weight loss — should be REJECTED (SERVICE_NOT_COVERED) ───────────
const TC009 = {
  claimData: {
    claim_id: "TC009",
    member_id: "EMP009",
    member_name: "Anita Desai",
    member_join_date: "2024-01-01",
    claim_amount: 8000,
    ytd_claimed: 0,
    treatment_date: "2024-10-18",
  },
  extracted: {
    patient_name: "Anita Desai",
    treatment_date: "2024-10-18",
    doctor_name: "Dr. Banerjee",
    doctor_reg: "WB/34567/2015",
    diagnosis: "Obesity - BMI 35",
    medicines: [],
    tests: [],
    procedures: ["Bariatric consultation", "Diet plan"],
    bill_items: [
      { name: "Consultation Fee", amount: 3000 },
      { name: "Diet Plan", amount: 5000 },
    ],
    total_amount: 8000,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.97,
  },
};

// ─── TC010: Network hospital cashless — should be APPROVED ───────────────────
const TC010 = {
  claimData: {
    claim_id: "TC010",
    member_id: "EMP010",
    member_name: "Deepak Shah",
    member_join_date: "2024-01-01",
    claim_amount: 4500,
    ytd_claimed: 0,
    treatment_date: "2024-11-03",
    hospital: "Apollo Hospitals",
    cashless_request: true,
  },
  extracted: {
    patient_name: "Deepak Shah",
    treatment_date: "2024-11-03",
    doctor_name: "Dr. Iyer",
    doctor_reg: "TN/56789/2013",
    diagnosis: "Acute bronchitis",
    medicines: ["Antibiotics", "Bronchodilators"],
    tests: [],
    procedures: [],
    bill_items: [
      { name: "Consultation Fee", amount: 1500 },
      { name: "Medicines", amount: 3000 },
    ],
    total_amount: 4500,
    document_types: ["prescription", "bill"],
    is_prescription_present: true,
    is_bill_present: true,
    quality_issues: [],
    extraction_confidence: 0.93,
  },
};

// ─── Run all tests ─────────────────────────────────────────────────────────────

const TEST_CASES = [TC001, TC002, TC003, TC004, TC005, TC006, TC007, TC008, TC009, TC010];

const EXPECTED = {
  TC001: "APPROVED",
  TC002: "PARTIAL",
  TC003: "REJECTED",
  TC004: "REJECTED",
  TC005: "REJECTED",
  TC006: "APPROVED",
  TC007: "REJECTED",
  TC008: "MANUAL_REVIEW",
  TC009: "REJECTED",
  TC010: "APPROVED",
};

async function runTests() {
  console.log("═".repeat(60));
  console.log("  OPD ADJUDICATION ENGINE — TEST SUITE");
  console.log("═".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const result = await adjudicateClaim(tc.claimData, tc.extracted);
    const expected = EXPECTED[tc.claimData.claim_id];
    const ok = result.decision === expected;

    if (ok) passed++;
    else failed++;

    const status = ok ? "✅ PASS" : "❌ FAIL";
    console.log(`\n${status} [${tc.claimData.claim_id}]`);
    console.log(`   Decision: ${result.decision} (expected: ${expected})`);
    console.log(`   Approved: ₹${result.approved_amount} | Confidence: ${result.confidence_score}`);

    if (result.rejection_reasons.length > 0) {
      console.log(`   Reasons: ${result.rejection_reasons.join(", ")}`);
    }
    if (result.fraud_flags.length > 0) {
      console.log(`   Fraud flags: ${result.fraud_flags.length}`);
    }
    if (!ok) {
      console.log(`   Notes: ${result.notes}`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`  Results: ${passed}/${TEST_CASES.length} passed, ${failed} failed`);
  console.log("═".repeat(60));
}

runTests().catch(console.error);