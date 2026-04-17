import { describe, it, expect } from 'vitest'
import { resolveCitation, type DbClient } from './resolveCitation.js'
import type { ParsedCitation } from '@statute-chain/types'

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeDb(tables: {
  provisions?: Record<string, unknown>[]
  legal_references?: Record<string, unknown>[]
  aliases?: Record<string, unknown>[]
  ambiguous_citations?: Record<string, unknown>[]
}): DbClient {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const p = params?.[0] as string | undefined
      if (sql.includes('FROM provisions')) {
        // LIKE query for article children (e.g. "ny/penal/220.%")
        if (sql.includes('LIKE')) {
          const prefix = (p ?? '').replace(/%$/, '')
          const rows = (tables.provisions ?? []).filter(
            (r) => (r['canonical_id'] as string).startsWith(prefix),
          )
          return rows as T[]
        }
        const rows = (tables.provisions ?? []).filter(
          (r) => r['canonical_id'] === p,
        )
        return rows as T[]
      }
      if (sql.includes('FROM legal_references')) {
        const rows = (tables.legal_references ?? []).filter(
          (r) => r['from_canonical_id'] === p,
        )
        return rows as T[]
      }
      if (sql.includes('FROM aliases')) {
        const rows = (tables.aliases ?? []).filter((r) => r['alias'] === p)
        return rows as T[]
      }
      if (sql.includes('FROM ambiguous_citations')) {
        const rows = (tables.ambiguous_citations ?? []).filter(
          (r) => r['raw'] === p,
        )
        return rows as T[]
      }
      return []
    },
  }
}

const structuredCitation: ParsedCitation = {
  raw: '26 U.S.C. § 501(c)(3)',
  format: 'structured',
  confidence: 0.97,
  jurisdiction: 'federal',
  code: 'usc',
  section: '501',
  subsection_path: ['c', '3'],
  canonical_id: 'federal/usc/26/501',
}

const informalCitation: ParsedCitation = {
  raw: 'Section 1983',
  format: 'informal',
  confidence: 0.35,
  jurisdiction: 'unknown',
  code: '',
  section: '1983',
  subsection_path: [],
}

// ── Direct lookup — found ─────────────────────────────────────────────────────

describe('direct lookup — provision found', () => {
  it('returns ingested status with text and legal relationships', async () => {
    const db = makeDb({
      provisions: [{
        canonical_id: 'federal/usc/26/501',
        text_content: 'Exemption from tax...',
        ingestion_status: 'ingested',
        confidence: '1.00',
        provenance_source: 'govinfo',
        ingested_at: '2026-01-01T00:00:00Z',
      }],
      legal_references: [
        { from_canonical_id: 'federal/usc/26/501', to_canonical_id: 'federal/usc/26/502', relationship_type: 'references', source_method: 'parser', confidence: null, explanation: 'Referenced directly in text' },
        { from_canonical_id: 'federal/usc/26/501', to_canonical_id: 'federal/usc/26/170', relationship_type: 'references', source_method: 'parser', confidence: null, explanation: 'Referenced directly in text' },
      ],
    })

    const result = await resolveCitation(structuredCitation, db)

    expect(result.status).toBe('ingested')
    expect(result.canonical_id).toBe('federal/usc/26/501')
    expect(result.text).toBe('Exemption from tax...')
    expect(result.legal_relationships.map(r => r.target_id)).toEqual(['federal/usc/26/502', 'federal/usc/26/170'])
    expect(result.provenance.source).toBe('govinfo')
    expect(result.provenance.ingested_at).toBe('2026-01-01T00:00:00Z')
  })

  it('multiplies parse confidence by db confidence', async () => {
    const db = makeDb({
      provisions: [{
        canonical_id: 'federal/usc/26/501',
        text_content: 'text',
        ingestion_status: 'ingested',
        confidence: '0.80',
        provenance_source: null,
        ingested_at: null,
      }],
      legal_references: [],
    })

    const result = await resolveCitation(structuredCitation, db)

    expect(result.confidence).toBeCloseTo(0.97 * 0.80)
  })

  it('falls back to 1.0 db confidence when value is missing', async () => {
    const db = makeDb({
      provisions: [{
        canonical_id: 'federal/usc/26/501',
        text_content: 'text',
        ingestion_status: 'ingested',
        confidence: 'NaN',
        provenance_source: null,
        ingested_at: null,
      }],
      legal_references: [],
    })

    const result = await resolveCitation(structuredCitation, db)

    expect(result.confidence).toBeCloseTo(0.97)
  })
})

// ── Direct lookup — not ingested ──────────────────────────────────────────────

