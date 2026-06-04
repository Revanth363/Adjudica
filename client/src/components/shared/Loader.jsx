import "./Loader.css";

// ─── Loader ───────────────────────────────────────────────────────────────────
// Reusable loading states.
// variant: "spinner" | "dots" | "fullscreen"
// message: optional string shown below the animation

export default function Loader({ variant = "spinner", message = "Processing..." }) {
  if (variant === "fullscreen") {
    return (
      <div className="loader-fullscreen">
        <div className="loader-fullscreen__box">
          <div className="loader-spinner" />
          <p className="loader-fullscreen__msg">{message}</p>
          <p className="loader-fullscreen__sub">
            ADJUDICA is reading your documents
          </p>
        </div>
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className="loader-dots">
        <span /><span /><span />
      </div>
    );
  }

  // Default: inline spinner
  return (
    <div className="loader-inline">
      <div className="loader-spinner loader-spinner--sm" />
      {message && <span className="loader-inline__msg">{message}</span>}
    </div>
  );
}