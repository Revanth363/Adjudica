
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = global.fetch ? global.fetch.bind(global) : null;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Extraction Prompt ────────────────────────────────────────────────────────
// Strict JSON-only. Uses example values (not descriptions) for numbers so
// Gemini follows type constraints reliably.
// We tell Gemini what to extract — never what to decide. All policy decisions
// happen in the rule engine, not here.

const EXTRACTION_PROMPT = `
You are a medical document parser for an Indian OPD insurance claims system.

You will be given one or more medical documents (prescription, bill, pharmacy bill, or diagnostic report).
Your job is to extract structured data from all documents combined and return a single JSON object.

RULES:
- Return ONLY valid JSON. No markdown, no explanation, no backticks.
- If a field is not found in the document, use null.
- Dates must be in YYYY-MM-DD format. Convert from DD/MM/YYYY if needed.
- Amounts must be numbers (not strings). Strip ₹ and commas.
- Doctor registration must be extracted exactly as written.
- If multiple documents are provided, merge information (prescription + bill together).
- For bill_items, list every line item separately.
- document_types should list all document types you detected.

Return this exact structure:
{
  "patient_name": "string or null",
  "patient_age": 0,
  "treatment_date": "YYYY-MM-DD or null",
  "doctor_name": "string or null",
  "doctor_registration_number": "string or null",
  "doctor_registration_visible": true,
  "clinic_name": "string or null",
  "hospital_name": "string or null",
  "diagnosis": "string or null",
  "service_type": "consultation | pharmacy | diagnostics | procedure or null",
  "medicines": ["list of medicine names with dosage"],
  "tests": ["list of diagnostic tests"],
  "procedures": ["list of procedures done"],
  "bill_items": [
    { "name": "string", "amount": 0 }
  ],
  "raw_claim_amount": 0,
  "total_amount": 0,
  "is_prescription_present": true,
  "is_bill_present": true,
  "document_types": ["prescription", "bill", "pharmacy_bill", "diagnostic_report"],
  "language": "english or regional language detected",
  "quality_issues": ["list of issues like: blurry, handwritten, partial, stamp_overlapping"],
  "extraction_confidence": 0.0
}

FIELD NOTES:
- doctor_registration_visible: true if a registration number is anywhere on the document
  (even if unreadable), false if absent entirely.
- service_type: classify what kind of service the bill is for.
  Do not decide if it is covered — just classify the type.
- hospital_name: extract exactly as printed. Do not determine if it is a network hospital.
- is_prescription_present: true if a doctor's prescription exists in the submitted documents.
- is_bill_present: true if any bill or invoice exists in the submitted documents.
`;

// ─── Fetch file from URL → base64 ────────────────────────────────────────────
// Gemini Vision needs base64 inline data, not URLs.

async function fetchFileAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.status} ${response.statusText}`);
  }

  // 👉 native fetch returns an ArrayBuffer, not a Node Buffer
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);   // Convert to a Node Buffer

  const base64 = buffer.toString("base64");
  const mimeType = response.headers.get("content-type") || "application/octet-stream";
  return { base64, mimeType };
}

// ─── Fallback MIME type from file extension ───────────────────────────────────
// Only used when the server returns no content-type or a generic one.

function getMimeTypeFromExtension(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  const map = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };
  return map[ext] || "application/octet-stream";
}

// ─── Main extraction function ─────────────────────────────────────────────────
// fileUrls: array of { url: string, filename: string }
// Returns the structured JSON extracted from all documents combined.

async function extractFromDocuments(fileUrls) {
  if (!fileUrls || fileUrls.length === 0) {
    throw new Error("No files provided for extraction");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Gemini Vision accepts multiple images/PDFs in one call — send them all
  const parts = [{ text: EXTRACTION_PROMPT }];

  for (const file of fileUrls) {
    try {
      if (!file.url.startsWith("http")) {
        throw new Error("Only URL-based files are supported");
      }

      const fetched = await fetchFileAsBase64(file.url);

      // Prefer content-type from HTTP response; fall back to extension only if generic
      const mimeType =
        fetched.mimeType && fetched.mimeType !== "application/octet-stream"
          ? fetched.mimeType
          : getMimeTypeFromExtension(file.filename);

      parts.push({ inlineData: { data: fetched.base64, mimeType } });
    } catch (err) {
      // Don't fail the whole extraction if one file can't load — log and skip
      console.error(`[Gemini] Warning: Could not load file "${file.filename}":`, err.message);
    }
  }

  if (parts.length === 1) {
    throw new Error("No files could be loaded for extraction");
  }

  const result = await model.generateContent(parts);
  const rawText = result.response.text().trim();

  // Strip markdown fences in case Gemini wraps output in ```json ... ```
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let extracted;
  try {
    extracted = JSON.parse(cleaned);
  } catch {
    console.error("[Gemini] Non-JSON response received:", rawText.slice(0, 300));
    throw new Error("Gemini returned invalid JSON. Check server logs for raw response.");
  }

  return extracted;
}

module.exports = { extractFromDocuments };
