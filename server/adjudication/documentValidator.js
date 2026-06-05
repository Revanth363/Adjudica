const { isValidDoctorReg, namesMatch } = require("../utils/validators");

// ─── Step 2: Document Validation ──────────────────────────────────────────────
// Validates the quality and completeness of submitted documents.
// Works on the extracted JSON from Gemini — not the raw files.
//
// extracted: output from geminiService.extractFromDocuments()
// claimData: the original claim submission (has member_name from policy)
//
// Returns: { passed: boolean, reasons: [], notes: [], confidence_deduction: number }

function validateDocuments(extracted, claimData) {
  const reasons = [];
  const notes = [];
  let confidence_deduction = 0;

  function addReason(reason) {
    if (!reasons.includes(reason)) {
      reasons.push(reason);
    }
  }

  // ── 2A: Prescription and bill presence ───────────────────────────────────
  // New geminiService returns explicit boolean flags — use those directly
  // instead of scanning the document_types array.
  const hasPrescription = extracted.is_prescription_present === true;
  const hasBill = extracted.is_bill_present === true;

  if (!hasPrescription) {
    addReason("MISSING_DOCUMENTS");
    notes.push("Prescription from a registered doctor is mandatory for OPD claims.");
  }

  if (!hasBill) {
    addReason("MISSING_DOCUMENTS");
    notes.push("Medical bill or pharmacy bill is required to process reimbursement.");
  }

  // ── 2B: Doctor registration number ───────────────────────────────────────
  // New geminiService uses doctor_registration_number and doctor_registration_visible.
  // doctor_registration_visible: true  → reg number is physically on the document
  // doctor_registration_visible: false → absent entirely (stronger rejection signal)
  const regNumber = extracted.doctor_registration_number || extracted.doctor_reg;
  const regVisible = extracted.doctor_registration_visible !== undefined
    ? extracted.doctor_registration_visible
    : (regNumber ? true : false);

  if (!regNumber) {
    addReason("DOCTOR_REG_INVALID");
    if (regVisible === false) {
      notes.push("Doctor registration number is absent from the prescription.");
    } else {
      notes.push("Doctor registration number could not be read from the prescription.");
    }
    confidence_deduction += 0.1;
  } else if (!isValidDoctorReg(regNumber)) {
    addReason("DOCTOR_REG_INVALID");
    notes.push(
      `Doctor registration "${regNumber}" does not match valid format (e.g. KA/12345/2015).`
    );
    confidence_deduction += 0.1;
  }

  // ── 2C: Treatment date must be present ───────────────────────────────────
  if (!extracted.treatment_date) {
    addReason("MISSING_TREATMENT_DATE");
    notes.push("Treatment date could not be extracted — this is required to verify policy timing.");
  }

  // ── 2D: Diagnosis must be present ────────────────────────────────────────
  if (!extracted.diagnosis) {
    notes.push("Diagnosis not found in prescription — confidence reduced.");
    confidence_deduction += 0.05;
  }

  // ── 2D.1: Prescription validity ──────────────────────────────────────────
const hasMedicines =
  extracted.medicines &&
  Array.isArray(extracted.medicines) &&
  extracted.medicines.length > 0;

const hasTests =
  extracted.tests &&
  Array.isArray(extracted.tests) &&
  extracted.tests.length > 0;

if (hasPrescription && !extracted.diagnosis && !hasMedicines && !hasTests) {
  addReason("INVALID_PRESCRIPTION");
  notes.push(
    "Prescription is present but does not contain diagnosis, medicines, or investigations."
  );
}

  // ── 2E: Hospital name visibility ─────────────────────────────────────────
  // We do not have hospital registration data in the MVP schema, but a missing
  // hospital name makes network and cashless checks harder to verify.
  if (!extracted.hospital_name && !claimData.hospital) {
    notes.push("Hospital name not found in the submitted documents — confidence reduced.");
    confidence_deduction += 0.05;
  }

  // ── 2F: Patient age match ────────────────────────────────────────────────
  const extractedAge = extracted.patient_age;
  const memberAge = claimData.member_age;

  if (extractedAge !== null && extractedAge !== undefined && memberAge !== null && memberAge !== undefined) {
    const normalizedExtractedAge = Number(extractedAge);
    const normalizedMemberAge = Number(memberAge);

    if (!Number.isNaN(normalizedExtractedAge) && !Number.isNaN(normalizedMemberAge)) {
      if (Math.abs(normalizedExtractedAge - normalizedMemberAge) > 1) {
        addReason("PATIENT_MISMATCH");
        notes.push("Patient age does not match policy records.");
      }
    }
  }

  // ── 2G: Patient name match ────────────────────────────────────────────────
  if (extracted.patient_name && claimData.member_name) {
    if (!namesMatch(extracted.patient_name, claimData.member_name)) {
      addReason("PATIENT_MISMATCH");
      notes.push(
        `Patient name on document "${extracted.patient_name}" does not match ` +
          `policy member name "${claimData.member_name}".`
      );
    }
  } else if (!extracted.patient_name) {
    notes.push("Patient name not found in documents — confidence reduced.");
    confidence_deduction += 0.05;
  }

  // ── 2H: Document quality issues ──────────────────────────────────────────
  if (extracted.quality_issues && extracted.quality_issues.length > 0) {
    const severe = extracted.quality_issues.filter((q) =>
      ["blurry", "partial", "illegible"].includes(q.toLowerCase())
    );

    if (severe.length > 0) {
      addReason("ILLEGIBLE_DOCUMENTS");
      notes.push(`Document quality issues detected: ${severe.join(", ")}.`);
    } else {
      notes.push(
        `Minor document quality issues: ${extracted.quality_issues.join(", ")}.`
      );
      confidence_deduction += 0.05 * extracted.quality_issues.length;
    }
  }

  // ── 2I: Inherit Gemini's own extraction confidence ────────────────────────
  // If Gemini wasn't sure about its own extraction, we carry that uncertainty forward.
  const geminiConfidence = extracted.extraction_confidence;
  if (geminiConfidence !== null && geminiConfidence !== undefined) {
    if (geminiConfidence < 0.6) {
      confidence_deduction += 0.15;
      notes.push(
        `Gemini extraction confidence was low (${geminiConfidence}). Documents may be unclear.`
      );
    } else if (geminiConfidence < 0.8) {
      confidence_deduction += 0.05;
    }
  }

  // ── 2J: Date consistency ────────────────────────────────────────────────
if (
  extracted.prescription_date &&
  extracted.bill_date &&
  extracted.prescription_date !== extracted.bill_date
) {
  addReason("DATE_MISMATCH");
  notes.push(
    `Prescription date (${extracted.prescription_date}) does not match bill date (${extracted.bill_date}).`
  );
}

  return {
    passed: reasons.length === 0,
    reasons,
    notes,
    confidence_deduction,
  };
}

module.exports = { validateDocuments };