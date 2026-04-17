const NY_CODE_NAMES: Record<string, string> = {
  penal:  'NY Penal Law',
  phl:    'NY Public Health Law',
  cplr:   'NY Civil Practice Law & Rules',
  vtl:    'NY Vehicle & Traffic Law',
  ed:     'NY Education Law',
  gbl:    'NY General Business Law',
  corr:   'NY Correction Law',
  exec:   'NY Executive Law',
  tax:    'NY Tax Law',
}

export function formatCanonicalId(id: string): string {
  const parts = id.split('/')
  if (parts.length < 3) return id

  const jurisdiction = parts[0]!
  const code = parts[1]!

  if (jurisdiction === 'federal' && code === 'usc' && parts.length >= 4) {
    const title = parts[2]!
    const section = parts.slice(3).join('/')
    return `${title} U.S.C. § ${section}`
  }

  if (jurisdiction === 'ny') {
    const section = parts.slice(2).join('/')
    const name = NY_CODE_NAMES[code]
    return name ? `${name} § ${section}` : `NY ${code} § ${section}`
  }

  return id
}

const KNOWN_DESCRIPTIONS: Record<string, string> = {
  'federal/usc/21/802': 'definitions',
  'federal/usc/21/812': 'schedules of controlled substances',
  'federal/usc/26/501': 'tax-exempt organizations',
  'ny/penal/220.00':    'article 220 definitions',
  'ny/penal/220.16':    'criminal possession of a controlled substance',
  'ny/penal/220.18':    'criminal possession — second degree',
  'ny/phl/3302':        'definitions',
  'ny/phl/3306':        'NY controlled substance schedules',
  'ny/phl/3307':        'schedules — additions and deletions',
}

export function knownDescription(canonicalId: string): string | undefined {
  return KNOWN_DESCRIPTIONS[canonicalId]
}

// Returns a subtitle derived from statute text, or undefined if nothing useful.
// Preference order:
//   1. Title-like first line (short, starts uppercase, no mid-sentence periods)
//   2. Short cleaned preview (≤80 chars)
//   3. undefined
export function extractSubtitle(text: string | undefined): string | undefined {
  if (!text) return undefined

  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 2)
  if (!firstLine) return undefined

  const isTitleLike =
    firstLine.length <= 80 &&
    /^[A-Z]/.test(firstLine) &&
    !/\.\s+[a-z]/.test(firstLine) // no mid-sentence continuation

  if (isTitleLike) {
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '…' : firstLine
  }

  const preview = text.replace(/\s+/g, ' ').trim()
  if (preview.length < 20) return undefined
  if (preview.length <= 80) return preview
  const cut = preview.slice(0, 77)
  const boundary = cut.lastIndexOf(' ')
  return (boundary > 40 ? cut.slice(0, boundary) : cut) + '…'
}
