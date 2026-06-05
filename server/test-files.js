// test-files.js
// ---------------------------------------------------------------
// Reads all_cases.json (array of 42 test cases produced by the
// generate_*.py files) and validates each one against the
// adjudication engine.
//
// Each element must have: { claimData, extracted, expected, case_id }
// ---------------------------------------------------------------

const fs   = require('fs');
const path = require('path');
const { adjudicateClaim } = require('./adjudication/index');

const ALL_CASES_PATH = path.resolve(__dirname, '..', 'mock_documents', 'all_cases.json');

// ── Normalise expected string ──────────────────────────────────
// "WAITING_PERIOD — HYPERTENSION"  →  "WAITING_PERIOD"
// "APPROVED - NETWORK CASHLESS"    →  "APPROVED"
function normaliseExpected(raw) {
  if (!raw) return '';
  return raw.split(/[\s—–-]/)[0].trim().toUpperCase();
}

// ── Print failure details (only for failed cases) ──────────────
function printFailureDetail(tc, result) {
  const ev = result.evidence || {};

  const stepLines = [
    { name: 'Eligibility', step: ev.eligibility },
    { name: 'Documents',   step: ev.documents   },
    { name: 'Coverage',    step: ev.coverage    },
    { name: 'Limits',      step: ev.limits      },
    { name: 'Medical',     step: ev.medical     },
  ];

  // Show only the steps that failed (or all if none failed explicitly)
  const failedSteps = stepLines.filter(s => s.step && s.step.passed === false);

  if (failedSteps.length > 0) {
    failedSteps.forEach(({ name, step }) => {
      const reasons = (step.reasons || []).filter(Boolean);
      if (reasons.length) {
        console.log(`      Step ${name}: FAIL — ${reasons.join(', ')}`);
      }
    });
  }

  // Engine-level rejection reasons
  if (result.rejection_reasons && result.rejection_reasons.length > 0) {
    console.log(`      Rejection reasons : ${result.rejection_reasons.join(', ')}`);
  }

  // Fraud flags
  if (result.fraud_flags && result.fraud_flags.length > 0) {
    console.log(`      Fraud flags       : ${result.fraud_flags.join(' | ')}`);
  }

  // Confidence score (low score can cause MANUAL_REVIEW)
  console.log(`      Confidence score  : ${result.confidence_score}`);

  // Why engine decided what it did vs what was expected
  console.log(`      Engine decided    : ${result.decision}`);
}

// ── Main runner ───────────────────────────────────────────────
(async () => {
  console.log('=== JSON-Based Test Runner ===\n');

  let cases;
  try {
    cases = JSON.parse(fs.readFileSync(ALL_CASES_PATH, 'utf8'));
  } catch (e) {
    console.error(`ERROR: Could not load all_cases.json — ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(cases)) {
    console.error('ERROR: all_cases.json must be a JSON array.');
    process.exit(1);
  }

  console.log(`Loaded ${cases.length} test cases from all_cases.json\n`);
  console.log('─'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const tc of cases) {
    const { claimData, extracted, expected, case_id } = tc;

    if (!claimData || !extracted) {
      console.log(`SKIP  ${case_id || '?'} — missing claimData or extracted\n`);
      continue;
    }

    let result;
    try {
      // Suppress the engine's internal [Step N] / [Adjudication] logs
      const origLog = console.log;
      console.log = () => {};
      result = await adjudicateClaim(claimData, extracted);
      console.log = origLog;
    } catch (e) {
      console.log = console.log; // restore in case of error
      console.log(`ERROR ${case_id} — engine threw: ${e.message}`);
      failed++;
      continue;
    }


    const expectedNorm = normaliseExpected(expected);
    const actualNorm   = (result.decision || '').toUpperCase();
    const ok = actualNorm === expectedNorm;

    if (ok) {
      passed++;
      console.log(`PASS  ${case_id.padEnd(6)} | got: ${result.decision.padEnd(14)} | expected: ${expected}`);
    } else {
      failed++;
      console.log(`FAIL  ${case_id.padEnd(6)} | got: ${result.decision.padEnd(14)} | expected: ${expected}`);
      printFailureDetail(tc, result);
    }
  }

  console.log('─'.repeat(60));
  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
  if (failed === 0) {
    console.log('All tests passed!');
  } else {
    console.log(`${failed} test(s) did not match the expected decision.`);
  }
})();
