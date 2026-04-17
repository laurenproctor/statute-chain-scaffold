export const metadata = { title: 'Browse Codes — Law Navigator' }

export default function BrowsePage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Browse Codes</p>
        <h1>Browse statutes by jurisdiction.</h1>
        <p className="tagline">Navigate loaded provisions by code, article, and section.</p>
      </header>

      <section className="section">
        <div className="browse-coming-soon">
          <p className="browse-coming-label">Coming soon</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Hierarchical browsing of loaded statutes by jurisdiction, code, and article.
            Use <a href="/law-navigator" className="attribution-link">Law Navigator</a> to look up a specific statute section or reference,
            or <a href="/corpus" className="attribution-link">Corpus Status</a> to see all loaded provisions.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        Informational research tool. Verify conclusions against official sources and current law.
      </footer>
    </main>
  )
}
