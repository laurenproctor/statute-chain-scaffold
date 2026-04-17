/**
 * Ingest top-N missing nodes from the missing_nodes priority queue.
 *
 * Usage:
 *   npx tsx scripts/ingest-missing.ts [--top=20]
 *
 * Requires DATABASE_URL env var (or .env file).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { getTopMissing } from '../packages/legal-core/src/ingest/missing.js'
import { ingestNyProvisions, type NyFixtureRow } from '../packages/legal-core/src/ingest/ny.js'
import { ingestFederalProvisions, type FederalFixtureRow } from '../packages/legal-core/src/ingest/federal.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

// ── DB client ─────────────────────────────────────────────────────────────────

async function makeDbClient(): Promise<DbClient & { end?: () => Promise<void> }> {
  const url = process.env['DATABASE_URL']
  if (!url) {
    console.warn('DATABASE_URL not set — dry-run mode')
    return { async query<T>(): Promise<T[]> { return [] } }
  }
  try {
    const { getDb } = await import('../packages/database/src/index.js')
    const sql = getDb() as { unsafe: (q: string, p?: unknown[]) => Promise<unknown[]>; end: () => Promise<void> }
    return {
      async query<T>(q: string, params?: unknown[]): Promise<T[]> {
        return sql.unsafe(q, params) as Promise<T[]>
      },
      end: () => sql.end(),
    }
  } catch (err) {
    console.warn('DB init failed — dry-run mode:', err)
    return { async query<T>(): Promise<T[]> { return [] } }
  }
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const NY_API_BASE = 'https://legislation.nysenate.gov/api/3/laws'

async function fetchNy(canonicalId: string): Promise<NyFixtureRow | null> {
  // canonical_id: ny/<code>/<section>
  const parts = canonicalId.split('/')
  if (parts.length < 3) return null

  // Reverse-map code to lawId
  const CODE_TO_LAW_ID: Record<string, string> = {
    penal: 'PEN', phl: 'PBH', cplr: 'CVP', vtl: 'VAT', tax: 'TAX', ed: 'EDN', gbl: 'GBS', corr: 'COR', exec: 'EXC',
  }
  const code = parts[1]!
  const section = parts[2]!
  const lawId = CODE_TO_LAW_ID[code] ?? code.toUpperCase()

  const url = `${NY_API_BASE}/${lawId}/${section}`
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`  NY API ${res.status} for ${url}`)
    return null
  }
  const json = (await res.json()) as { result: { document: { text: string; lawName: string; docType: string } } }
  const doc = json.result.document
  return { lawId, locationId: section, lawName: doc.lawName, docType: doc.docType, text: doc.text, sourceUrl: url }
}

async function fetchFederal(_canonicalId: string): Promise<FederalFixtureRow | null> {
  // Federal live-fetch not implemented yet — check fixture directory
  return null
}

function loadFixture<T>(dir: string, canonicalId: string): T | null {
  try {
    const parts = canonicalId.split('/')
    // ny/<code>/<section> → data/ny/fixtures/<code>-<section>.json
    // federal/usc/<title>/<section> → data/federal/fixtures/usc-<title>-<section>.json
    let filename: string
    if (parts[0] === 'ny') {
      filename = `${parts[1]}-${parts[2]}.json`
    } else {
      filename = `${parts[1]}-${parts[2]}-${parts[3]}.json`
    }
    const path = resolve(dir, filename)
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return null
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  let topN = 20
  for (const arg of args) {
    const m = arg.match(/^--top=(\d+)$/)
    if (m) topN = parseInt(m[1]!, 10)
  }

  const db = await makeDbClient()

  try {
    const missing = await getTopMissing(topN, db)
    if (missing.length === 0) {
      console.log('No missing nodes — all references resolved.')
      return
    }

    console.log(`Processing top ${missing.length} missing node(s)…`)

    const nyRows: NyFixtureRow[] = []
    const federalRows: FederalFixtureRow[] = []

    for (const node of missing) {
      const id = node.canonical_id
      console.log(`  ${id} (score=${node.priority_score}, refs=${node.inbound_count})`)

      if (id.startsWith('ny/')) {
        const fixture = loadFixture<NyFixtureRow>(
          resolve(process.cwd(), 'data/ny/fixtures'), id)
        if (fixture) {
          console.log(`    → loaded from fixture`)
          nyRows.push(fixture)
        } else {
          console.log(`    → fetching from NY Legislature API…`)
          const row = await fetchNy(id)
          if (row) nyRows.push(row)
        }
      } else if (id.startsWith('federal/')) {
        const fixture = loadFixture<FederalFixtureRow>(
          resolve(process.cwd(), 'data/federal/fixtures'), id)
        if (fixture) {
          console.log(`    → loaded from fixture`)
          federalRows.push(fixture)
        } else {
          const row = await fetchFederal(id)
          if (row) federalRows.push(row)
          else console.warn(`    → no fixture or API source for ${id}`)
        }
      } else {
        console.warn(`    → unknown jurisdiction, skipping`)
      }
    }

    if (nyRows.length > 0) {
      const r = await ingestNyProvisions(nyRows, db)
      console.log(`✓ NY: ${r.provisions} provisions, ${r.references} references`)
      if (r.errors.length > 0) r.errors.forEach((e) => console.error('  ', e))
    }

    if (federalRows.length > 0) {
      const r = await ingestFederalProvisions(federalRows, db)
      console.log(`✓ Federal: ${r.provisions} provisions, ${r.references} references`)
      if (r.errors.length > 0) r.errors.forEach((e) => console.error('  ', e))
    }

    // Remove ingested nodes from missing_nodes table
    const allIngested = [
      ...nyRows.map((r) => {
        const CODE_TO_LAW_ID: Record<string, string> = { PEN: 'penal', PBH: 'phl', CVP: 'cplr', VAT: 'vtl', TAX: 'tax', EDN: 'ed' }
        const code = CODE_TO_LAW_ID[r.lawId] ?? r.lawId.toLowerCase()
        return `ny/${code}/${r.locationId}`
      }),
      ...federalRows.map((r) => `federal/usc/${r.title}/${r.section}`),
    ]
    for (const id of allIngested) {
      await db.query('DELETE FROM missing_nodes WHERE canonical_id = $1', [id])
    }
    console.log(`✓ Cleared ${allIngested.length} node(s) from missing_nodes queue`)
  } finally {
    await db.end?.()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
