import './digital-discovery.css'
import Link from 'next/link'

export const metadata = {
  title: 'Digital Discovery for Law Firms — Greyledge',
  description:
    'Collect, review, and organize digital evidence with speed, precision, and discretion. Greyledge Digital Discovery helps law firms move from scattered data to clear case facts.',
}

function Hero() {
  return (
    <section className="dd-hero">
      <div className="dd-hero-inner">
        <div>
          <p className="dd-eyebrow">Digital Discovery</p>
          <h1 className="dd-h1">
            Digital Discovery<br />for Law Firms
          </h1>
          <p className="dd-hero-sub">
            Collect, review, and organize digital evidence with speed, precision, and discretion.
          </p>
          <p className="dd-hero-body">
            We help attorneys move from scattered data to clear case facts across email, text
            messages, cloud platforms, mobile devices, and business systems.
          </p>
          <div className="dd-btn-row">
            <Link href="#contact" className="dd-btn-primary dd-btn-primary-lg">
              Request a Consultation
            </Link>
            <Link href="#contact" className="dd-btn-secondary dd-btn-secondary-lg">
              Speak With an Expert
            </Link>
          </div>
        </div>

        <div className="dd-hero-visual">
          <div className="dd-hero-card-bg" />
          <div className="dd-hero-card">
            <div className="dd-hero-card-header">
              <span className="dd-hero-card-title">Matter #4821 — Active</span>
              <span className="dd-hero-badge">Processing Complete</span>
            </div>
            <div className="dd-hero-stats">
              <div className="dd-hero-stat">
                <div className="dd-hero-stat-num">47,291</div>
                <div className="dd-hero-stat-label">Documents collected</div>
              </div>
              <div className="dd-hero-stat">
                <div className="dd-hero-stat-num">12,847</div>
                <div className="dd-hero-stat-label">Email threads</div>
              </div>
              <div className="dd-hero-stat">
                <div className="dd-hero-stat-num">3,201</div>
                <div className="dd-hero-stat-label">Mobile messages</div>
              </div>
              <div className="dd-hero-stat">
                <div className="dd-hero-stat-num">891</div>
                <div className="dd-hero-stat-label">Cloud files</div>
              </div>
            </div>
            <div className="dd-sources">
              <div className="dd-source-row">
                <span className="dd-source-label">Microsoft 365</span>
                <div className="dd-source-bar"><div className="dd-source-fill" style={{ width: '92%' }} /></div>
                <span className="dd-source-pct">92%</span>
              </div>
              <div className="dd-source-row">
                <span className="dd-source-label">Google Workspace</span>
                <div className="dd-source-bar"><div className="dd-source-fill" style={{ width: '78%' }} /></div>
                <span className="dd-source-pct">78%</span>
              </div>
              <div className="dd-source-row">
                <span className="dd-source-label">Slack / Teams</span>
                <div className="dd-source-bar"><div className="dd-source-fill" style={{ width: '100%' }} /></div>
                <span className="dd-source-pct">100%</span>
              </div>
              <div className="dd-source-row">
                <span className="dd-source-label">Mobile devices</span>
                <div className="dd-source-bar"><div className="dd-source-fill" style={{ width: '64%' }} /></div>
                <span className="dd-source-pct">64%</span>
              </div>
            </div>
            <div className="dd-hero-card-foot">
              <div className="dd-status-dot" />
              <span className="dd-status-text">Deduplication and indexing complete — ready for review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBar() {
  const matters = [
    'Employment disputes',
    'Internal investigations',
    'Commercial litigation',
    'Trade secret claims',
    'Regulatory response',
    'Urgent preservation matters',
  ]
  return (
    <section className="dd-trust">
      <div className="dd-trust-inner">
        <span className="dd-trust-label">Trusted for matters involving</span>
        <div className="dd-trust-items">
          {matters.map((m) => (
            <span key={m} className="dd-trust-chip">{m}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function ModernEvidence() {
  const sources = [
    { icon: '✉', label: 'Email and attachments' },
    { icon: '☁', label: 'Microsoft 365 & Google Workspace' },
    { icon: '◈', label: 'Slack and Teams communications' },
    { icon: '◻', label: 'Text messages and mobile data' },
    { icon: '⬡', label: 'Shared drives and cloud storage' },
    { icon: '◧', label: 'Laptops and local devices' },
    { icon: '≡', label: 'Financial and business records' },
    { icon: '◉', label: 'Metadata and activity logs' },
  ]
  return (
    <section className="dd-section dd-section-alt">
      <div className="dd-container">
        <p className="dd-eyebrow">Evidence Sources</p>
        <h2 className="dd-h2">Modern Evidence Requires<br />Modern Discovery</h2>
        <p className="dd-body" style={{ maxWidth: 580 }}>
          Critical evidence now lives across multiple systems and devices. Legal teams need a
          partner who can identify, collect, process, and surface what matters quickly.
        </p>
        <div className="dd-evidence-grid">
          {sources.map(({ icon, label }) => (
            <div key={label} className="dd-evidence-card">
              <div className="dd-evidence-icon">{icon}</div>
              <div className="dd-evidence-title">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Services() {
  const items = [
    {
      num: '01',
      title: 'Data Preservation & Collection',
      body: 'Defensible collection methods designed to preserve integrity and maintain chain of custody from the first moment of engagement.',
    },
    {
      num: '02',
      title: 'Processing & Early Case Assessment',
      body: 'Cull irrelevant data, deduplicate files, organize custodians, and reduce review volume before spend escalates.',
    },
    {
      num: '03',
      title: 'Search, Analytics & Timelines',
      body: 'Identify key communications, relationships, dates, and patterns faster with targeted search and structured analysis.',
    },
    {
      num: '04',
      title: 'Review Preparation',
      body: 'Prepare hosted review sets, privilege workflows, issue tagging, and organized productions structured for your team.',
    },
    {
      num: '05',
      title: 'Production & Delivery',
      body: 'Deliver responsive materials in standard formats — TIFF, PDF, native — with quality control and load files.',
    },
  ]
  return (
    <section className="dd-section">
      <div className="dd-container">
        <p className="dd-eyebrow">Services</p>
        <h2 className="dd-h2">End to End<br />Discovery Services</h2>
        <div className="dd-services-list">
          {items.map(({ num, title, body }) => (
            <div key={num} className="dd-service-item">
              <div className="dd-service-num">{num}</div>
              <div>
                <div className="dd-service-title">{title}</div>
                <div className="dd-service-body">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyUs() {
  const items = [
    {
      marker: '01 ·',
      title: 'Faster Turnaround',
      body: 'Responsive support built for active matters and real deadlines. We move when you need us to move.',
    },
    {
      marker: '02 ·',
      title: 'Attorney Friendly Communication',
      body: 'Direct updates in plain language without unnecessary technical jargon or process overhead.',
    },
    {
      marker: '03 ·',
      title: 'Strategic Efficiency',
      body: 'Lean workflows that reduce unnecessary processing and review costs without cutting corners.',
    },
    {
      marker: '04 ·',
      title: 'Reliable Execution',
      body: 'Consistent handling from intake through production. No dropped balls on active matters.',
    },
    {
      marker: '05 ·',
      title: 'Confidential by Design',
      body: 'Sensitive matters managed with the discretion your clients expect from their legal team.',
    },
    {
      marker: '06 ·',
      title: 'Flexible Engagement',
      body: 'From a single urgent collection to full matter support — we scale to the engagement, not the other way around.',
    },
  ]
  return (
    <section className="dd-section dd-section-alt">
      <div className="dd-container">
        <p className="dd-eyebrow">Why Greyledge</p>
        <h2 className="dd-h2">Why Law Firms Choose Us</h2>
        <div className="dd-why-grid">
          {items.map(({ marker, title, body }) => (
            <div key={title} className="dd-why-item">
              <div className="dd-why-marker">{marker}</div>
              <div className="dd-why-title">{title}</div>
              <div className="dd-why-body">{body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Workflows() {
  const firms = [
    'Plaintiff firms',
    'Defense firms',
    'Employment counsel',
    'Boutique litigation firms',
    'Internal legal teams',
    'Investigations counsel',
  ]
  return (
    <section className="dd-section">
      <div className="dd-container">
        <p className="dd-eyebrow">Who We Serve</p>
        <h2 className="dd-h2">Built for Real<br />Legal Workflows</h2>
        <div className="dd-workflow-chips">
          {firms.map((f) => (
            <span key={f} className="dd-workflow-chip">{f}</span>
          ))}
        </div>
        <p className="dd-workflow-sub">
          Whether you need a single collection or full matter support, we scale to the engagement.
        </p>
      </div>
    </section>
  )
}

function Urgent() {
  return (
    <section className="dd-urgent">
      <div className="dd-urgent-inner">
        <p className="dd-urgent-eyebrow">Time Sensitive Matters</p>
        <h2 className="dd-urgent-h2">
          Urgent Matter?<br />We Can Move Quickly.
        </h2>
        <p className="dd-urgent-body">
          When an employee departs, a TRO is filed, data disappears, or a deadline accelerates,
          response time matters. We help legal teams act fast and preserve critical evidence before
          it is lost.
        </p>
        <Link href="#contact" className="dd-btn-urgent">
          Request Rapid Support
        </Link>
      </div>
    </section>
  )
}

function BetterAlternative() {
  const points = [
    'Fast intake and clear scope communication — no waiting rooms',
    'Direct access to the team handling your matter',
    'Transparent process with milestone updates',
    'Lean workflows with no unnecessary billable steps',
    'Built for active litigation pace, not slow vendor queues',
  ]
  return (
    <section className="dd-section dd-section-alt">
      <div className="dd-container">
        <div className="dd-alt-grid">
          <div>
            <p className="dd-eyebrow">The Difference</p>
            <h2 className="dd-h2">A Better Alternative to Slow Legacy Vendors</h2>
            <p className="dd-body" style={{ maxWidth: 480 }}>
              Many providers are built around slow handoffs, bloated process, and confusing
              communication. We built a modern service model focused on speed, clarity, and results
              from intake through production.
            </p>
            <div className="dd-btn-row" style={{ marginTop: 28 }}>
              <Link href="#contact" className="dd-btn-primary">
                See How It Works
              </Link>
            </div>
          </div>
          <div className="dd-alt-right">
            <p className="dd-alt-right-label">What sets us apart</p>
            {points.map((p) => (
              <div key={p} className="dd-alt-item">
                <span className="dd-alt-marker">→</span>
                <span className="dd-alt-text">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="dd-final-cta" id="contact">
      <div className="dd-final-cta-inner">
        <p className="dd-eyebrow dd-eyebrow-centered">Get Started</p>
        <h2 className="dd-h2">Get Clear Answers<br />From Complex Data</h2>
        <p className="dd-final-body">
          Tell us about your matter. We'll recommend scope, timing, and next steps — with no
          obligation and complete confidentiality.
        </p>
        <div className="dd-final-btn-row">
          <Link href="mailto:discovery@greyledge.com" className="dd-btn-primary dd-btn-primary-lg">
            Schedule Consultation
          </Link>
          <Link href="mailto:discovery@greyledge.com" className="dd-btn-secondary dd-btn-secondary-lg">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function DigitalDiscoveryPage() {
  return (
    <div className="dd">
      <Hero />
      <TrustBar />
      <ModernEvidence />
      <Services />
      <WhyUs />
      <Workflows />
      <Urgent />
      <BetterAlternative />
      <FinalCTA />
    </div>
  )
}
