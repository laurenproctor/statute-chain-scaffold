import Link from 'next/link'

const LINKS = [
  { href: '/law-navigator', label: 'Law Navigator' },
  { href: '/compare',       label: 'Compare Laws'  },
  { href: '/browse',        label: 'Browse Codes'  },
  { href: '/corpus',        label: 'Corpus'        },
]

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-wordmark">Greyledge</Link>
          <p className="footer-tagline">A clarity engine for law.</p>
        </div>
        <nav className="footer-nav">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="footer-nav-link">{label}</Link>
          ))}
        </nav>
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
    </footer>
  )
}
