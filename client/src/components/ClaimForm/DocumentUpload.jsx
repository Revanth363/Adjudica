import { useState, useRef, useCallback } from "react";
import "./DocumentUpload.css";

// ─── DocumentUpload ───────────────────────────────────────────────────────────
// Drag-and-drop file uploader for medical documents.
// Accepts PDF, JPG, PNG, WEBP. Max 10MB per file. Max 5 files total.
//
// Props:
//   files: File[] — controlled state from parent
//   onChange: (files: File[]) => void — called when files change

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file) {
  if (file.type === "application/pdf") return "📄";
  if (file.type.startsWith("image/")) return "🖼️";
  return "📎";
}

export default function DocumentUpload({ files, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const validate = useCallback((incoming) => {
    const errs = [];
    const valid = [];

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errs.push(`"${file.name}" is not a supported format. Use PDF, JPG or PNG.`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errs.push(`"${file.name}" exceeds ${MAX_SIZE_MB}MB limit.`);
        continue;
      }
      valid.push(file);
    }

    return { valid, errs };
  }, []);

  const mergeFiles = useCallback((incoming) => {
    const { valid, errs } = validate(incoming);
    setErrors(errs);

    if (valid.length === 0) return;

    // Deduplicate by name+size to avoid adding same file twice
    const existing = new Set(files.map((f) => `${f.name}-${f.size}`));
    const newFiles = valid.filter((f) => !existing.has(`${f.name}-${f.size}`));

    const merged = [...files, ...newFiles].slice(0, MAX_FILES);

    if (files.length + newFiles.length > MAX_FILES) {
      setErrors((prev) => [
        ...prev,
        `Maximum ${MAX_FILES} files allowed. Extra files were skipped.`,
      ]);
    }

    onChange(merged);
  }, [files, onChange, validate]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    mergeFiles(dropped);
  }, [mergeFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    const selected = Array.from(e.target.files);
    mergeFiles(selected);
    // Reset input so same file can be re-added after removal
    e.target.value = "";
  };

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated);
    setErrors([]);
  };

  return (
    <div className="docupload">
      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        className={`docupload__zone ${dragging ? "docupload__zone--dragging" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Upload medical documents"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleInputChange}
          className="docupload__input"
          aria-hidden="true"
        />
        <div className="docupload__icon">☁️</div>
        <p className="docupload__primary">
          {dragging ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="docupload__secondary">
          or <span className="docupload__link">browse to upload</span>
        </p>
        <p className="docupload__hint">
          PDF, JPG, PNG, WEBP · Max {MAX_SIZE_MB}MB per file · Up to {MAX_FILES} files
        </p>
      </div>

      {/* ── Errors ────────────────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <ul className="docupload__errors">
          {errors.map((err, i) => (
            <li key={i}>⚠️ {err}</li>
          ))}
        </ul>
      )}

      {/* ── File list ─────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <ul className="docupload__list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="docupload__item">
              <button
                type="button"
                className="docupload__item-click-target"
                onClick={() => {
                  const fileURL = URL.createObjectURL(file);
                  window.open(fileURL, "_blank");
                }}
                aria-label={`Open ${file.name} in a new tab`}
              >
                <span className="docupload__item-icon">{getFileIcon(file)}</span>
                <div className="docupload__item-info">
                  <p className="docupload__item-name">{file.name}</p>
                  <p className="docupload__item-size">{formatSize(file.size)}</p>
                </div>
              </button>
              <button
                type="button"
                className="docupload__item-remove"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <p className="docupload__count">
          {files.length} / {MAX_FILES} files added
        </p>
      )}
    </div>
  );
}