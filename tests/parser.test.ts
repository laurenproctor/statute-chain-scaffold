import { describe, it, expect } from 'vitest'
import { parseCitation } from '@statute-chain/parser'
import type { ParsedCitation } from '@statute-chain/types'

function isParsed(r: unknown): r is ParsedCitation {
  return typeof r === 'object' && r !== null && !('status' in r)
}

describe('parseCitation', () => {
  it('42 U.S.C. § 1983 → structured federal', () => {
    const result = parseCitation('42 U.S.C. § 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc')
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
    expect(result.code).toBe('usc')
    expect(result.section).toBe('501')
    expect(result.subsection_path).toEqual(['c', '3'])
    expect(result.canonical_id).toBe('federal/usc/26/501')
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
  })

  it('N.Y. Penal Law § 265.02 → structured ny, code penal', () => {
    const result = parseCitation('N.Y. Penal Law § 265.02')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
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

  it('Penal § 265 → informal, confidence < 0.8, canonical_id undefined', () => {
    const result = parseCitation('Penal § 265')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBeLessThan(0.8)
    expect(result.canonical_id).toBeUndefined()
    expect(result.code).toBe('penal')
    expect(result.section).toBe('265')
  })

  it('IRC 501(c) → informal federal, code usc, subsection_path [c]', () => {
    const result = parseCitation('IRC 501(c)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBeLessThan(0.8)
    expect(result.jurisdiction).toBe('federal')
    expect(result.section).toBe('501')
    expect(result.subsection_path).toEqual(['c'])
    expect(result.canonical_id).toBeUndefined()
  })

  it('Section 1983 → informal, section 1983, canonical_id undefined', () => {
    const result = parseCitation('Section 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBeLessThan(0.8)
    expect(result.jurisdiction).toBe('unknown')
    expect(result.section).toBe('1983')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBeUndefined()
  })

  it('42 U.S.C. §1983 (no space after §) → same as with space', () => {
    const result = parseCitation('42 U.S.C. §1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.jurisdiction).toBe('federal')
    expect(result.section).toBe('1983')
    expect(result.canonical_id).toBe('federal/usc/42/1983')
  })

  it('N.Y. General Business Law § 349 → structured ny, code gbl', () => {
    const result = parseCitation('N.Y. General Business Law § 349')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.jurisdiction).toBe('ny')
    expect(result.code).toBe('gbl')
    expect(result.section).toBe('349')
    expect(result.canonical_id).toBe('ny/gbl/349')
  })

  it('section 1983 (lowercase) → informal, section 1983, canonical_id undefined', () => {
    const result = parseCitation('section 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.section).toBe('1983')
    expect(result.canonical_id).toBeUndefined()
  })

  it('Section 265 → informal, jurisdiction unknown', () => {
    const result = parseCitation('Section 265')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.jurisdiction).toBe('unknown')
    expect(result.section).toBe('265')
  })

  it('42 U.S.C. § 265.02 → structured, section 265.02, canonical_id federal/usc/42/265.02', () => {
    const result = parseCitation('42 U.S.C. § 265.02')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.section).toBe('265.02')
    expect(result.canonical_id).toBe('federal/usc/42/265.02')
  })

  it('21 U.S.C. § 802 → structured federal', () => {
    const result = parseCitation('21 U.S.C. § 802')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc')
    expect(result.section).toBe('802')
    expect(result.canonical_id).toBe('federal/usc/21/802')
  })

  it('21 USC 802 → structured federal (no dots, no §)', () => {
    const result = parseCitation('21 USC 802')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBeGreaterThanOrEqual(0.95)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc')
    expect(result.section).toBe('802')
    expect(result.canonical_id).toBe('federal/usc/21/802')
  })

  it('21 USC §802 → structured federal (no dots, with §)', () => {
    const result = parseCitation('21 USC §802')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.jurisdiction).toBe('federal')
    expect(result.section).toBe('802')
    expect(result.canonical_id).toBe('federal/usc/21/802')
  })

  it('26 USC 5845(a) → structured federal with subsection', () => {
    const result = parseCitation('26 USC 5845(a)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.section).toBe('5845')
    expect(result.subsection_path).toEqual(['a'])
    expect(result.canonical_id).toBe('federal/usc/26/5845')
  })

  it('18 U.S.C. 922(g)(1) → structured federal, no § symbol', () => {
    const result = parseCitation('18 U.S.C. 922(g)(1)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc')
    expect(result.section).toBe('922')
    expect(result.subsection_path).toEqual(['g', '1'])
    expect(result.canonical_id).toBe('federal/usc/18/922')
  })

  it('21 U.S.C. §802 (no space after §) → structured federal', () => {
    const result = parseCitation('21 U.S.C. §802')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.section).toBe('802')
    expect(result.canonical_id).toBe('federal/usc/21/802')
  })

  it('not a citation at all → informal unknown with low confidence', () => {
    const result = parseCitation('not a citation at all')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBeLessThan(0.5)
    expect(result.jurisdiction).toBe('unknown')
    expect(result.canonical_id).toBeUndefined()
  })
})
