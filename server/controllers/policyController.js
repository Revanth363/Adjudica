const fs = require("fs");
const path = require("path");

// ─── Policy file path ─────────────────────────────────────────────────────────
// We require() fresh on each GET so restarts always reflect the saved file.
const POLICY_FILE = path.join(__dirname, "../config/policy.js");

// ─── Deep merge ───────────────────────────────────────────────────────────────
// Recursively merges source into target without losing unmentioned nested keys.
// Arrays are replaced entirely (not merged) — correct for exclusion lists etc.

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    const bothObjects =
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal);

    output[key] = bothObjects ? deepMerge(tgtVal, srcVal) : srcVal;
  }
  return output;
}

// ─── GET /api/policy ──────────────────────────────────────────────────────────
// Always reads from disk so it reflects the latest saved state.

const getPolicyTerms = (req, res) => {
  try {
    // Clear require cache so we always get the latest file from disk
    delete require.cache[require.resolve("../config/policy.js")];
    const POLICY = require("../config/policy.js");
    res.json(POLICY);
  } catch (err) {
    console.error("[Policy] Failed to load policy file:", err.message);
    res.status(500).json({ error: "Failed to load policy terms." });
  }
};

// ─── PUT /api/policy ──────────────────────────────────────────────────────────
// Deep merges incoming changes into the current policy and writes back to disk.
// This means the dashboard only needs to send changed fields — not the whole object.

const updatePolicyTerms = (req, res) => {
  try {
    // Load current policy fresh from disk
    delete require.cache[require.resolve("../config/policy.js")];
    const currentPolicy = require("../config/policy.js");

    const updatedTerms = req.body;

    if (!updatedTerms || typeof updatedTerms !== "object") {
      return res.status(400).json({ error: "Invalid policy data." });
    }

    // Merge — existing keys not in the request body are preserved
    const merged = deepMerge(currentPolicy, updatedTerms);

    // Write back to policy.js on disk so changes survive server restarts
    const fileContent =
      `// ─── Policy Configuration ─────────────────────────────────────────────────────\n` +
      `// Auto-updated by PolicyDashboard on ${new Date().toISOString()}\n\n` +
      `const POLICY = ${JSON.stringify(merged, null, 2)};\n\n` +
      `module.exports = POLICY;\n`;

    fs.writeFileSync(POLICY_FILE, fileContent, "utf8");

    console.log(`[Policy] Updated and saved to disk at ${new Date().toISOString()}`);

    res.json({
      message: "Policy terms updated successfully.",
      policy: merged,
    });
  } catch (err) {
    console.error("[Policy] Failed to update policy file:", err.message);
    res.status(500).json({ error: "Failed to save policy changes." });
  }
};

module.exports = {
  getPolicyTerms,
  updatePolicyTerms,
};