import { describe, it, expect } from 'vitest'
import { parseCitation } from '../packages/legal-core/src/parser/parseCitation.js'

describe('parseCitation', () => {
  it('TODO: structured federal USC citation', () => {
    // "42 U.S.C. § 1983" → { format: 'structured', confidence: 1.0, jurisdiction: 'federal' }
    expect(parseCitation('42 U.S.C. § 1983')).toBeDefined()
  })

  it('TODO: structured NY statute citation', () => {
    // "N.Y. Penal Law § 265.02"
    expect(parseCitation('N.Y. Penal Law § 265.02')).toBeDefined()
  })

  it('TODO: informal citation flagged with lower confidence', () => {
    // "Penal § 265" → { format: 'informal', confidence < 1.0 }
    expect(parseCitation('Penal § 265')).toBeDefined()
  })

  it('TODO: subsection path parsed correctly', () => {
    // "26 U.S.C. § 501(c)(3)" → subsection_path: ['c', '3']
    expect(parseCitation('26 U.S.C. § 501(c)(3)')).toBeDefined()
  })

  it('returns ParseError for unrecognizable input', () => {
    const result = parseCitation('not a citation')
    expect(result).toMatchObject({ status: 'parse_failed' })
  })

  it('TODO: ambiguous informal citation has no canonical_id', () => {
    expect(parseCitation('Section 1983')).toBeDefined()
  })
})
