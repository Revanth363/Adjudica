// ─── Validators ───────────────────────────────────────────────────────────────

// Doctor registration formats:
// Standard allopathy: STATE_CODE/NUMBER/YEAR  e.g. KA/12345/2015
// Ayurveda: AYUR/STATE/NUMBER/YEAR  e.g. AYUR/KL/2345/2019
// Dental: might vary but usually same pattern as standard
const DOCTOR_REG_PATTERNS = [
  /^[A-Z]{2}\/\d+\/\d{4}$/,                    // KA/12345/2015
  /^AYUR\/[A-Z]{2}\/\d+\/\d{4}$/,              // AYUR/KL/2345/2019
  /^[A-Z]{2}\/[A-Z]+\/\d+\/\d{4}$/,            // MH/DENT/12345/2018
  /^[A-Z]+\/\d+\/\d{4}$/,                       // DL/34567/2020 (some states no slash)
];

function isValidDoctorReg(regNumber) {
  if (!regNumber || typeof regNumber !== "string") return false;
  const trimmed = regNumber.trim().toUpperCase();
  return DOCTOR_REG_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diff = Math.abs(b - a);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isDateInPast(dateStr) {
  return new Date(dateStr) < new Date();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

// Check if any keyword from a list appears in a string (case-insensitive)
function containsAny(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// Normalize name for comparison — lowercase, remove punctuation, collapse spaces
function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if two names match with minor variation tolerance
function namesMatch(nameA, nameB) {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;

  // Allow collapsed forms like "Rajesh Kumar" vs "Rajeshkumar"
  const compactA = a.replace(/\s+/g, "");
  const compactB = b.replace(/\s+/g, "");
  if (compactA === compactB) return true;

  const tokensA = a.split(" ");
  const tokensB = b.split(" ");
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;

  // Compare token-by-token, allowing initials and prefix matches.
  for (let index = 0; index < shorter.length; index += 1) {
    const shortToken = shorter[index];
    const longToken = longer[index];

    if (!longToken) return false;
    if (shortToken === longToken) continue;
    if (longToken.startsWith(shortToken) || shortToken.startsWith(longToken)) continue;
    if (shortToken.length === 1 && longToken.startsWith(shortToken)) continue;
    if (longToken.length === 1 && shortToken.startsWith(longToken)) continue;
    return false;
  }

  return true;
}

module.exports = {
  isValidDoctorReg,
  daysBetween,
  isDateInPast,
  addDays,
  containsAny,
  normalizeName,
  namesMatch,
};