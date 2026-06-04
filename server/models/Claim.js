 
const mongoose = require("mongoose");

// ─── Bill Item Sub-schema ─────────────────────────────────────────────────────
const billItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

// ─── Excluded Item Sub-schema ─────────────────────────────────────────────────
const excludedItemSchema = new mongoose.Schema(
  {
    name: { type: String },
    amount: { type: Number },
    reason: { type: String },
  },
  { _id: false }
);

// ─── Uploaded File Sub-schema ─────────────────────────────────────────────────
const uploadedFileSchema = new mongoose.Schema(
  {
    filename: { type: String },
    url: { type: String },       // Cloudinary URL
    public_id: { type: String }, // Cloudinary public_id for deletion if needed
  },
  { _id: false }
);

// ─── Main Claim Schema ────────────────────────────────────────────────────────
const claimSchema = new mongoose.Schema(
  {
    // ── Claim Identity ───────────────────────────────────────────────────────
    claim_id: {
      type: String,
      unique: true,
      required: true,
      index:true,
    },

    // ── Member Info (submitted by user) ──────────────────────────────────────
    member_id: { type: String, required: true },
    member_name: { type: String, required: true },
    member_join_date: { type: String }, // YYYY-MM-DD
    claim_amount: { type: Number, required: true },
    treatment_date: { type: String },   // YYYY-MM-DD — may come from extracted too
    ytd_claimed: { type: Number, default: 0 },
    hospital: { type: String },
    cashless_request: { type: Boolean, default: false },
    pre_auth_obtained: { type: Boolean, default: false },
    previous_claims_same_day: { type: Number, default: 0 },
    previous_claims_same_provider: { type: Number, default: 0},
    member_verified: {
  type: Boolean,
  default: true,
},

pre_existing_disease: {
  type: Boolean,
  default: false,
},
is_duplicate_claim: {
  type: Boolean,
  default: false,
},

    // ── Uploaded Documents ────────────────────────────────────────────────────
    files: [uploadedFileSchema],

    // ── Gemini Extracted Data ─────────────────────────────────────────────────
    // Raw output from geminiService — stored for audit trail and debugging
    extracted: {
      patient_name: { type: String },
      patient_age: { type: Number },
      treatment_date: { type: String },
      doctor_name: { type: String },
      doctor_registration_number: { type: String },
      doctor_registration_visible: { type: Boolean },
      clinic_name: { type: String },
      hospital_name: { type: String },
      diagnosis: { type: String },
      service_type: { type: String },
      medicines: [String],
      tests: [String],
      procedures: [String],
      bill_items: [billItemSchema],
      raw_claim_amount: { type: Number },
      total_amount: { type: Number },
      is_prescription_present: { type: Boolean },
      is_bill_present: { type: Boolean },
      document_types: [String],
      language: { type: String },
      quality_issues: [String],
      extraction_confidence: { type: Number },
    },

    // ── Adjudication Decision ─────────────────────────────────────────────────
    decision: {
      type: String,
      enum: ["APPROVED", "REJECTED", "PARTIAL", "MANUAL_REVIEW", "PENDING"],
      default: "PENDING",
    },
    approved_amount: { type: Number, default: 0 },
    rejection_reasons: [String],
    rejected_items: [String],
    fraud_flags: [String],
    confidence_score: { type: Number },
    notes: { type: String },
    next_steps: { type: String },
    deductions: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Evidence trail — step-by-step results for transparency
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Manual Review ─────────────────────────────────────────────────────────
    review_status: {
      type: String,
      enum: ["NOT_REQUIRED", "PENDING", "IN_REVIEW", "RESOLVED"],
      default: "NOT_REQUIRED",
    },
    reviewer_notes: { type: String },
    reviewed_by: { type: String },
    reviewed_at: { type: Date },
    // Override decision after manual review
    final_decision: {
      type: String,
      enum: ["APPROVED", "REJECTED", "PARTIAL", null],
      default: null,
    },
    final_approved_amount: { type: Number },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
claimSchema.index({ member_id: 1 });
claimSchema.index({ decision: 1 });
claimSchema.index({ review_status: 1 });
claimSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Claim", claimSchema);


