'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const LINKS = [
  { href: '/expand-references', label: 'Expand References'   },
  { href: '/compare',      label: 'Compare Laws'    },
  { href: '/browse',       label: 'Browse Codes'    },
]

const RESOURCES_MENU = {
  Documentation: [
    { href: '/resources/methodology', label: 'Methodology', desc: 'How Greyledge works', icon: '📖' },
    { href: '/resources/changelog', label: 'Changelog', desc: 'What\'s new', icon: '📋' },
  ],
  Corpus: [
    { href: '/corpus', label: 'Corpus Status', desc: 'Loaded provisions', icon: '📊' },
    { href: '/resources/verification', label: 'Verification', desc: 'Source quality', icon: '✓' },
  ],
}

function ResourcesDropdown() {
  const [open, setOpen] = useState(false)
  const path = usePathname()

  const isResourcesActive = path === '/resources' || path.startsWith('/resources/')

  return (
    <div className="nav-dropdown-container" onMouseLeave={() => setOpen(false)}>
      <button
        className={`nav-link nav-dropdown-trigger${isResourcesActive ? ' nav-link-active' : ''}`}
        onMouseEnter={() => setOpen(true)}
      >
        Resources <span className="nav-dropdown-chevron">▾</span>
      </button>

      {open && (
        <div className="nav-mega-menu" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          {Object.entries(RESOURCES_MENU).map(([category, items]) => (
            <div key={category} className="mega-menu-column">
              <div className="mega-menu-title">{category}</div>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="mega-menu-item"
                  onClick={() => setOpen(false)}
                >
                  <span className="mega-menu-item-icon">{item.icon}</span>
                  <div>
                    <div className="mega-menu-item-label">{item.label}</div>
                    <div className="mega-menu-item-desc">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
          <ResourcesDropdown />
          <Link href="/digital-discovery" className="nav-cta">Digital Discovery</Link>
        </div>
      </div>
    </nav>
  )
}
