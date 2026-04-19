'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/legal-cross-reference-expander', label: 'Legal Cross-Reference Expander'   },
  { href: '/compare',      label: 'Compare Laws'    },
  { href: '/browse',       label: 'Browse Codes'    },
  { href: '/corpus',       label: 'Corpus'          },
]

export function Nav() {
  const path = usePathname()

  function isActive(href: string) {
    return path === href || path.startsWith(href + '/')
  }

  return (
    <nav className="site-nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">Greyledge</Link>
        <div className="nav-links">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive(href) ? ' nav-link-active' : ''}`}
            >
              {label}
            </Link>
          ))}
          <Link href="/digital-discovery" className="nav-cta">Digital Discovery</Link>
        </div>
      </div>
    </nav>
  )
}