describe('direct lookup — provision not in DB', () => {
  it('returns not_ingested with legal_relationships populated', async () => {
    const db = makeDb({
      provisions: [],
      legal_references: [
        { from_canonical_id: 'federal/usc/26/501', to_canonical_id: 'federal/usc/26/502', relationship_type: 'references', source_method: 'parser', confidence: null, explanation: 'Referenced directly in text' },
      ],
    })

    const result = await resolveCitation(structuredCitation, db)

    expect(result.status).toBe('not_ingested')
    expect(result.text).toBeUndefined()
    expect(result.legal_relationships.map(r => r.target_id)).toEqual(['federal/usc/26/502'])
    expect(result.provenance.source).toBe('unknown')
  })

  it('returns empty legal_relationships when none recorded', async () => {
    const db = makeDb({ provisions: [], legal_references: [] })

    const result = await resolveCitation(structuredCitation, db)

    expect(result.legal_relationships).toEqual([])
  })
})

// ── Alias resolution ──────────────────────────────────────────────────────────

describe('alias resolution', () => {
  it('resolves alias and returns alias_resolved status', async () => {
    const aliasedCitation: ParsedCitation = {
      ...informalCitation,
      raw: 'Civil Rights Act § 1983',
    }
    const db = makeDb({
      aliases: [{ alias: 'Civil Rights Act § 1983', canonical_id: 'federal/usc/42/1983' }],
      provisions: [{
        canonical_id: 'federal/usc/42/1983',
        text_content: 'Every person who...',
        ingestion_status: 'ingested',
        confidence: '1.00',
        provenance_source: 'govinfo',
        ingested_at: null,
      }],
      legal_references: [],
    })

    const result = await resolveCitation(aliasedCitation, db)

    expect(result.status).toBe('alias_resolved')
    expect(result.canonical_id).toBe('federal/usc/42/1983')
    expect(result.resolved_from).toBe('Civil Rights Act § 1983')
  })
})

// ── Ambiguous ─────────────────────────────────────────────────────────────────

describe('ambiguous citations', () => {
  it('returns ambiguous status with candidate list', async () => {
    const db = makeDb({
      ambiguous_citations: [{
        raw: 'Section 1983',
        candidate_ids: ['federal/usc/42/1983', 'federal/usc/18/1983'],
      }],
    })

    const result = await resolveCitation(informalCitation, db)

    expect(result.status).toBe('ambiguous')
    expect(result.candidates).toEqual(['federal/usc/42/1983', 'federal/usc/18/1983'])
    expect(result.confidence).toBeCloseTo(0.35 * 0.5)
    expect(result.legal_relationships).toEqual([])
  })
})

// ── Article-level lookup ──────────────────────────────────────────────────────

const articleCitation: ParsedCitation = {
  raw: 'NY Penal Law 220',
  format: 'structured',
  confidence: 0.85,
  jurisdiction: 'ny',
  code: 'penal',
  section: '220',
  subsection_path: [],
  canonical_id: 'ny/penal/220',
}

describe('article-level lookup — no exact row but children exist', () => {
  const db = makeDb({
    provisions: [
      { canonical_id: 'ny/penal/220.00', text_content: 'Definitions…', ingestion_status: 'ingested', confidence: '1.00', provenance_source: null, ingested_at: null },
      { canonical_id: 'ny/penal/220.16', text_content: 'Criminal possession…', ingestion_status: 'ingested', confidence: '1.00', provenance_source: null, ingested_at: null },
    ],
    legal_references: [],
  })

  it('returns article_partial status', async () => {
    const result = await resolveCitation(articleCitation, db)
    expect(result.status).toBe('article_partial')
  })

  it('populates article_sections with child canonical_ids', async () => {
    const result = await resolveCitation(articleCitation, db)
    expect(result.article_sections).toEqual(['ny/penal/220.00', 'ny/penal/220.16'])
  })

  it('includes a human-readable label', async () => {
    const result = await resolveCitation(articleCitation, db)
    expect(result.label).toBe('NY Penal Law Article 220')
  })

  it('falls back to not_ingested when no children exist', async () => {
    const emptyDb = makeDb({ provisions: [], legal_references: [] })
    const result = await resolveCitation(articleCitation, emptyDb)
    expect(result.status).toBe('not_ingested')
    expect(result.article_sections).toBeUndefined()
  })
})

// ── Fallback ──────────────────────────────────────────────────────────────────

describe('fallback — no match anywhere', () => {
  it('returns not_ingested with parse confidence when nothing matches', async () => {
    const db = makeDb({})

    const result = await resolveCitation(informalCitation, db)

    expect(result.status).toBe('not_ingested')
    expect(result.confidence).toBe(0.35)
    expect(result.legal_relationships).toEqual([])
  })
})
