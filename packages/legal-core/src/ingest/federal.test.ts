import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { normalizeFederalProvision, ingestFederalProvisions, computeVersionHash, type FederalFixtureRow } from './federal.js'
import { buildChain } from '../chain/buildChain.js'
import { resolveCitation } from '../resolver/resolveCitation.js'
import type { DbClient } from '../resolver/resolveCitation.js'
import type { ParsedCitation } from '@statute-chain/types'

// ── Fixture loader ────────────────────────────────────────────────────────────

function loadFixture(name: string): FederalFixtureRow {
  const p = resolve(__dirname, '../../../../data/federal/fixtures', name)
  return JSON.parse(readFileSync(p, 'utf-8')) as FederalFixtureRow
}

const fix802 = loadFixture('usc-21-802.json')
const fix812 = loadFixture('usc-21-812.json')

// ── 1. Fixture validation ─────────────────────────────────────────────────────

describe('usc-21-802.json fixture', () => {
  it('has title "21"', () => expect(fix802.title).toBe('21'))
  it('has section "802"', () => expect(fix802.section).toBe('802'))
  it('has non-empty text', () => expect(fix802.text.length).toBeGreaterThan(50))
  it('has sourceUrl pointing to uscode.house.gov', () => expect(fix802.sourceUrl).toMatch(/uscode\.house\.gov/))
})

describe('usc-21-812.json fixture', () => {
  it('has title "21"', () => expect(fix812.title).toBe('21'))
  it('has section "812"', () => expect(fix812.section).toBe('812'))
  it('has non-empty text', () => expect(fix812.text.length).toBeGreaterThan(50))
  it('has sourceUrl pointing to uscode.house.gov', () => expect(fix812.sourceUrl).toMatch(/uscode\.house\.gov/))
})

// ── 2. normalizeFederalProvision ──────────────────────────────────────────────

describe('normalizeFederalProvision', () => {
  const p802 = normalizeFederalProvision(fix802)
  const p812 = normalizeFederalProvision(fix812)

  it('canonical_id is federal/usc/21/802', () => expect(p802.canonical_id).toBe('federal/usc/21/802'))
  it('canonical_id is federal/usc/21/812', () => expect(p812.canonical_id).toBe('federal/usc/21/812'))
  it('jurisdiction is federal', () => expect(p802.jurisdiction).toBe('federal'))
  it('code is usc/21 (not usc)', () => expect(p802.code).toBe('usc/21'))
  it('section is 802', () => expect(p802.section).toBe('802'))
  it('section is 812', () => expect(p812.section).toBe('812'))
  it('preserves text_content for 802', () => expect(p802.text_content).toContain('controlled substance'))
  it('preserves text_content for 812', () => expect(p812.text_content).toContain('Schedule'))
  it('sets provenance_source from sourceUrl for 802', () => expect(p802.provenance_source).toBe(fix802.sourceUrl))
  it('sets provenance_source from sourceUrl for 812', () => expect(p812.provenance_source).toBe(fix812.sourceUrl))
  it('includes a non-empty version_hash for 802', () => expect(p802.version_hash).toMatch(/^[0-9a-f]{64}$/))
  it('includes a non-empty version_hash for 812', () => expect(p812.version_hash).toMatch(/^[0-9a-f]{64}$/))
  it('802 and 812 have different version_hashes', () => expect(p802.version_hash).not.toBe(p812.version_hash))
})

// ── 3. ingestFederalProvisions (mock DB) ──────────────────────────────────────

