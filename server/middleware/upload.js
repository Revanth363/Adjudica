const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

const uploadMiddleware = upload.array("documents");

// Helper to upload a buffer stream to Cloudinary
function uploadToCloudinary(fileBuffer, originalName, mimeType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "plum_opd_claims",
        resource_type: "auto", // Automatically detect PDF vs images
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          filename: originalName,
          public_id: result.public_id,
        });
      }
    );
    stream.end(fileBuffer);
  });
}

function normalizeFileEntry(entry, index = 0) {
  if (!entry) return null;

  if (typeof entry === "string") {
    const url = entry.trim();
    if (!url) return null;

    let filename = `document-${index + 1}`;
    try {
      const parsed = new URL(url);
      const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
      if (lastSegment) {
        filename = decodeURIComponent(lastSegment);
      }
    } catch {
      // Keep fallback filename.
    }

    return { url, filename };
  }

  if (typeof entry === "object") {
    const url = entry.url || entry.file_url || entry.link || entry.path;
    if (!url) return null;

    return {
      url,
      filename: entry.filename || entry.name || `document-${index + 1}`,
      public_id: entry.public_id || entry.publicId || undefined,
    };
  }

  return null;
}

function parseFileCollection(value) {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [value];
    }
  }

  return Array.isArray(value) ? value : [value];
}

async function prepareClaimFiles(req, res, next) {
  // Parse multipart files first
  uploadMiddleware(req, res, async function (err) {
    if (err) {
      console.error("[Multer Error]:", err);
      return next(err);
    }

    try {
      const rawEntries = [];

      // Parse JSON/Form URL entries if any are submitted in the request body
      rawEntries.push(...parseFileCollection(req.body?.file_urls));
      rawEntries.push(...parseFileCollection(req.body?.document_urls));
      rawEntries.push(...parseFileCollection(req.body?.files));
      rawEntries.push(...parseFileCollection(req.body?.uploaded_files));

      // Upload files from Multer memory buffers to Cloudinary
      if (req.files && req.files.length > 0) {
        console.log(`[upload.js] Uploading ${req.files.length} file(s) to Cloudinary...`);
        const uploadPromises = req.files.map((file) =>
          uploadToCloudinary(file.buffer, file.originalname, file.mimetype)
        );
        const uploaded = await Promise.all(uploadPromises);
        rawEntries.push(...uploaded);
      }

      const normalized = rawEntries
        .map((entry, index) => normalizeFileEntry(entry, index))
        .filter(Boolean);

      const deduped = [];
      const seen = new Set();

      for (const file of normalized) {
        if (!seen.has(file.url)) {
          seen.add(file.url);
          deduped.push(file);
        }
      }

      req.uploadedFiles = deduped;
      console.log(`[upload.js] Uploaded files normalized:`, req.uploadedFiles);
      next();
    } catch (error) {
      console.error("[upload middleware] Cloudinary upload error:", error);
      next(error);
    }
  });
}

module.exports = { prepareClaimFiles, normalizeFileEntry };
