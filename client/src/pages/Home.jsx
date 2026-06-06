import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiCpu, FiShield, FiAlertTriangle, FiZap } from "react-icons/fi";
import { getAllClaims } from "../services/api";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount) {
    if (amount == null || Number.isNaN(Number(amount))) return null;
    return `₹ ${Number(amount).toLocaleString("en-IN")}`;
}

/** API stores 0–1 (e.g. 0.94); some UIs use 0–100 — same rule as ConfidenceBar */
function normalizeConfidence(score) {
    if (score == null) return 0;
    const pct = score > 1 ? score : score * 100;
    return Math.round(pct);
}

function getDisplayDecision(claim) {
    return claim.review_status === "RESOLVED" ? claim.final_decision : claim.decision;
}

function getTreatmentLabel(claim) {
    const ex = claim.extracted;
    return (
        ex?.diagnosis ||
        ex?.service_type ||
        claim.hospital ||
        claim.member_name ||
        "OPD Claim"
    );
}

function getRejectionReason(claim) {
    const reasons = claim.rejection_reasons;
    if (!reasons?.length) return null;
    return reasons[0].replace(/_/g, " ");
}

function buildClaimTrend(claims, dayCount = 7) {
    const buckets = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        buckets.push({
            key: d.toISOString().slice(0, 10),
            count: 0,
        });
    }

    claims.forEach((claim) => {
        if (!claim.createdAt) return;
        const created = new Date(claim.createdAt);
        created.setHours(0, 0, 0, 0);
        const key = created.toISOString().slice(0, 10);
        const bucket = buckets.find((b) => b.key === key);
        if (bucket) bucket.count += 1;
    });

    return buckets;
}

function trendToSvgPoints(buckets, width = 260, height = 60) {
    const max = Math.max(...buckets.map((b) => b.count), 1);
    const padTop = 10;
    const padBottom = 55;
    const step = buckets.length > 1 ? width / (buckets.length - 1) : 0;

    return buckets
        .map((b, i) => {
            const x = buckets.length > 1 ? i * step : width / 2;
            const y = padBottom - (b.count / max) * (padBottom - padTop);
            return `${x},${y}`;
        })
        .join(" ");
}

function mapClaimToPreviewCard(claim) {
    const decision = getDisplayDecision(claim);
    const approvedAmount =
        claim.review_status === "RESOLVED"
            ? claim.final_approved_amount
            : claim.approved_amount;

    return {
        id: claim.claim_id,
        treatment: getTreatmentLabel(claim),
        amount: formatCurrency(claim.claim_amount) || "—",
        approved:
            decision === "APPROVED" || decision === "PARTIAL"
                ? formatCurrency(approvedAmount)
                : null,
        decision,
        reason:
            decision === "REJECTED"
                ? getRejectionReason(claim)
                : decision === "MANUAL_REVIEW"
                  ? "Pending manual review"
                  : null,
        confidence: normalizeConfidence(claim.confidence_score),
    };
}

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

