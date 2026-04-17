'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',        label: 'Statute Explorer' },
  { href: '/compare', label: 'Compare Laws'     },
  { href: '/browse',  label: 'Browse Codes'     },
]

export function Nav() {
  const path = usePathname()

  function isActive(href: string) {
    if (href === '/') return path === '/'
    return path.startsWith(href)
  }

  return (
    <nav className="site-nav">
      <Link href="/" className="nav-brand">Statute Explorer</Link>
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
      </div>
    </nav>
  )
}
