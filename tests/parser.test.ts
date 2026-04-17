import { describe, it, expect } from 'vitest'
import { parseCitation } from '../packages/legal-core/src/parser/parseCitation.js'
import type { ParsedCitation, ParseError } from '../packages/types/src/index.js'

function isParsed(r: ParsedCitation | ParseError): r is ParsedCitation {
  return !('status' in r)
}

function isError(r: ParsedCitation | ParseError): r is ParseError {
  return 'status' in r && r.status === 'parse_failed'
}

describe('parseCitation', () => {
  it('42 U.S.C. § 1983 → structured federal', () => {
    const result = parseCitation('42 U.S.C. § 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBe(1.0)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc/42')
    expect(result.section).toBe('1983')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBe('federal/usc/42/1983')
    expect(result.raw).toBe('42 U.S.C. § 1983')
  })

  it('26 U.S.C. § 501(c)(3) → section 501, subsection_path [c, 3]', () => {
    const result = parseCitation('26 U.S.C. § 501(c)(3)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc/26')
    expect(result.section).toBe('501')
    expect(result.subsection_path).toEqual(['c', '3'])
    expect(result.canonical_id).toBe('federal/usc/26/501')
    expect(result.confidence).toBe(1.0)
  })

  it('N.Y. Penal Law § 265.02 → structured ny, code penal', () => {
    const result = parseCitation('N.Y. Penal Law § 265.02')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBe(1.0)
    expect(result.jurisdiction).toBe('ny')
    expect(result.code).toBe('penal')
    expect(result.section).toBe('265.02')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBe('ny/penal/265.02')
  })

  it('N.Y. Penal Law § 265.02(b) → subsection_path [b], canonical_id ny/penal/265.02', () => {
    const result = parseCitation('N.Y. Penal Law § 265.02(b)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.subsection_path).toEqual(['b'])
    expect(result.canonical_id).toBe('ny/penal/265.02')
  })

  it('N.Y. Tax Law § 1105 → code tax, section 1105', () => {
    const result = parseCitation('N.Y. Tax Law § 1105')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.jurisdiction).toBe('ny')
    expect(result.code).toBe('tax')
    expect(result.section).toBe('1105')
    expect(result.canonical_id).toBe('ny/tax/1105')
  })

  it('Penal § 265 → informal, confidence 0.6, canonical_id undefined', () => {
    const result = parseCitation('Penal § 265')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBe(0.6)
    expect(result.canonical_id).toBeUndefined()
    expect(result.code).toBe('penal')
    expect(result.section).toBe('265')
  })

  it('IRC 501(c) → informal federal, code usc/26, subsection_path [c]', () => {
    const result = parseCitation('IRC 501(c)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBe(0.6)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc/26')
    expect(result.section).toBe('501')
    expect(result.subsection_path).toEqual(['c'])
    expect(result.canonical_id).toBeUndefined()
  })

  it('Section 1983 → informal, section 1983, canonical_id undefined', () => {
    const result = parseCitation('Section 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBe(0.6)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('unknown')
    expect(result.section).toBe('1983')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBeUndefined()
  })

  it('not a citation at all → ParseError', () => {
    const result = parseCitation('not a citation at all')
    expect(isError(result)).toBe(true)
    if (!isError(result)) return
    expect(result.status).toBe('parse_failed')
    expect(result.raw).toBe('not a citation at all')
    expect(result.error).toContain('no pattern matched')
  })
})
