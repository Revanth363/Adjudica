import { useNavigate } from "react-router-dom";
import { FiCpu, FiShield, FiAlertTriangle, FiZap } from "react-icons/fi";
import "./Home.css";

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: <FiCpu />,
        title: "AI Document Extraction",
        desc: "Gemini AI reads prescriptions, bills and diagnostic reports — extracting every field automatically.",
    },
    {
        icon: <FiShield />,
        title: "Coverage Verification",
        desc: "Validates policy eligibility, waiting periods, exclusions and sub-limits instantly.",
    },
    {
        icon: <FiAlertTriangle />,
        title: "Fraud Detection",
        desc: "Advanced rules detect suspicious patterns, duplicate claims and document anomalies.",
    },
    {
        icon: <FiZap />,
        title: "Instant Decisions",
        desc: "Get APPROVED, REJECTED or PARTIAL decisions in seconds with transparent reasoning.",
    },
];

const STATS = [
    { value: "95%", label: "Automation Rate" },
    { value: "2 min", label: "Avg Processing Time" },
    { value: "99%", label: "Accuracy" },
    { value: "50K+", label: "Claims Processed" },
];

const HOW_IT_WORKS = [
    { step: "01", title: "Upload Documents", desc: "Prescription, bills and reports" },
    { step: "02", title: "AI Extraction", desc: "Gemini reads every field" },
    { step: "03", title: "Policy Validation", desc: "Eligibility, coverage, limits" },
    { step: "04", title: "Fraud Screening", desc: "Pattern and anomaly checks" },
    { step: "05", title: "Decision Generated", desc: "Instant result with evidence" },
];

