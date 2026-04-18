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
          <Link href="/law-navigator" className="footer-col-link">Law Navigator</Link>
          <Link href="/browse" className="footer-col-link">Browse Authorities</Link>
          <Link href="/compare" className="footer-col-link">Compare Laws</Link>
          <Link href="/corpus" className="footer-col-link">Corpus Status</Link>
          <Link href="/digital-discovery" className="footer-col-link">Digital Discovery</Link>
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