describe('ingestFederalProvisions upsert', () => {
  it('upserts both provisions and records citation edges', async () => {
    const upserted: string[] = []
    const edges: Array<[string, string]> = []

    const versionHashes: Record<string, string> = {}
    const db: DbClient = {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        if (sql.includes('INSERT INTO provisions')) {
          upserted.push(params?.[0] as string)
          versionHashes[params?.[0] as string] = params?.[6] as string
        }
        if (sql.includes('INSERT INTO citations')) edges.push([params?.[0] as string, params?.[1] as string])
        return []
      },
    }

    await ingestFederalProvisions([fix802, fix812], db)

    expect(upserted).toContain('federal/usc/21/802')
    expect(upserted).toContain('federal/usc/21/812')
    expect(versionHashes['federal/usc/21/802']).toMatch(/^[0-9a-f]{64}$/)
    expect(versionHashes['federal/usc/21/812']).toMatch(/^[0-9a-f]{64}$/)

    expect(edges.some(([f, t]) => f === 'federal/usc/21/802' && t === 'federal/usc/21/812')).toBe(true)
    expect(edges.some(([f, t]) => f === 'federal/usc/21/802' && t === 'ny/phl/3302')).toBe(true)
    expect(edges.some(([f, t]) => f === 'federal/usc/21/802' && t === 'ny/phl/3306')).toBe(true)
    expect(edges.some(([f, t]) => f === 'federal/usc/21/812' && t === 'federal/usc/21/802')).toBe(true)
  })

  it('does not create self-referential edges', async () => {
    const edges: Array<[string, string]> = []
    const db: DbClient = {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        if (sql.includes('INSERT INTO citations')) edges.push([params?.[0] as string, params?.[1] as string])
        return []
      },
    }
    await ingestFederalProvisions([fix802, fix812], db)
    expect(edges.every(([f, t]) => f !== t)).toBe(true)
  })
})

// ── 4. Idempotency ────────────────────────────────────────────────────────────

describe('ingestFederalProvisions idempotency', () => {
  it('running ingest twice produces same final node/edge counts as once', async () => {
    // Simulate ON CONFLICT DO UPDATE (provisions) and DO NOTHING (citations) semantics
    const provisions = new Map<string, unknown>()
    const edgeSet = new Set<string>()

    const db: DbClient = {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        if (sql.includes('INSERT INTO provisions')) {
          provisions.set(params?.[0] as string, params)
        }
        if (sql.includes('INSERT INTO citations')) {
          edgeSet.add(`${params?.[0]}→${params?.[1]}`)
        }
        return []
      },
    }

    await ingestFederalProvisions([fix802, fix812], db)
    const afterFirst = { provisions: provisions.size, edges: edgeSet.size }

    await ingestFederalProvisions([fix802, fix812], db)
    const afterSecond = { provisions: provisions.size, edges: edgeSet.size }

    expect(afterSecond.provisions).toBe(afterFirst.provisions)
    expect(afterSecond.edges).toBe(afterFirst.edges)
  })
})

// ── 5. Chain expansion ────────────────────────────────────────────────────────

function makeInMemoryDb() {
  const provisions = new Map<string, { text: string; outbound: string[] }>()

  const db: DbClient = {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const p0 = params?.[0] as string | undefined
      const p1 = params?.[1] as string | undefined

      if (sql.includes('INSERT INTO provisions')) {
        if (p0) provisions.set(p0, { text: params?.[4] as string ?? '', outbound: [] })
      }
      if (sql.includes('INSERT INTO citations')) {
        if (p0 && p1) {
          const entry = provisions.get(p0)
          if (entry) entry.outbound.push(p1)
        }
      }
      if (sql.includes('FROM provisions')) {
        const entry = provisions.get(p0 ?? '')
        if (!entry) return []
        return [{
          canonical_id: p0,
          text_content: entry.text,
          ingestion_status: 'ingested',
          confidence: '1.00',
          provenance_source: 'test',
          ingested_at: null,
        }] as T[]
      }
      if (sql.includes('FROM citations')) {
        const entry = provisions.get(p0 ?? '')
        return (entry?.outbound ?? []).map((id) => ({
          from_canonical_id: p0,
          to_canonical_id: id,
        })) as T[]
      }
      if (sql.includes('FROM aliases')) return []
      if (sql.includes('FROM ambiguous_citations')) return []
      return []
    },
  }

  return db
}

