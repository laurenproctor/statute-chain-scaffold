import { describe, it, expect, vi } from 'vitest'
import { resolveCitation } from '../packages/legal-core/src/resolver/resolveCitation.js'
import type { ParsedCitation } from '../packages/types/src/index.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

type MockRow = Record<string, unknown>

// Each call to db.query() returns the next response in the array
function makeDb(responses: MockRow[][]): DbClient {
  let call = 0
  return {
    query: vi.fn().mockImplementation(() => {
      const rows = responses[call] ?? []
      call++
      return Promise.resolve(rows)
    }),
  }
}

const structured: ParsedCitation = {
  raw: 'N.Y. Penal Law § 265.02',
  format: 'structured',
  confidence: 1.0,
  jurisdiction: 'ny',
  code: 'penal',
  section: '265.02',
  subsection_path: [],
  canonical_id: 'ny/penal/265.02',
}

describe('resolveCitation — direct lookup', () => {
  it('returns ingested when provision found', async () => {
    const db = makeDb([
      [{ canonical_id: 'ny/penal/265.02', text_content: 'Criminal possession...', ingestion_status: 'ingested', confidence: '1.00', provenance_source: 'ny-open-legislation', ingested_at: '2026-01-01T00:00:00Z' }],
      [{ to_canonical_id: 'ny/penal/265.00', relationship_type: 'references', source_method: 'parser', confidence: null, explanation: 'Referenced directly in text' }],
    ])
    const result = await resolveCitation(structured, db)
    expect(result.status).toBe('ingested')
    expect(result.text).toBe('Criminal possession...')
    expect(result.legal_relationships.map(r => r.target_id)).toEqual(['ny/penal/265.00'])
    expect(result.confidence).toBe(1.0)
    expect(result.provenance.source).toBe('ny-open-legislation')
    expect(result.provenance.ingested_at).toBe('2026-01-01T00:00:00Z')
    expect((db.query as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('returns not_ingested when provision row missing', async () => {
    const db = makeDb([[], []])
    const result = await resolveCitation(structured, db)
    expect(result.status).toBe('not_ingested')
    expect(result.text).toBeUndefined()
    expect(result.legal_relationships).toEqual([])
  })

  it('includes legal_relationships even when not_ingested', async () => {
    const db = makeDb([
      [],
      [{ to_canonical_id: 'ny/penal/265.00', relationship_type: 'references', source_method: 'parser', confidence: null, explanation: 'Referenced directly in text' }],
    ])
    const result = await resolveCitation(structured, db)
    expect(result.status).toBe('not_ingested')
    expect(result.legal_relationships.map(r => r.target_id)).toEqual(['ny/penal/265.00'])
  })
})

describe('resolveCitation — alias resolution', () => {
  it('resolves via alias and sets resolved_from', async () => {
    const informal: ParsedCitation = {
      raw: 'IRC 501(c)',
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'usc/26',
      section: '501',
      subsection_path: ['c'],
      canonical_id: undefined,
    }
    const db = makeDb([
      [{ canonical_id: 'federal/usc/26/501' }],                         // alias lookup
      [{ canonical_id: 'federal/usc/26/501', text_content: 'Exempt orgs...', ingestion_status: 'ingested', confidence: '1.00', provenance_source: 'usc-xml', ingested_at: '2026-01-01T00:00:00Z' }],  // provision
      [],                                                                  // citations
    ])
    const result = await resolveCitation(informal, db)
    expect(result.status).toBe('alias_resolved')
    expect(result.resolved_from).toBe('IRC 501(c)')
    expect(result.text).toBe('Exempt orgs...')
    expect(result.canonical_id).toBe('federal/usc/26/501')
  })
})

describe('resolveCitation — ambiguous', () => {
  it('returns ambiguous with candidates when found in ambiguous_citations', async () => {
    const ambig: ParsedCitation = {
      raw: 'Section 265',
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'unknown',
      code: 'unknown',
      section: '265',
      subsection_path: [],
      canonical_id: undefined,
    }
    const db = makeDb([
      [],                                                                  // alias lookup — miss
      [{ candidate_ids: ['ny/penal/265.00', 'ny/penal/265.02'] }],       // ambiguous hit
    ])
    const result = await resolveCitation(ambig, db)
    expect(result.status).toBe('ambiguous')
    expect(result.candidates).toEqual(['ny/penal/265.00', 'ny/penal/265.02'])
    expect(result.confidence).toBeLessThan(0.6)
  })
})

describe('resolveCitation — not_ingested fallback', () => {
  it('returns not_ingested when no alias, no ambiguous match', async () => {
    const informal: ParsedCitation = {
      raw: 'Penal § 999',
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'unknown',
      code: 'penal',
      section: '999',
      subsection_path: [],
      canonical_id: undefined,
    }
    const db = makeDb([[], []])   // alias miss, ambiguous miss
    const result = await resolveCitation(informal, db)
    expect(result.status).toBe('not_ingested')
    expect(result.legal_relationships).toEqual([])
  })
})