const SAMPLE_CLAIMS = [
    {
        id: "CLM12345",
        treatment: "Knee Pain Consultation",
        amount: "₹ 5,200",
        approved: "₹ 4,500",
        decision: "APPROVED",
        reason: null,
        confidence: 94,
    },
    {
        id: "CLM12346",
        treatment: "Dental Cleaning",
        amount: "₹ 2,800",
        approved: null,
        decision: "REJECTED",
        reason: "Missing Prescription",
        confidence: 78,
    },
    {
        id: "CLM12347",
        treatment: "MRI Scan",
        amount: "₹ 15,600",
        approved: null,
        decision: "MANUAL_REVIEW",
        reason: "High Claim Amount",
        confidence: 65,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decisionClass(decision) {
    if (decision === "APPROVED") return "home-badge home-badge--approved";
    if (decision === "REJECTED") return "home-badge home-badge--rejected";
    return "home-badge home-badge--review";
}

function decisionLabel(decision) {
    if (decision === "MANUAL_REVIEW") return "MANUAL REVIEW";
    return decision;
}

function confidenceColor(score) {
    if (score >= 85) return "#16A34A";
    if (score >= 70) return "#D97706";
    return "#DC2626";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="home-root">

            {/* ── Navbar ─────────────────────────────────────────────────────────── */}
            <nav className="home-nav">
                <div className="home-nav__brand">
                    <div className="home-nav__logo">
                        <img src="/remove-bg.png" alt="" className="home-nav__shield" />
                    </div>
                    <div className="home-nav__titles">
                        <span className="home-nav__name">Adjudica</span>
                        <span className="home-nav__sub">Smart Claim Adjudication Platform</span>
                    </div>
                </div>
                <div className="home-nav__end">
                    <ul className="home-nav__links">
                        <li><a href="#features">Features</a></li>
                        <li><a href="#how-it-works">How It Works</a></li>
                        <li><a href="#dashboard">Dashboard</a></li>
                    </ul>
                    <button className="home-btn home-btn--outline" onClick={() => navigate("/all-claims")}>All Claims</button>
                    <button
                        className="home-btn home-btn--primary"
                        onClick={() => navigate("/submit")}
                    >
                        Submit Claim
                    </button>
                </div>
            </nav>

            {/* ── Hero ───────────────────────────────────────────────────────────── */}
            <section className="home-hero">
                <div className="home-hero__left">
                    <span className="home-hero__pill">AI-POWERED CLAIM ADJUDICATION</span>
                    <h1 className="home-hero__heading">
                        Smarter Claims.<br />
                        Faster Decisions.<br />
                        <span className="home-hero__accent">Better Outcomes.</span>
                    </h1>
                    <p className="home-hero__desc">
                        AI-powered claim adjudication system that automates document extraction,
                        policy validation, fraud detection and delivers instant claim decisions.
                    </p>
                    <div className="home-hero__actions">
                        <button
                            className="home-btn home-btn--primary home-btn--lg"
                            onClick={() => navigate("/submit")}
                        >
                            Submit Claim &rarr;
                        </button>
                        <button
                            className="home-btn home-btn--outline home-btn--lg"
                            onClick={() => navigate("/demo")}
                        >
                            ▶ View Demo
                        </button>
                    </div>
                    <div className="home-hero__trust">
                        <span> Secure &amp; Compliant</span>
                        <span> Faster Turnaround</span>
                        <span> Accurate Decisions</span>
                    </div>
                </div>

                {/* Mini dashboard preview */}
                <div className="home-hero__right">
                    <div className="home-preview-card">
                        <p className="home-preview-card__title">Claim Overview</p>
                        <div className="home-preview-card__stats">
                            <div>
                                <p className="home-preview-stat__num">12,458</p>
                                <p className="home-preview-stat__label">Total Claims</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--green">8,753</p>
                                <p className="home-preview-stat__label">Approved</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--red">2,194</p>
                                <p className="home-preview-stat__label">Rejected</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--amber">1,511</p>
                                <p className="home-preview-stat__label">Under Review</p>
                            </div>
                        </div>
                        {/* Fake sparkline */}
                        <div className="home-preview-card__chart">
                            <p className="home-preview-card__chart-label">Claim Trend</p>
                            <svg viewBox="0 0 260 60" className="home-sparkline">
                                <polyline
                                    points="0,55 40,40 80,45 120,28 160,32 200,18 260,10"
                                    fill="none"
                                    stroke="#7E57C2"
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                                <polyline
                                    points="0,55 40,40 80,45 120,28 160,32 200,18 260,10 260,60 0,60"
                                    fill="url(#sparkGrad)"
                                    opacity="0.15"
                                />
                                <defs>
                                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7E57C2" />
                                        <stop offset="100%" stopColor="#7E57C2" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    {/* Floating decision badge */}
                    <div className="home-preview-decision">
                        <p className="home-preview-decision__label">Claim Decision</p>
                        <p className="home-preview-decision__status">APPROVED</p>
                        <p className="home-preview-decision__amount-label">Approved Amount</p>
                        <p className="home-preview-decision__amount">₹ 4,500</p>
                        <p className="home-preview-decision__conf-label">Confidence Score</p>
                        <div className="home-preview-decision__conf-row">
                            <strong>94%</strong>
                            <div className="home-preview-decision__conf-bar">
                                <div className="home-preview-decision__conf-fill" style={{ width: "94%" }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ───────────────────────────────────────────────────────── */}
            <section className="home-section" id="features">
                <h2 className="home-section__heading">Powerful Features</h2>
                <div className="home-features-grid">
                    {FEATURES.map((f) => (
                        <div className="home-feature-card" key={f.title}>
                            <span className="home-feature-card__icon">{f.icon}</span>
                            <h3 className="home-feature-card__title">{f.title}</h3>
                            <p className="home-feature-card__desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Stats ──────────────────────────────────────────────────────────── */}
            <section className="home-stats">
                {STATS.map((s) => (
                    <div className="home-stat" key={s.label}>
                        <p className="home-stat__value">{s.value}</p>
                        <p className="home-stat__label">{s.label}</p>
                    </div>
                ))}
            </section>

            {/* ── How It Works ───────────────────────────────────────────────────── */}
            <section className="home-section" id="how-it-works">
                <h2 className="home-section__heading">How It Works</h2>
                <div className="home-steps">
                    {HOW_IT_WORKS.map((h, i) => (
                        <div className="home-step" key={h.step}>
                            <div className="home-step__circle">{h.step}</div>
                            {i < HOW_IT_WORKS.length - 1 && <div className="home-step__arrow">→</div>}
                            <p className="home-step__title">{h.title}</p>
                            <p className="home-step__desc">{h.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Live Dashboard Preview ─────────────────────────────────────────── */}
            <section className="home-section" id="dashboard">
                <h2 className="home-section__heading">Live Dashboard Preview</h2>
                <div className="home-claims-grid">
                    {SAMPLE_CLAIMS.map((c) => (
                        <div className="home-claim-card" key={c.id}>
                            <div className="home-claim-card__header">
                                <span className="home-claim-card__id">{c.id}</span>
                                <span className={decisionClass(c.decision)}>
                                    {decisionLabel(c.decision)}
                                </span>
                            </div>
                            <p className="home-claim-card__meta">Treatment</p>
                            <p className="home-claim-card__treatment">{c.treatment}</p>
                            <div className="home-claim-card__row">
                                <div>
                                    <p className="home-claim-card__meta">Claim Amount</p>
                                    <p className="home-claim-card__amount">{c.amount}</p>
                                </div>
                                {c.approved && (
                                    <div>
                                        <p className="home-claim-card__meta">Approved Amount</p>
                                        <p className="home-claim-card__amount home-claim-card__amount--green">
                                            {c.approved}
                                        </p>
                                    </div>
                                )}
                                {c.reason && (
                                    <div>
                                        <p className="home-claim-card__meta">Reason</p>
                                        <p className="home-claim-card__reason">{c.reason}</p>
                                    </div>
                                )}
                            </div>
                            <div className="home-claim-card__conf">
                                <span className="home-claim-card__meta">Confidence Score</span>
                                <span className="home-claim-card__conf-num">{c.confidence}%</span>
                            </div>
                            <div className="home-claim-card__conf-bar">
                                <div
                                    className="home-claim-card__conf-fill"
                                    style={{
                                        width: `${c.confidence}%`,
                                        background: confidenceColor(c.confidence),
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="home-center">
                    <button
                        className="home-btn home-btn--primary home-btn--lg"
                        onClick={() => navigate("/claims")}
                    >
                        Manual Review Queue &rarr;
                    </button>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────────── */}
            <footer className="home-footer">
                <div className="home-footer__inner">
                    <div className="home-footer__brand">
                        <div className="home-footer__brand-row">
                            <div className="home-footer__logo">
                                <img src="/black.png" alt="" className="home-footer__shield" />
                            </div>
                            <div>
                                <p className="home-footer__name">Adjudica</p>
                                <p className="home-footer__tagline">Smart Claim Adjudication Platform</p>
                            </div>
                        </div>
                    </div>

                    <div className="home-footer__col">
                        <p className="home-footer__col-title">Quick Links</p>
                        <ul>
                            <li><a href="#features">Features</a></li>
                            <li><a href="#how-it-works">How It Works</a></li>
                            <li><a href="#dashboard">Dashboard</a></li>
                        </ul>
                    </div>

                    <div className="home-footer__col">
                        <p className="home-footer__col-title">Company</p>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Service</a></li>
                        </ul>
                    </div>

                    <div className="home-footer__col">
                        <p className="home-footer__col-title">Connect</p>
                        <div className="home-footer__socials">
                            <a href="#" aria-label="LinkedIn">in</a>
                            <a href="#" aria-label="Twitter">𝕏</a>
                            <a href="#" aria-label="Email">✉</a>
                        </div>
                    </div>
                </div>
                <div className="home-footer__bottom">
                    <p>© 2026 Adjudica. All rights reserved.</p>
                </div>
            </footer>

        </div>
    );
}