function decisionStatusColor(decision) {
    if (decision === "APPROVED") return "var(--green)";
    if (decision === "REJECTED") return "var(--red)";
    if (decision === "PARTIAL") return "var(--amber)";
    return "var(--primary)";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
    const navigate = useNavigate();
    const [claims, setClaims] = useState([]);
    const [claimsLoading, setClaimsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadClaims() {
            setClaimsLoading(true);
            try {
                const { data } = await getAllClaims();
                if (!cancelled) {
                    setClaims(data.data || []);
                }
            } catch {
                if (!cancelled) setClaims([]);
            } finally {
                if (!cancelled) setClaimsLoading(false);
            }
        }

        loadClaims();
        return () => {
            cancelled = true;
        };
    }, []);

    const sortedClaims = useMemo(
        () =>
            [...claims].sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            ),
        [claims]
    );

    const overview = useMemo(() => {
        let approved = 0;
        let rejected = 0;
        let underReview = 0;

        claims.forEach((claim) => {
            const decision = getDisplayDecision(claim);
            if (decision === "APPROVED" || decision === "PARTIAL") approved += 1;
            else if (decision === "REJECTED") rejected += 1;
            else if (decision === "MANUAL_REVIEW") underReview += 1;
        });

        return {
            total: claims.length,
            approved,
            rejected,
            underReview,
        };
    }, [claims]);

    const trendBuckets = useMemo(() => buildClaimTrend(claims), [claims]);
    const trendLinePoints = useMemo(() => trendToSvgPoints(trendBuckets), [trendBuckets]);
    const trendAreaPoints = useMemo(
        () => `${trendLinePoints} 260,60 0,60`,
        [trendLinePoints]
    );

    const dashboardClaims = useMemo(
        () => sortedClaims.slice(0, 3).map(mapClaimToPreviewCard),
        [sortedClaims]
    );

    const latestClaim = sortedClaims[0];
    const latestPreview = latestClaim ? mapClaimToPreviewCard(latestClaim) : null;

    const formatCount = (n) => (claimsLoading ? "—" : n.toLocaleString("en-IN"));

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
                        <li><a href="/policy-dashboard">Dashboard</a></li>
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
                                <p className="home-preview-stat__num">{formatCount(overview.total)}</p>
                                <p className="home-preview-stat__label">Total Claims</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--green">
                                    {formatCount(overview.approved)}
                                </p>
                                <p className="home-preview-stat__label">Approved</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--red">
                                    {formatCount(overview.rejected)}
                                </p>
                                <p className="home-preview-stat__label">Rejected</p>
                            </div>
                            <div>
                                <p className="home-preview-stat__num home-preview-stat__num--amber">
                                    {formatCount(overview.underReview)}
                                </p>
                                <p className="home-preview-stat__label">Under Review</p>
                            </div>
                        </div>
                        <div className="home-preview-card__chart">
                            <p className="home-preview-card__chart-label">Claim Trend (last 7 days)</p>
                            <svg viewBox="0 0 260 60" className="home-sparkline" aria-hidden="true">
                                <polyline
                                    points={trendLinePoints}
                                    fill="none"
                                    stroke="#7E57C2"
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                                <polyline
                                    points={trendAreaPoints}
                                    fill="url(#sparkGradHome)"
                                    opacity="0.15"
                                />
                                <defs>
                                    <linearGradient id="sparkGradHome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7E57C2" />
                                        <stop offset="100%" stopColor="#7E57C2" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    {/* Floating decision badge — latest claim */}
                    {latestPreview && (
                        <div
                            className="home-preview-decision home-preview-decision--clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/claims/${latestClaim.claim_id}`)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") navigate(`/claims/${latestClaim.claim_id}`);
                            }}
                        >
                            <p className="home-preview-decision__label">Latest Claim</p>
                            <p
                                className="home-preview-decision__status"
                                style={{ color: decisionStatusColor(latestPreview.decision) }}
                            >
                                {decisionLabel(latestPreview.decision)}
                            </p>
                            {(latestPreview.decision === "APPROVED" ||
                                latestPreview.decision === "PARTIAL") &&
                                latestPreview.approved && (
                                    <>
                                        <p className="home-preview-decision__amount-label">
                                            Approved Amount
                                        </p>
                                        <p className="home-preview-decision__amount">
                                            {latestPreview.approved}
                                        </p>
                                    </>
                                )}
                            <p className="home-preview-decision__conf-label">Confidence Score</p>
                            <div className="home-preview-decision__conf-row">
                                <strong>{latestPreview.confidence}%</strong>
                                <div className="home-preview-decision__conf-bar">
                                    <div
                                        className="home-preview-decision__conf-fill"
                                        style={{ width: `${latestPreview.confidence}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
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
                <h2 className="home-section__heading">Live Claims Preview</h2>
                {claimsLoading && (
                    <p className="home-dashboard-hint">Loading claims from database…</p>
                )}
                {!claimsLoading && dashboardClaims.length === 0 && (
                    <p className="home-dashboard-hint">
                        No claims yet. Submit a claim to see live results here.
                    </p>
                )}
                <div className="home-claims-grid">
                    {dashboardClaims.map((c) => (
                        <div
                            className="home-claim-card home-claim-card--clickable"
                            key={c.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/claims/${c.id}`)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") navigate(`/claims/${c.id}`);
                            }}
                        >
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
                            <li><a href="/policy-dashboard">Dashboard</a></li>
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