describe('802 chain expansion', () => {
  it('buildChain from 802 includes both federal nodes', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const chain = await buildChain('federal/usc/21/802', db, { maxDepth: 2 })

    expect(chain.nodes['federal/usc/21/802']).toBeDefined()
    expect(chain.nodes['federal/usc/21/812']).toBeDefined()
  })

  it('chain has edge 802→812', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const chain = await buildChain('federal/usc/21/802', db, { maxDepth: 2 })

    expect(chain.edges.some((e) => e.from === 'federal/usc/21/802' && e.to === 'federal/usc/21/812')).toBe(true)
  })

  it('both federal nodes have status ingested', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const chain = await buildChain('federal/usc/21/802', db, { maxDepth: 2 })

    expect(chain.nodes['federal/usc/21/802']?.status).toBe('ingested')
    expect(chain.nodes['federal/usc/21/812']?.status).toBe('ingested')
  })

  it('no duplicate nodes in chain', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const chain = await buildChain('federal/usc/21/802', db, { maxDepth: 2 })

    const ids = Object.keys(chain.nodes)
    expect(ids.length).toBe(new Set(ids).size)
  })
})

// ── 6. Unsupported references remain unresolved ───────────────────────────────

describe('unsupported references', () => {
  it('non-parseable phrases like "subtitle E of the Internal Revenue Code" do not produce chain nodes', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const chain = await buildChain('federal/usc/21/802', db, { maxDepth: 2 })

    // All resolved nodes must have canonical IDs in federal/usc/* or ny/* form
    const nodeIds = Object.keys(chain.nodes)
    for (const id of nodeIds) {
      expect(id).toMatch(/^(federal|ny)\//)
    }
  })

  it('ingest result has zero errors for valid fixtures', async () => {
    const db: DbClient = { async query<T>(): Promise<T[]> { return [] } }
    const result = await ingestFederalProvisions([fix802, fix812], db)
    expect(result.errors).toHaveLength(0)
    expect(result.provisions).toBe(2)
  })
})

// ── 7. Hash stability ─────────────────────────────────────────────────────────

describe('computeVersionHash stability', () => {
  it('same text always produces the same hash', () => {
    expect(computeVersionHash(fix802.text)).toBe(computeVersionHash(fix802.text))
  })

  it('hash is 64-character lowercase hex (SHA-256)', () => {
    expect(computeVersionHash(fix802.text)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('different text produces a different hash', () => {
    expect(computeVersionHash(fix802.text)).not.toBe(computeVersionHash(fix812.text))
  })

  it('single character change changes the hash', () => {
    const original = computeVersionHash(fix802.text)
    const modified = computeVersionHash(fix802.text + ' ')
    expect(original).not.toBe(modified)
  })
})

// ── 8. resolveCitation post-ingest ────────────────────────────────────────────

function makeParsed(canonicalId: string): ParsedCitation {
  return {
    raw: canonicalId,
    format: 'structured',
    confidence: 1.0,
    jurisdiction: 'federal',
    code: 'usc/21',
    section: canonicalId.split('/')[3] ?? '',
    subsection_path: [],
    canonical_id: canonicalId,
  }
}

describe('resolveCitation after ingest', () => {
  it('returns status ingested for 802 after ingest', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const resolved = await resolveCitation(makeParsed('federal/usc/21/802'), db)
    expect(resolved.status).toBe('ingested')
  })

  it('returns non-empty text for 802 after ingest', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const resolved = await resolveCitation(makeParsed('federal/usc/21/802'), db)
    expect(resolved.text).toBeTruthy()
  })

  it('outbound_citations for 802 includes federal/usc/21/812', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const resolved = await resolveCitation(makeParsed('federal/usc/21/802'), db)
    expect(resolved.outbound_citations).toContain('federal/usc/21/812')
  })

  it('returns status ingested for 812 after ingest', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const resolved = await resolveCitation(makeParsed('federal/usc/21/812'), db)
    expect(resolved.status).toBe('ingested')
  })

  it('outbound_citations for 812 includes federal/usc/21/802', async () => {
    const db = makeInMemoryDb()
    await ingestFederalProvisions([fix802, fix812], db)
    const resolved = await resolveCitation(makeParsed('federal/usc/21/812'), db)
    expect(resolved.outbound_citations).toContain('federal/usc/21/802')
  })

  it('returns status not_ingested for a provision never inserted', async () => {
    const db = makeInMemoryDb()
    const resolved = await resolveCitation(makeParsed('federal/usc/21/999'), db)
    expect(resolved.status).toBe('not_ingested')
  })
})
