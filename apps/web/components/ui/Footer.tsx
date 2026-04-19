import Link from 'next/link'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div>
          <p className="footer-col-label">Greyledge</p>
          <p className="footer-col-text">
            A clarity engine for law. Search, compare, and trace relationships across statutes,
            regulations, rules, and legal sources in one structured workspace.
          </p>
        </div>
        <div>
          <p className="footer-col-label">Platform</p>
          <Link href="/expand-references" className="footer-col-link">Expand References</Link>
          <Link href="/browse" className="footer-col-link">Browse Authorities</Link>
          <Link href="/compare" className="footer-col-link">Compare Laws</Link>
          <Link href="/resources" className="footer-col-link">Resources</Link>
          <Link href="/digital-discovery" className="footer-col-link">Digital Discovery</Link>
        </div>
        <div>
          <p className="footer-col-label">Reports</p>
          <a href="/isomer-analysis-methodology-2024-04-17-v2.html" className="footer-col-link" target="_blank" rel="noopener noreferrer">Isomer Methodology v2</a>
          <a href="/isomer-analysis-methodology-changelog.html" className="footer-col-link" target="_blank" rel="noopener noreferrer">Methodology Changelog</a>
          <a href="/isomer-analysis-2004-ny-vs-federal-v01-ai-unweighted.html" className="footer-col-link" target="_blank" rel="noopener noreferrer">2004 NY vs Federal v01</a>
          <a href="/isomer-analysis-2004-ny-vs-federal-v02-ai-weighted.html" className="footer-col-link" target="_blank" rel="noopener noreferrer">2004 NY vs Federal v02</a>
          <a href="/brand-guidelines.html" className="footer-col-link" target="_blank" rel="noopener noreferrer">Brand Guidelines</a>
        </div>
        <div>
          <p className="footer-col-label">Contact</p>
          <p className="footer-col-text" style={{ marginBottom: 12 }}>
            hello@greyledge.com
          </p>
          <p className="footer-col-text">
            Not legal advice. Research infrastructure.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy-text">
          &copy; {new Date().getFullYear()} Greyledge LLC. All rights reserved.
        </span>
        <div className="footer-legal-links">
          <Link href="/privacy" className="footer-legal-link">Privacy Policy</Link>
          <Link href="/terms" className="footer-legal-link">Terms of Service</Link>
          <Link href="/cookies" className="footer-legal-link">Cookie Policy</Link>
          <Link href="/disclaimer" className="footer-legal-link">Disclaimer</Link>
          <Link href="/acceptable-use" className="footer-legal-link">Acceptable Use</Link>
        </div>
      </div>
    </footer>
  )
}
