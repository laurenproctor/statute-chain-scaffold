/**
 * NY ingest CLI
 *
 * Usage:
 *   npx tsx scripts/ingest-ny.ts [--fixture data/ny/fixtures/penal-220.16.json ...]
 *   npx tsx scripts/ingest-ny.ts --fetch PEN/220.16 PBH/3306
 *
 * Requires DATABASE_URL env var (or .env file).
 * Docker: docker compose -f infra/docker-compose.yml up -d
 */

import { createReadStream, readFileSync } from 'fs'
import { resolve } from 'path'
import { ingestNyProvisions, type NyFixtureRow } from '../packages/legal-core/src/ingest/ny.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

// ── Minimal Postgres client ───────────────────────────────────────────────────
// Uses `pg` if available; falls back to a no-op dry-run client.

async function makeDbClient(): Promise<DbClient & { end?: () => Promise<void> }> {
  try {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] })
    return {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        const res = await pool.query(sql, params as unknown[])
        return res.rows as T[]
      },
      end: () => pool.end(),
    }
  } catch {
    console.warn('pg not found — running in dry-run mode (no DB writes)')
    return {
      async query<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
        return []
      },
    }
  }
}

// ── NY Legislature API fetch ──────────────────────────────────────────────────

const NY_API_BASE = 'https://legislation.nysenate.gov/api/3/laws'

async function fetchFromApi(lawPath: string): Promise<NyFixtureRow> {
  const [lawId, locationId] = lawPath.split('/')
  if (!lawId || !locationId) throw new Error(`Invalid law path: ${lawPath} (expected PEN/220.16)`)

  const url = `${NY_API_BASE}/${lawId}/${locationId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`)

  const json = (await res.json()) as {
    result: { document: { text: string; lawName: string; docType: string } }
  }
  const doc = json.result.document

  return {
    lawId,
    locationId,
    lawName: doc.lawName,
    docType: doc.docType,
    text: doc.text,
    sourceUrl: url,
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const rows: NyFixtureRow[] = []

  let mode: 'fixture' | 'fetch' = 'fixture'
  const targets: string[] = []

  for (const arg of args) {
    if (arg === '--fixture') { mode = 'fixture'; continue }
    if (arg === '--fetch')   { mode = 'fetch';   continue }
    targets.push(arg)
  }

  // Default: load all fixtures in data/ny/fixtures/
  if (targets.length === 0) {
    const { readdirSync } = await import('fs')
    const dir = resolve(process.cwd(), 'data/ny/fixtures')
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    for (const f of files) {
      rows.push(JSON.parse(readFileSync(resolve(dir, f), 'utf-8')) as NyFixtureRow)
    }
  } else if (mode === 'fixture') {
    for (const path of targets) {
      rows.push(JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf-8')) as NyFixtureRow)
    }
  } else {
    for (const lawPath of targets) {
      console.log(`Fetching ${lawPath}…`)
      rows.push(await fetchFromApi(lawPath))
    }
  }

  if (rows.length === 0) {
    console.error('No provisions to ingest.')
    process.exit(1)
  }

  const db = await makeDbClient()

  try {
    console.log(`Ingesting ${rows.length} provision(s)…`)
    const result = await ingestNyProvisions(rows, db)
    console.log(`✓ provisions: ${result.provisions}`)
    console.log(`✓ citations:  ${result.citations}`)
    if (result.errors.length > 0) {
      console.error('Errors:')
      for (const e of result.errors) console.error(' ', e)
      process.exit(1)
    }
  } finally {
    await db.end?.()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
