import { existsSync } from 'fs'
import { resolve } from 'path'

// Maps canonical code → NY Senate law ID (inverse of legal-core LAW_ID_TO_CODE)
export const CODE_TO_LAW_ID: Record<string, string> = {
  penal: 'PEN',
  phl:   'PBH',
  cplr:  'CVP',
  vtl:   'VAT',
  tax:   'TAX',
  ed:    'EDN',
  gbl:   'GBS',
  corr:  'COR',
  exec:  'EXC',
}

export type IngestRoute =
  | { type: 'ny';      lawId: string; locationId: string }
  | { type: 'federal'; title: string; section: string }
  | { type: 'unsupported' }

export type SourceMode = 'live_api' | 'fixture' | 'manual'

export type SourceCapability = {
  mode: SourceMode
  label: string
  fixturePath?: string
}

export function parseIngestRoute(canonicalId: string): IngestRoute {
  const parts = canonicalId.split('/')
  const jurisdiction = parts[0]
  const code = parts[1]

  if (jurisdiction === 'ny' && code && parts.length >= 3) {
    const lawId = CODE_TO_LAW_ID[code]
    if (!lawId) return { type: 'unsupported' }
    const locationId = parts.slice(2).join('/')
    return { type: 'ny', lawId, locationId }
  }

  if (jurisdiction === 'federal' && code === 'usc' && parts.length >= 4) {
    return { type: 'federal', title: parts[2]!, section: parts.slice(3).join('/') }
  }

  return { type: 'unsupported' }
}

// Fixture path convention: data/federal/fixtures/usc-{title}-{section}.json
// Called server-side only (uses fs). __dirname = apps/web/lib, fixtures at repo-root/data/.
export function federalFixturePath(title: string, section: string): string {
  return resolve(__dirname, '../../../data/federal/fixtures', `usc-${title}-${section}.json`)
}

export function getSourceCapability(canonicalId: string): SourceCapability {
  const route = parseIngestRoute(canonicalId)

  if (route.type === 'ny') {
    return { mode: 'live_api', label: 'Supported Live Source' }
  }

  if (route.type === 'federal') {
    const fixturePath = federalFixturePath(route.title, route.section)
    if (existsSync(fixturePath)) {
      return { mode: 'fixture', label: 'Fixture Available', fixturePath }
    }
    return { mode: 'manual', label: 'Manual Review' }
  }

  return { mode: 'manual', label: 'Manual Review' }
}

export function isTrustedIngestTarget(canonicalId: string): boolean {
  const cap = getSourceCapability(canonicalId)
  return cap.mode === 'live_api' || cap.mode === 'fixture'
}
