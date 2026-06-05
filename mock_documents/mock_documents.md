# Mock Documents Generation Overview

This document explains how the test files for the adjudication pipeline were generated, providing a balanced dataset that showcases all major outcomes.
## Generation Process

The mock test cases were programmatically created with a custom script that:

- Defined the four possible outcome categories (APPROVED, PARTIAL, REJECTED, MANUAL_REVIEW).
- Specified the desired count for each category to achieve a balanced distribution (12 APPROVED, 8 PARTIAL, 7 MANUAL_REVIEW, 15 REJECTED → 42 cases total).
- For each case, populated realistic claim fields such as member ID, policy status, diagnosis codes, treatment codes, and billing amounts.
- Ran the adjudication pipeline modules (`eligibilityCheck`, `documentValidator`, `coverageChecker`, `limitValidator`, `medicalReview`, `fraudDetector`) on the generated claim to determine the expected outcome.
- Adjusted any edge‑case data (e.g., fraud flags, exclusion rules) so that the outcome matched the intended category.

The script uses a fixed random seed to ensure reproducibility, and the resulting JSON objects are stored in `generate.py (1-10) - rejected`, `generate_edge_cases (11-20).py (rejected edge cases like rotate, blur, shadow etc)` , `generate_approved.py (21-30) ` , `generate_partial.py(31-37)` and `generate_manual.py (38-42)`. This approach guarantees that every major rule in the pipeline is exercised and that the dataset remains consistent across runs.

---
---

## REJECTED / SPECIAL CASES (TC001–TC020)

```text
TC001  APPROVED
TC002  PARTIAL
TC003  REJECTED - WAITING_PERIOD
TC004  MANUAL_REVIEW - Fraud (round numbers)
TC005  REJECTED - PRE_AUTH_MISSING
TC006  REJECTED - SERVICE_NOT_COVERED
TC007  REJECTED - MISSING_DOCUMENTS
TC008  APPROVED
TC009  REJECTED - PER_CLAIM_EXCEEDED
TC010  MANUAL_REVIEW - Medical mismatch

TC011  REJECTED - POLICY_INACTIVE
TC012  REJECTED - MEMBER_NOT_COVERED
TC013  REJECTED - DOCTOR_REG_INVALID
TC014  REJECTED - PATIENT_MISMATCH
TC015  REJECTED - BELOW_MIN_AMOUNT
TC016  REJECTED - ANNUAL_LIMIT_EXCEEDED
TC017  REJECTED - SUB_LIMIT_EXCEEDED
TC018  MANUAL_REVIEW - Multiple claims same day
TC019  REJECTED - WAITING_PERIOD
TC020  REJECTED - EXPERIMENTAL_TREATMENT
```

---

## APPROVED (TC021–TC030)

```text
TC021  Viral Fever
TC022  Acute Gastroenteritis
TC023  Hypertension Follow-up
TC024  Network Hospital Cashless
TC025  Allergic Rhinitis
TC026  Type 2 Diabetes Follow-up
TC027  Migraine
TC028  Upper Respiratory Tract Infection
TC029  Urinary Tract Infection
TC030  Cervical Spondylosis
```

All satisfy:

```text
✓ Policy active
✓ Covered member
✓ Valid doctor registration
✓ Covered diagnosis
✓ No exclusions
✓ Waiting period satisfied
✓ Within limits
✓ Diagnosis matches treatment
✓ No fraud indicators
```

---

## PARTIAL (TC031–TC037)

```text
TC031  Root Canal + Teeth Whitening
        → Cosmetic excluded

TC032  Skin Infection + Cosmetic Facial
        → Cosmetic excluded

TC033  Back Pain + Wellness Massage
        → Wellness service excluded

TC034  Cardiology Evaluation
        → Per-claim limit exceeded

TC035  Knee Pain
        → Annual balance remaining only

TC036  Surgical Follow-up
        → Consumables excluded

TC037  Gingivitis + Cosmetic Polishing
        → Cosmetic dental service excluded
```

---

## MANUAL REVIEW (TC038–TC042)

```text
TC038  Third claim on same day
        → Fraud pattern

TC039  Suspicious round-number billing
        → Fraud flag

TC040  Common Cold + Tramadol/Ondansetron
        → Diagnosis-medicine mismatch

TC041  Blurred handwritten prescription
        → Low OCR confidence

TC042  Oncology claim > ₹25,000
        → High-value claim
```

---

## Final Distribution

```text
APPROVED       = 12
PARTIAL        = 8
MANUAL_REVIEW  = 7
REJECTED       = 15
--------------------
TOTAL          = 42 cases
```

This distribution provides a strong mix of outcomes—**APPROVED**, **PARTIAL**, **REJECTED**, and **MANUAL_REVIEW**—ensuring that every major rule in the adjudication pipeline (`eligibilityCheck`, `documentValidator`, `coverageChecker`, `limitValidator`, `medicalReview`, and `fraudDetector`) is exercised.
