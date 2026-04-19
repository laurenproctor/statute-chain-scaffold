import Link from 'next/link'
import { Card, CardTitle, CardBody, Tag } from '../components/ui/Card'

export const metadata = {
  title: 'Greyledge — Connected Legal Authority Platform',
  description:
    'Search, compare, and trace relationships across statutes, regulations, rules, guidance, and legal sources in one structured workspace.',
}

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Search an Authority',
    body: 'Enter any citation — statute, regulation, rule, or code — and resolve it against the authority graph.',
  },
  {
    num: '02',
    title: 'Resolve Relationships',
    body: 'Trace how authorities reference, define, supersede, and constrain each other across jurisdictions.',
  },
  {
    num: '03',
    title: 'Compare Side by Side',
    body: 'Load any two authorities into the compare workspace to identify where they align and diverge.',
  },
]

const FEATURES = [
  {
    label: 'Browse',
    title: 'Browse Authorities',
    body: 'Navigate the full corpus by jurisdiction, code, article, and section.',
  },
  {
    label: 'Graph',
    title: 'Relationship Engine',
    body: 'Structured links between authorities — referenced, defined by, superseded, and more.',
  },
  {
    label: 'Compare',
    title: 'Compare Workspace',
    body: 'Side-by-side analysis of any two authorities with diff-level granularity.',
  },
  {
    label: 'Source',
    title: 'Source Grounded Review',
    body: 'Every authority carries canonical identifiers and traceable provenance.',
  },
  {
    label: 'Jurisdiction',
    title: 'Jurisdiction Aware',
    body: 'Federal, state, municipal, and agency sources modeled in a single architecture.',
  },
  {
    label: 'Extensible',
    title: 'Expandable Authority Model',
    body: 'Built to accommodate new authority types as the legal corpus evolves.',
  },
]

const AUTHORITY_TYPES = [
  'Statutes',
  'Regulations',
  'Administrative Rules',
  'Municipal Codes',
  'Guidance',
  'Agency Materials',
  'Future Sources',
]

const TRUST_ITEMS = [
  'Canonical identifiers on every authority',
  'Structured, typed relationship links',
  'Transparent provenance and source attribution',
  'Multi-jurisdiction architecture',
]

export default function HomePage() {
  return (
    <main className="home">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div className="home-container">
          <div className="home-hero-content">
            <p className="home-hero-eyebrow">Greyledge — Connected Legal Authority Platform</p>
            <h1 className="home-h1">
              Understand connected law<br />across every authority type.
            </h1>
            <p className="home-lead">
              Search, compare, and trace relationships across statutes, regulations, rules,
              guidance, and future legal sources in one structured workspace.
            </p>
            <div className="home-btn-row">
              <Link href="/expand-references" className="btn btn-primary" style={{ fontSize: 14, padding: '13px 28px' }}>
                Start Research
              </Link>
              <Link href="/browse" className="btn btn-secondary" style={{ fontSize: 14, padding: '13px 28px' }}>
                Browse Authorities
              </Link>
            </div>
            <div className="home-hero-meta">
              <div className="home-hero-meta-item">
                <span className="home-hero-meta-label">Platform</span>
                <span className="home-hero-meta-value">Connected Authority Graph</span>
              </div>
              <div className="home-hero-meta-item">
                <span className="home-hero-meta-label">Approach</span>
                <span className="home-hero-meta-value">Bloomberg Terminal meets Westlaw</span>
              </div>
              <div className="home-hero-meta-item">
                <span className="home-hero-meta-label">For</span>
                <span className="home-hero-meta-value">Solo attorneys · Firms · Enterprise</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────────────── */}
      <section className="home-section home-section-alt">
        <div className="home-container home-problem">
          <div>
            <p className="page-eyebrow">The Problem</p>
            <h2 className="home-h2">Legal authorities<br />rarely stand alone.</h2>
          </div>
          <div className="home-problem-body">
            <p className="home-body">
              A statute depends on definitions elsewhere.<br />
              A regulation derives authority from a statute.<br />
              Guidance affects enforcement.<br />
              Rules modify obligations.
            </p>
            <p className="home-body" style={{ marginTop: 20 }}>
              Most research tools show documents.<br />
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
                Greyledge shows relationships.
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="home-section">
        <div className="home-container">
          <p className="page-eyebrow">How It Works</p>
          <h2 className="home-h2">Three steps to connected research.</h2>
          <div className="home-how-grid">
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <Card flat key={num}>
                <div className="home-card-num">{num}</div>
                <CardTitle>{title}</CardTitle>
                <CardBody>{body}</CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="home-section home-section-alt">
        <div className="home-container">
          <p className="page-eyebrow">Features</p>
          <h2 className="home-h2" style={{ maxWidth: '50%' }}>
            One legal workflow instead of<br />fragmented research.
          </h2>
          <div className="home-features-grid">
            {FEATURES.map(({ label, title, body }) => (
              <Card flat key={title}>
                <Tag className="mb-3">{label}</Tag>
                <CardTitle>{title}</CardTitle>
                <CardBody>{body}</CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Authority Types ───────────────────────────────────────── */}
      <section className="home-section">
        <div className="home-container">
          <p className="page-eyebrow">Authority Types</p>
          <h2 className="home-h2" style={{ maxWidth: '50%' }}>
            Built for today's corpus<br />and tomorrow's sources.
          </h2>
          <div className="home-authority-chips">
            {AUTHORITY_TYPES.map((type) => (
              <span key={type} className="home-authority-chip">{type}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ─────────────────────────────────────────────────── */}
      <section className="home-section home-section-alt">
        <div className="home-container home-trust">
          <div>
            <p className="page-eyebrow">Trust</p>
            <h2 className="home-h2">Built for source grounded<br />legal work.</h2>
          </div>
          <div>
            <div className="home-trust-items">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="home-trust-item">
                  <span className="home-trust-marker">→</span>
                  <span className="home-body">{item}</span>
                </div>
              ))}
            </div>
            <p className="home-disclaimer">
              Not legal advice. Research infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section className="home-section home-cta-section">
        <div className="home-container home-cta-inner">
          <p className="page-eyebrow">Get Started</p>
          <h2 className="home-h2">Stop chasing references manually.</h2>
          <p className="home-lead" style={{ marginBottom: 32 }}>
            The full authority graph is ready. Start with any citation.
          </p>
          <div className="home-btn-row">
            <Link href="/expand-references" className="btn btn-primary" style={{ fontSize: 14, padding: '13px 28px' }}>
              Start Research
            </Link>
            <Link href="/browse" className="btn btn-secondary" style={{ fontSize: 14, padding: '13px 28px' }}>
              Browse Authorities
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
