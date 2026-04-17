import { describe, it, expect } from 'vitest'
import { parseCitation } from './index.js'

// ── Structured Federal ──────────────────────────────────────────────────────

describe('federal USC — structured', () => {
  it('parses 26 U.S.C. § 501(c)(3)', () => {
    const r = parseCitation('26 U.S.C. § 501(c)(3)')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('federal')
    expect(r.code).toBe('usc')
    expect(r.section).toBe('501')
    expect(r.subsection_path).toEqual(['c', '3'])
    expect(r.canonical_id).toBe('federal/usc/26/501')
    expect(r.confidence).toBeGreaterThanOrEqual(0.95)
  })

  it('parses 21 USC 802 (no punctuation, no §)', () => {
    const r = parseCitation('21 USC 802')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('federal')
    expect(r.code).toBe('usc')
    expect(r.section).toBe('802')
    expect(r.subsection_path).toEqual([])
    expect(r.canonical_id).toBe('federal/usc/21/802')
  })

  it('parses 18 U.S.C. § 922(g)(1)', () => {
    const r = parseCitation('18 U.S.C. § 922(g)(1)')
    expect(r.section).toBe('922')
    expect(r.subsection_path).toEqual(['g', '1'])
    expect(r.canonical_id).toBe('federal/usc/18/922')
  })

  it('parses 42 U.S.C. § 1983', () => {
    const r = parseCitation('42 U.S.C. § 1983')
    expect(r.jurisdiction).toBe('federal')
    expect(r.section).toBe('1983')
    expect(r.subsection_path).toEqual([])
    expect(r.canonical_id).toBe('federal/usc/42/1983')
  })

  it('parses 21 U.S.C. § 841(a)(1)', () => {
    const r = parseCitation('21 U.S.C. § 841(a)(1)')
    expect(r.section).toBe('841')
    expect(r.subsection_path).toEqual(['a', '1'])
    expect(r.canonical_id).toBe('federal/usc/21/841')
  })
})

// ── Structured NY ───────────────────────────────────────────────────────────

describe('NY — structured', () => {
  it('parses N.Y. Penal Law § 265.02', () => {
    const r = parseCitation('N.Y. Penal Law § 265.02')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('penal')
    expect(r.section).toBe('265.02')
    expect(r.subsection_path).toEqual([])
    expect(r.canonical_id).toBe('ny/penal/265.02')
    expect(r.confidence).toBeGreaterThanOrEqual(0.95)
  })

  it('parses Penal Law 220.16 (no N.Y. prefix, no §)', () => {
    const r = parseCitation('Penal Law 220.16')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('penal')
    expect(r.section).toBe('220.16')
    expect(r.canonical_id).toBe('ny/penal/220.16')
  })

  it('parses CPLR 3212', () => {
    const r = parseCitation('CPLR 3212')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('cplr')
    expect(r.section).toBe('3212')
    expect(r.canonical_id).toBe('ny/cplr/3212')
  })

  it('parses PHL 3306', () => {
    const r = parseCitation('PHL 3306')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('phl')
    expect(r.section).toBe('3306')
    expect(r.canonical_id).toBe('ny/phl/3306')
  })

  it('parses N.Y. Veh. & Traf. Law § 1192', () => {
    const r = parseCitation('N.Y. Veh. & Traf. Law § 1192')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('vtl')
    expect(r.section).toBe('1192')
    expect(r.canonical_id).toBe('ny/vtl/1192')
  })
})

// ── Informal ────────────────────────────────────────────────────────────────

describe('informal citations', () => {
  it('parses "Section 1983" as informal with unknown jurisdiction', () => {
    const r = parseCitation('Section 1983')
    expect(r.format).toBe('informal')
    expect(r.section).toBe('1983')
    expect(r.jurisdiction).toBe('unknown')
    expect(r.canonical_id).toBeUndefined()
    expect(r.confidence).toBeLessThan(0.8)
  })

  it('parses "§ 501(c)" as informal with unknown jurisdiction', () => {
    const r = parseCitation('§ 501(c)')
    expect(r.format).toBe('informal')
    expect(r.section).toBe('501')
    expect(r.subsection_path).toEqual(['c'])
    expect(r.jurisdiction).toBe('unknown')
    expect(r.canonical_id).toBeUndefined()
  })

  it('parses "Penal § 265" as informal NY', () => {
    const r = parseCitation('Penal § 265')
    expect(r.format).toBe('informal')
    expect(r.jurisdiction).toBe('ny')
    expect(r.code).toBe('penal')
    expect(r.section).toBe('265')
    expect(r.canonical_id).toBeUndefined()
  })

  it('parses "IRC 501(c)" as informal federal', () => {
    const r = parseCitation('IRC 501(c)')
    expect(r.format).toBe('informal')
    expect(r.jurisdiction).toBe('federal')
    expect(r.section).toBe('501')
    expect(r.subsection_path).toEqual(['c'])
    expect(r.canonical_id).toBeUndefined()
  })

  it('parses "42 USC § 1983" as structured (§ present, title present)', () => {
    const r = parseCitation('42 USC § 1983')
    expect(r.format).toBe('structured')
    expect(r.jurisdiction).toBe('federal')
    expect(r.canonical_id).toBe('federal/usc/42/1983')
  })
})

// ── Raw passthrough ─────────────────────────────────────────────────────────

describe('raw field', () => {
  it('always preserves raw input', () => {
    const input = '26 U.S.C. § 501(c)(3)'
    expect(parseCitation(input).raw).toBe(input)
  })
})
