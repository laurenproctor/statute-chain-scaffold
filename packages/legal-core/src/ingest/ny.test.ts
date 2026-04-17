import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { normalizeNyProvision, ingestNyProvisions, type NyFixtureRow } from './ny.js'
import { extractCitationsFromText } from '@statute-chain/parser'
import { buildChain } from '../chain/buildChain.js'
import type { DbClient } from '../resolver/resolveCitation.js'
import type { ResolvedProvision } from '@statute-chain/types'

// ── Fixture loader ────────────────────────────────────────────────────────────

function loadFixture(name: string): NyFixtureRow {
  const p = resolve(__dirname, '../../../../data/ny/fixtures', name)
  return JSON.parse(readFileSync(p, 'utf-8')) as NyFixtureRow
}

const fix220_16 = loadFixture('penal-220.16.json')
const fix3306 = loadFixture('phl-3306.json')
const fix220_00 = loadFixture('penal-220.00.json')

// ── 1. Normalization ──────────────────────────────────────────────────────────

describe('normalizeNyProvision', () => {
  it('produces correct canonical_id for Penal Law fixture', () => {
    const p = normalizeNyProvision(fix220_16)
    expect(p.canonical_id).toBe('ny/penal/220.16')
  })

  it('produces correct canonical_id for PHL fixture', () => {
    const p = normalizeNyProvision(fix3306)
    expect(p.canonical_id).toBe('ny/phl/3306')
  })

  it('sets jurisdiction and code correctly', () => {
    const p = normalizeNyProvision(fix220_16)
    expect(p.jurisdiction).toBe('ny')
    expect(p.code).toBe('penal')
    expect(p.section).toBe('220.16')
  })

  it('preserves text_content', () => {
    const p = normalizeNyProvision(fix220_16)
    expect(p.text_content).toContain('criminal possession')
  })

  it('sets provenance_source to the fixture sourceUrl', () => {
    const p = normalizeNyProvision(fix220_16)
    expect(p.provenance_source).toBe(fix220_16.sourceUrl)
  })
})

// ── 2. Citation extraction from text ─────────────────────────────────────────

describe('extractCitationsFromText', () => {
  it('finds PHL § 3306 in 220.16 text', () => {
    const ids = extractCitationsFromText(fix220_16.text)
    expect(ids).toContain('ny/phl/3306')
  })

  it('finds PHL § 3302 in 220.16 text', () => {
    const ids = extractCitationsFromText(fix220_16.text)
    expect(ids).toContain('ny/phl/3302')
  })

  it('finds Penal Law § 220.00 in 220.16 text', () => {
    const ids = extractCitationsFromText(fix220_16.text)
    expect(ids).toContain('ny/penal/220.00')
  })

  it('finds Penal Law § 220.18 in 220.16 text', () => {
    const ids = extractCitationsFromText(fix220_16.text)
    expect(ids).toContain('ny/penal/220.18')
  })

  it('finds federal 21 U.S.C. § 812 in 3306 text', () => {
    const ids = extractCitationsFromText(fix3306.text)
    expect(ids).toContain('federal/usc/21/812')
  })

  it('finds federal 21 U.S.C. § 802 in 3306 text', () => {
    const ids = extractCitationsFromText(fix3306.text)
    expect(ids).toContain('federal/usc/21/802')
  })

  it('returns only unique canonical IDs', () => {
    const ids = extractCitationsFromText(fix220_16.text)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('does not include the provision itself when its own section is mentioned', () => {
    // 220.00 text mentions "§ 3302 through § 3399" — should not return partial matches
    const ids = extractCitationsFromText(fix220_00.text)
    expect(ids).not.toContain('ny/phl/3399') // "§ 3399" is a range endpoint, not a real ref
  })
})

// ── 3. Upsert (mock DB) ───────────────────────────────────────────────────────

describe('ingestNyProvisions', () => {
  it('upserts all provisions and citation edges into DB', async () => {
    const { ingestNyProvisions } = await import('./ny.js')

    const upserted: string[] = []
    const citationEdges: Array<[string, string]> = []

    const db: DbClient = {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        if (sql.includes('INSERT INTO provisions')) {
          upserted.push(params?.[0] as string)
        }
        if (sql.includes('INSERT INTO citations')) {
          citationEdges.push([params?.[0] as string, params?.[1] as string])
        }
        return []
      },
    }

    await ingestNyProvisions([fix220_16, fix3306], db)

    expect(upserted).toContain('ny/penal/220.16')
    expect(upserted).toContain('ny/phl/3306')
    // 220.16 → 3306 edge should be recorded
    const has220_16_to_3306 = citationEdges.some(
      ([from, to]) => from === 'ny/penal/220.16' && to === 'ny/phl/3306',
    )
    expect(has220_16_to_3306).toBe(true)
  })
})

// ── 4. Chain expansion integration ───────────────────────────────────────────

describe('220.16 chain expansion', () => {
  it('buildChain returns 220.16 + 3306 nodes after ingesting fixtures', async () => {
    const { ingestNyProvisions } = await import('./ny.js')

    // Build an in-memory store to simulate the DB after ingest
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

    await ingestNyProvisions([fix220_16, fix3306, fix220_00], db)

    const graph = await buildChain('ny/penal/220.16', db, { maxDepth: 2 })

    expect(graph.nodes['ny/penal/220.16']).toBeDefined()
    expect(graph.nodes['ny/phl/3306']).toBeDefined()
    expect(graph.nodes['ny/penal/220.00']).toBeDefined()

    const edge = graph.edges.find(
      (e) => e.from === 'ny/penal/220.16' && e.to === 'ny/phl/3306',
    )
    expect(edge).toBeDefined()
  })

  it('chain from 3306 includes federal USC references', async () => {
    const { ingestNyProvisions } = await import('./ny.js')

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

    await ingestNyProvisions([fix3306], db)

    const graph = await buildChain('ny/phl/3306', db, { maxDepth: 1 })

    const federalNodes = Object.keys(graph.nodes).filter((id) => id.startsWith('federal/'))
    expect(federalNodes.length).toBeGreaterThan(0)
  })
})

// ── 5. Legal Relationship emission ────────────────────────────────────────────

type CapturedCitation = {
  from: string
  to: string
  relationship_type: string
  source_method: string
  confidence: number | null
  explanation: string
}

function makeCaptureDb(): { db: DbClient; captured: CapturedCitation[] } {
  const captured: CapturedCitation[] = []
  const db: DbClient = {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      if (sql.includes('INSERT INTO citations')) {
        captured.push({
          from: params?.[0] as string,
          to: params?.[1] as string,
          relationship_type: params?.[2] as string,
          source_method: params?.[3] as string,
          confidence: params?.[4] as number | null,
          explanation: params?.[5] as string,
        })
      }
      return []
    },
  }
  return { db, captured }
}

