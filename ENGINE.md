# How Our OPD Claim Adjudication Engine Works

Hey! This guide is written in very simple, chat-like English so you can understand every single layer of the code and confidently explain it to your interviewer.

---

## The Big Picture (How Data Flows)

Before diving into the rules, here is how the data flows from start to finish:
1. **Upload**: The patient uploads their prescription and bill images.
2. **Gemini Extraction**: We send these images/PDFs to the **Gemini 2.5 Flash** model. It reads the files and returns a structured JSON object (patient name, doctor reg number, bill items, diagnosis, etc.).
3. **The Rule Engine**: We feed that Gemini data into our **5-step rule engine** to make a decision.
4. **Database & Response**: The decision is saved to **MongoDB** and sent back to the user.

---

## Layer 1: Basic Eligibility Check (`eligibilityCheck.js`)

**Goal**: Check if the person is allowed to claim right now.

*   **Member Verification (Covered Member)**: 
    *   **What is a "Covered Member"?** When a company buys insurance for its team, they register a list of people who are allowed to use it. This list includes the **employees** themselves, plus their registered family members (spouse, children, or parents, who are called **dependents**). Only these registered people are "covered members."
    *   **What the code checks**: We verify if the person claiming is actually on that list. If a non-registered person (like a friend, an employee who left the company, or an unregistered relative) tries to submit a claim, they are not a covered member, so we reject it immediately (`MEMBER_NOT_COVERED`).
*   **Policy Active Check**: We compare the date they got treated with the date their policy joined. If the treatment date is *before* they joined, they cannot claim (`POLICY_INACTIVE`).
*   **Waiting Periods**: 
    *   **30-Day Initial Waiting Period**: New members cannot claim for normal sickness in their first 30 days.
    *   **Specific Ailment Waiting Period**: Certain diseases have longer waiting periods. For example, **Diabetes** and **Hypertension** have a **90-day** waiting period. If a member joined on Sept 1st, 2024, and got treated for Diabetes on Oct 15th (only 44 days later), they get rejected (`WAITING_PERIOD`).

---

## Layer 2: Document Validation (`documentValidator.js`)

**Goal**: Check if the documents are valid and match the patient.

*   **Missing Documents Check**: Every OPD claim needs **both** a Prescription and a Bill. If the patient only uploads a bill without a prescription, we reject (`MISSING_DOCUMENTS`).
*   **Doctor Registration Check**: Under Indian rules, only registered doctors can prescribe. The prescription must show a valid registration number in a format like `KA/12345/2015` (State Code/Number/Year). If it's missing or in a weird format, we reject (`DOCTOR_REG_INVALID`).
*   **Patient Details Matching**: We check the name and age extracted from the bill against our database records. If the name is totally different or the age is off by more than 1 year, we reject (`PATIENT_MISMATCH`).
*   **Document Quality**: If Gemini reports that the files are blurry or modified, we flag it (`ILLEGIBLE_DOCUMENTS`).

---

## Layer 3: Coverage Verification (`coverageChecker.js`)

**Goal**: Check if this specific treatment or disease is covered by their company's plan.

*   **Diagnosis-Level Exclusions**: Some medical conditions are completely excluded from coverage. For example:
    *   **Weight Loss / Obesity** (e.g. Bariatric surgery, diet plans).
    *   **Cosmetic Treatments** (e.g. Botox, teeth whitening).
    *   **Experimental Treatments** (e.g. clinical trials).
    *   If the diagnosis itself is weight loss, we reject the whole claim immediately (`SERVICE_NOT_COVERED`).
*   **Item-Level Exclusions**: If a claim has multiple items (like a dental bill with a Root Canal + Teeth Whitening), we only exclude the Teeth Whitening (cosmetic) and keep the Root Canal. This leads to a **PARTIAL** approval.
*   **Pre-authorization Check**: High-value tests like **MRI** or **CT Scans** require the patient to get permission from Plum beforehand. If they did not get pre-auth, we reject (`PRE_AUTH_MISSING`).

---

## Layer 4: Limit Validation (`limitValidator.js`)

**Goal**: Check if they have run out of money/limits, and calculate the final payout.

*   **Minimum Claim Amount**: We don't process tiny claims. The claim must be at least **₹500** (`BELOW_MIN_AMOUNT`).
*   **Per-Claim Limit**: Each claim is capped at a maximum of **₹5,000** (except dental which has a higher limit of ₹10,000). If a claim is ₹7,500, we cap it at ₹5,000 and reject the excess (`PER_CLAIM_EXCEEDED`).
*   **Annual Limit**: The total amount a member can claim in a year is **₹50,000**. We track their YTD (Year-to-Date) claimed amount. If they already claimed ₹48,000, we can only pay them up to the remaining ₹2,000.
*   **Category Sub-limits**: Different categories have different maximum caps (e.g., consultation fees are capped at ₹2,000, pharmacy is capped at ₹15,000). We sum up the bill items by category and deduct any excess.
*   **Network Hospital Cashless Discount**: If the treatment is at a partner hospital (like Apollo) and they request cashless:
    *   We apply a **20% network discount** directly to the claim (saving money for both the company and the patient!).
    *   We **waive the co-payment** because they chose a network hospital.
*   **Co-payment Calculation**: If they go to a non-network hospital, the patient must pay a share of the bill. Under this policy, they pay **10%** for doctor consultations and **30%** for branded medicines. We subtract this copay from their approved payout.

---

## Layer 5: Medical Necessity Review (`medicalReview.js`)

**Goal**: Make sure the treatment actually makes clinical sense for the diagnosis.

*   We map common diagnoses to expected treatments (e.g., if the diagnosis is `Viral fever`, we expect medicines like `Paracetamol` and tests like `CBC`).
*   If a doctor prescribes something completely unrelated (like prescribing joint pain medicine for a migraine), we reduce the system's **confidence score**.

---

## Layer 6: Fraud Detection & Decisions (`fraudDetector.js` & `decisionBuilder.js`)

**Goal**: Combine all the steps, look for fraud red flags, and make the final decision.

*   **Fraud Checks**: We flag claims for **Manual Review** if:
    *   They submit **more than 2 claims on the same day** (unusual pattern).
    *   The document shows signs of being altered or duplicated.
    *   The total claim is very high-value (over **₹25,000**).
*   **Final Decision Output**:
    *   **APPROVED**: All checks passed, full/partial payment calculated.
    *   **PARTIAL**: Part of the bill was covered (e.g. root canal) but another part was excluded (e.g. teeth whitening).
    *   **REJECTED**: The claim violated a hard rule (waiting period, inactive policy, or excluded condition).
    *   **MANUAL_REVIEW**: Flagged for human check because of low AI confidence (<70%) or fraud red flags.
