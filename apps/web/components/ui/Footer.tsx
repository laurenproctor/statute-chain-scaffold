import Link from 'next/link'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-wordmark">Greyledge</Link>
          <p className="footer-tagline">A clarity engine for law.</p>
        </div>
      </div>
      <div className="footer-copy">
        <span>&copy; {new Date().getFullYear()} Greyledge. All rights reserved.</span>
        <div className="footer-legal-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/cookies">Cookie Policy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/acceptable-use">Acceptable Use</Link>
        </div>
      </div>
      <div className="site-notice">
        <p>Informational research tool. Verify conclusions against official sources and current law.</p>
      </div>
    </footer>
  )
}
