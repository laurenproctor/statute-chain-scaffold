export const metadata = { title: 'Browse Codes — Legal Cross-Reference Expander' }

export default function BrowsePage() {
  return (
    <main className="page">
      <header className="site-header">
        <div style={{ maxWidth: '66.666%' }}>
          <p className="page-eyebrow">Browse Codes</p>
          <h1>Browse Statutes by Jurisdiction</h1>
          <p className="tagline">Navigate loaded provisions by code, article, and section.</p>
        </div>
      </header>

      <section className="section">
        <div className="browse-coming-soon">
          <p className="browse-coming-label">Coming soon</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Hierarchical browsing of loaded statutes by jurisdiction, code, and article.
            Use <a href="/legal-cross-reference-expander" className="attribution-link">Legal Cross-Reference Expander</a> to look up a specific statute section or reference,
            or <a href="/corpus" className="attribution-link">Corpus Status</a> to see all loaded provisions.
          </p>
        </div>
      </section>

    </main>
  )
}