describe('ingestNyProvisions — legal_relationships emission for ny/penal/220.16', () => {
  it('emits at least one relationship for every outbound citation', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.length).toBeGreaterThan(0)
    expect(captured.every(r => r.from === 'ny/penal/220.16')).toBe(true)
  })

  it('emits relationship_type=references for all parser citations', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.every(r => r.relationship_type === 'references')).toBe(true)
  })

  it('emits source_method=parser for all citations', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.every(r => r.source_method === 'parser')).toBe(true)
  })

  it('emits confidence=1 for all parser citations', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.every(r => r.confidence === 1)).toBe(true)
  })

  it('emits explanation="Referenced directly in text"', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.every(r => r.explanation === 'Referenced directly in text')).toBe(true)
  })

  it('emits a references relationship for ny/phl/3306', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    const rel = captured.find(r => r.to === 'ny/phl/3306')
    expect(rel).toBeDefined()
    expect(rel!.relationship_type).toBe('references')
    expect(rel!.explanation).toBe('Referenced directly in text')
  })

  it('emits a references relationship for ny/phl/3302', async () => {
    const { db, captured } = makeCaptureDb()
    await ingestNyProvisions([fix220_16], db)
    expect(captured.some(r => r.to === 'ny/phl/3302')).toBe(true)
  })

  it('populates legal_relationships on chain nodes after ingest', async () => {
    type StoredRel = { to: string; rel_type: string; method: string; conf: string; expl: string }
    const store = new Map<string, { text: string; rels: StoredRel[] }>()

    const db: DbClient = {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        const p0 = params?.[0] as string | undefined
        const p1 = params?.[1] as string | undefined
        if (sql.includes('INSERT INTO provisions')) {
          if (p0) store.set(p0, { text: params?.[4] as string ?? '', rels: [] })
        }
        if (sql.includes('INSERT INTO citations')) {
          if (p0 && p1) store.get(p0)?.rels.push({
            to: p1,
            rel_type: params?.[2] as string,
            method: params?.[3] as string,
            conf: String(params?.[4] ?? '1.0'),
            expl: params?.[5] as string,
          })
        }
        if (sql.includes('FROM provisions WHERE canonical_id =')) {
          const entry = store.get(p0 ?? '')
          if (!entry) return []
          return [{ canonical_id: p0, text_content: entry.text, ingestion_status: 'ingested', confidence: '1.00', provenance_source: 'test', ingested_at: null }] as T[]
        }
        if (sql.includes('FROM citations WHERE from_canonical_id')) {
          return (store.get(p0 ?? '')?.rels ?? []).map(r => ({
            to_canonical_id: r.to, relationship_type: r.rel_type,
            source_method: r.method, confidence: r.conf, explanation: r.expl,
          })) as T[]
        }
        if (sql.includes('FROM provisions WHERE canonical_id LIKE')) return []
        if (sql.includes('FROM aliases')) return []
        if (sql.includes('FROM ambiguous_citations')) return []
        return []
      },
    }

    await ingestNyProvisions([fix220_16], db)
    const graph = await buildChain('ny/penal/220.16', db, { maxDepth: 1 })

    const root = graph.nodes['ny/penal/220.16']
    expect(root).toBeDefined()
    expect(root!.legal_relationships.length).toBeGreaterThan(0)

    const rel3306 = root!.legal_relationships.find(r => r.target_id === 'ny/phl/3306')
    expect(rel3306).toBeDefined()
    expect(rel3306!.relationship_type).toBe('references')
    expect(rel3306!.source_method).toBe('parser')
    expect(rel3306!.confidence).toBe(1.0)
    expect(rel3306!.explanation).toBe('Referenced directly in text')
  })
})
