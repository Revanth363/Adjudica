const POLICY = require("../config/policy");
const { daysBetween, addDays, containsAny } = require("../utils/validators");

// ─── Step 1: Basic Eligibility ────────────────────────────────────────────────
// Checks:
//   1. Policy must be active on treatment date
//   2. Waiting period must be satisfied
//   3. Member must be in the policy (we check via member context passed in)
//
// claimData: the full claim object passed in from the controller
//   - member_join_date: when the employee's policy started (YYYY-MM-DD)
//   - treatment_date: from extracted documents (YYYY-MM-DD)
//   - diagnosis: from extracted documents
//   - member_id, member_name
//
// Returns: { passed: boolean, reasons: [], notes: [] }

function checkEligibility(claimData) {
  const reasons = [];
  const notes = [];
  let needs_manual_review = false;

  const { member_id, member_verified, member_join_date, treatment_date, diagnosis } = claimData;

  // ── 1A: Member verification ───────────────────────────────────────────────
  // The claimant must be a covered member (employee/dependent) before any
  // policy timing checks can be trusted.
  if (!member_id || member_verified === false) {
    reasons.push("MEMBER_NOT_COVERED");
    notes.push("Member ID not provided or claimant is not verified as a covered member");
  }

  // ── 1B: Policy active check ───────────────────────────────────────────────
  // We need both dates to check this. If missing, we can't verify — flag it.
  if (!member_join_date) {
    notes.push("Member join date not provided — skipping policy active check");
    needs_manual_review = true;
  } else if (!treatment_date) {
    notes.push("Treatment date not extracted — cannot verify policy was active");
    needs_manual_review = true;
  } else {
    const joinDate = new Date(member_join_date);
    const treatDate = new Date(treatment_date);

    if (treatDate < joinDate) {
      reasons.push("POLICY_INACTIVE");
      notes.push(
        `Treatment date ${treatment_date} is before policy start date ${member_join_date}`
      );
    }
  }

  // ── 1C: Initial waiting period (30 days from join) ───────────────────────
  if (member_join_date && treatment_date) {
    const daysElapsed = daysBetween(member_join_date, treatment_date);

    if (daysElapsed < POLICY.waiting_periods.initial_waiting) {
      reasons.push("WAITING_PERIOD");
      notes.push(
        `Policy has a ${POLICY.waiting_periods.initial_waiting}-day initial waiting period. ` +
          `Member joined on ${member_join_date}. Only ${daysElapsed} days elapsed.`
      );
    }
  }

  // ── 1D: Pre-existing disease waiting period (365 days) ────────────────────
  // This is a separate policy check from the specific ailment rules below.
  const isPreExistingDisease =
    claimData.pre_existing_disease === true ||
    claimData.pre_existing_condition === true ||
    claimData.is_pre_existing_disease === true;

  if (isPreExistingDisease && member_join_date && treatment_date) {
    const daysElapsed = daysBetween(member_join_date, treatment_date);

    if (daysElapsed < POLICY.waiting_periods.pre_existing_diseases) {
      reasons.push("WAITING_PERIOD");
      notes.push(
        `Policy has a ${POLICY.waiting_periods.pre_existing_diseases}-day pre-existing disease waiting period. ` +
          `Member joined on ${member_join_date}. Only ${daysElapsed} days elapsed.`
      );
    }
  }

  // ── 1E: Specific ailment waiting period ───────────────────────────────────
  // Check if the diagnosis matches any specific ailment with its own waiting period
  if (diagnosis && member_join_date && treatment_date) {
    const specificConditions = POLICY.waiting_periods.specific_ailments;

    for (const [condition, waitDays] of Object.entries(specificConditions)) {
      if (containsAny(diagnosis, [condition])) {
        const daysElapsed = daysBetween(member_join_date, treatment_date);

        if (daysElapsed < waitDays) {
          // Only add WAITING_PERIOD once even if multiple conditions match
          if (!reasons.includes("WAITING_PERIOD")) {
            reasons.push("WAITING_PERIOD");
          }
          const eligibleFrom = addDays(member_join_date, waitDays);
          notes.push(
            `Diagnosis "${diagnosis}" matches specific ailment "${condition}". ` +
              `Requires ${waitDays}-day waiting period. ` +
              `Eligible from ${eligibleFrom}.`
          );
        }
        break; // First matching condition is enough
      }
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    notes,
    needs_manual_review,
  };
}

module.exports = { checkEligibility };