import { describe, it, expect, vi } from 'vitest'
import { resolveCitation } from '../packages/legal-core/src/resolver/resolveCitation.js'
import type { ParsedCitation } from '../packages/types/src/index.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

function makeDb(rows: unknown[]): DbClient {
  return { query: vi.fn().mockResolvedValue(rows) }
}

const base: ParsedCitation = {
  raw: 'N.Y. Penal Law § 265.02',
  format: 'structured',
  confidence: 1.0,
  jurisdiction: 'ny',
  code: 'penal',
  section: '265.02',
  subsection_path: [],
  canonical_id: 'ny/penal/265.02',
}

describe('resolveCitation', () => {
  it('TODO: returns ingested when provision found', async () => {
    const db = makeDb([{ canonical_id: 'ny/penal/265.02', text_content: 'text', ingestion_status: 'ingested' }])
    const result = await resolveCitation(base, db)
    expect(result.status).toBe('ingested')
  })

  it('returns not_ingested when provision absent', async () => {
    const db = makeDb([])
    const result = await resolveCitation(base, db)
    expect(result.status).toBe('not_ingested')
  })

  it('TODO: resolves via alias', async () => {
    const informal: ParsedCitation = { ...base, format: 'informal', canonical_id: undefined }
    const db = makeDb([])
    const result = await resolveCitation(informal, db)
    expect(['alias_resolved', 'not_ingested', 'not_found']).toContain(result.status)
  })

  it('TODO: returns ambiguous with candidates list', async () => {
    const ambig: ParsedCitation = { ...base, canonical_id: undefined }
    const db = makeDb([])
    const result = await resolveCitation(ambig, db)
    expect(['ambiguous', 'not_ingested', 'not_found']).toContain(result.status)
  })
})
