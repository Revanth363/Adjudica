const { containsAny } = require("../utils/validators");

// ─── Medical Necessity Mapping ────────────────────────────────────────────────
// Maps common diagnoses to what treatments/medicines are clinically appropriate.
// Not exhaustive — real system would use a medical knowledge base.
// If diagnosis is present and not in this map, we give benefit of the doubt.

const DIAGNOSIS_TREATMENT_MAP = {
  "viral fever": {
    medicines: ["paracetamol", "vitamin c", "cetirizine", "nimesulide", "dolo"],
    tests: ["cbc", "dengue", "malaria", "typhoid", "widal"],
  },
  "upper respiratory tract infection": {
    medicines: ["amoxicillin", "azithromycin", "paracetamol", "cetirizine", "montelukast"],
    tests: ["cbc", "throat swab", "x-ray"],
  },
  "gastroenteritis": {
    medicines: ["antibiotics", "probiotics", "ors", "metronidazole", "ondansetron", "pantoprazole"],
    tests: ["stool", "cbc", "urine"],
  },
  "hypertension": {
    medicines: ["amlodipine", "telmisartan", "atenolol", "metoprolol", "losartan"],
    tests: ["ecg", "lipid profile", "kidney function", "kft"],
  },
  "type 2 diabetes": {
    medicines: ["metformin", "glimepiride", "insulin", "sitagliptin", "vildagliptin"],
    tests: ["blood sugar", "hba1c", "kidney function", "lipid profile"],
  },
  "migraine": {
    medicines: ["sumatriptan", "propranolol", "topiramate", "paracetamol", "ibuprofen"],
    tests: ["mri", "ct scan", "ophthalmology"],
  },
  "allergic rhinitis": {
    medicines: ["cetirizine", "montelukast", "fluticasone", "levocetrizine"],
    tests: ["allergy test", "ige"],
  },
  "lower back pain": {
    medicines: ["diclofenac", "etoricoxib", "pregabalin", "thiocolchicoside"],
    tests: ["x-ray", "mri", "spine"],
  },
  "tooth decay": {
    procedures: ["root canal", "filling", "extraction", "crown"],
  },
  "chronic joint pain": {
    treatments: ["panchakarma", "physiotherapy", "ayurveda"],
    medicines: ["diclofenac", "etoricoxib"],
    tests: ["x-ray", "mri"],
  },
  "acute bronchitis": {
    medicines: ["antibiotics", "bronchodilators", "salbutamol", "budesonide", "montelukast"],
    tests: ["x-ray", "sputum", "cbc"],
  },
  "lumbar disc herniation": {
    medicines: ["diclofenac", "pregabalin", "muscle relaxant"],
    tests: ["mri", "ct scan", "x-ray"],
  },
};

// ─── Step 5: Medical Necessity Review ────────────────────────────────────────
//
// extracted: Gemini output (diagnosis, medicines, tests, procedures)
//
// Returns: { passed, reasons, notes, confidence_deduction }

function reviewMedicalNecessity(extracted) {
  const reasons = [];
  const notes = [];
  let confidence_deduction = 0;

  const diagnosis = (extracted.diagnosis || "").toLowerCase();
  const medicines = extracted.medicines || [];
  const tests = extracted.tests || [];
  const procedures = extracted.procedures || [];

  // ── If no diagnosis, we cannot establish medical necessity ────────────────
  if (!diagnosis) {
    reasons.push("NOT_MEDICALLY_NECESSARY");
    notes.push("No diagnosis found. Medical necessity cannot be established without a diagnosis.");
    return { passed: false, reasons, notes, confidence_deduction };
  }

  // ── Find matching diagnosis in our map ────────────────────────────────────
  let mappedDiagnosis = null;
  for (const [key] of Object.entries(DIAGNOSIS_TREATMENT_MAP)) {
    if (containsAny(diagnosis, [key])) {
      mappedDiagnosis = DIAGNOSIS_TREATMENT_MAP[key];
      break;
    }
  }

  if (!mappedDiagnosis) {
    // Diagnosis not in our map — give benefit of the doubt
    // Real system would call a medical knowledge API
    notes.push(
      `Diagnosis "${extracted.diagnosis}" not in standard reference map. ` +
        `Assuming medically appropriate — confidence slightly reduced.`
    );
    confidence_deduction += 0.05;
    return { passed: true, reasons, notes, confidence_deduction };
  }

  // ── Check if medicines align with diagnosis ───────────────────────────────
  if (medicines.length > 0 && mappedDiagnosis.medicines) {
    const anyMatch = medicines.some((med) =>
      mappedDiagnosis.medicines.some((expected) =>
        med.toLowerCase().includes(expected.toLowerCase())
      )
    );
    if (!anyMatch) {
      confidence_deduction += 0.1;
      notes.push(
        `Prescribed medicines don't clearly align with diagnosis "${extracted.diagnosis}". ` +
          `May be appropriate but confidence reduced.`
      );
    }
  }

  // ── Check if tests align with diagnosis ───────────────────────────────────
  if (tests.length > 0 && mappedDiagnosis.tests) {
    const anyTestMatch = tests.some((test) =>
      mappedDiagnosis.tests.some((expected) =>
        test.toLowerCase().includes(expected.toLowerCase())
      )
    );
    if (!anyTestMatch) {
      confidence_deduction += 0.05;
      notes.push(
        `Diagnostic tests don't clearly match diagnosis "${extracted.diagnosis}". ` +
          `May still be appropriate.`
      );
    }
  }

    // ── Check if procedures align with diagnosis ─────────────────────────────
    const expectedProcedures = mappedDiagnosis.procedures || mappedDiagnosis.treatments;
    if (procedures.length > 0 && expectedProcedures) {
      const anyProcedureMatch = procedures.some((proc) =>
        expectedProcedures.some((expected) =>
          proc.toLowerCase().includes(expected.toLowerCase())
        )
      );

      if (!anyProcedureMatch) {
        confidence_deduction += 0.1;
        notes.push(
          `Procedures don't clearly align with diagnosis "${extracted.diagnosis}".`
        );
      }
    }

  // ── Cosmetic/experimental check at diagnosis level ────────────────────────
  const cosmeticKeywords = ["cosmetic", "aesthetic", "beauty", "whitening", "anti-aging"];
  const experimentalKeywords = ["experimental", "unproven", "trial", "investigational"];

  if (containsAny(diagnosis, cosmeticKeywords)) {
    reasons.push("COSMETIC_PROCEDURE");
    notes.push(`Diagnosis "${extracted.diagnosis}" appears to be a cosmetic procedure.`);
  }

  if (containsAny(diagnosis, experimentalKeywords)) {
    reasons.push("EXPERIMENTAL_TREATMENT");
    notes.push(`Treatment appears experimental or unproven.`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
    notes,
    confidence_deduction,
  };
}

module.exports = { reviewMedicalNecessity };