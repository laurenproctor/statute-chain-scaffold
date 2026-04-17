import { describe, it, expect } from 'vitest'
import { normalizeInput } from './normalizeInput.js'

describe('normalizeInput', () => {

  // ── Supported URLs ───────────────────────────────────────────────────────────

  describe('nysenate.gov PEN URLs', () => {
    it('converts PEN section to NY Penal Law citation', () => {
      const r = normalizeInput('https://www.nysenate.gov/legislation/laws/PEN/220.16')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
      expect(r.source_domain).toBe('nysenate.gov')
      expect(r.confidence).toBe(1.0)
    })

    it('strips trailing slash', () => {
      const r = normalizeInput('https://www.nysenate.gov/legislation/laws/PEN/220.16/')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
    })

    it('ignores query params', () => {
      const r = normalizeInput('https://www.nysenate.gov/legislation/laws/PEN/220.16?view=text')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
    })

    it('handles uppercase URL', () => {
      const r = normalizeInput('HTTPS://WWW.NYSENATE.GOV/LEGISLATION/LAWS/PEN/220.16')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
    })

    it('handles hyphenated section like 265-b', () => {
      const r = normalizeInput('https://www.nysenate.gov/legislation/laws/PEN/265-b')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('NY Penal Law 265-b')
    })

    it('marks unsupported NY code (PBH) as url_unknown', () => {
      const r = normalizeInput('https://www.nysenate.gov/legislation/laws/PBH/3306')
      expect(r.input_type).toBe('url_unknown')
      expect(r.source_domain).toBe('nysenate.gov')
    })
  })

  describe('uscode.house.gov URLs', () => {
    it('converts path-based USC URL', () => {
      const r = normalizeInput('https://uscode.house.gov/uscode/text/21/802')
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('21 U.S.C. § 802')
      expect(r.source_domain).toBe('uscode.house.gov')
      expect(r.confidence).toBe(1.0)
    })

    it('converts query-param USC URL', () => {
      const r = normalizeInput(
        'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title21-section802',
      )
      expect(r.input_type).toBe('url_supported')
      expect(r.normalized_text).toBe('21 U.S.C. § 802')
    })

    it('marks unrecognized uscode path as url_unknown', () => {
      const r = normalizeInput('https://uscode.house.gov/download/download.shtml')
      expect(r.input_type).toBe('url_unknown')
      expect(r.source_domain).toBe('uscode.house.gov')
    })
  })

  describe('unknown domains', () => {
    it('marks unknown domain as url_unknown', () => {
      const r = normalizeInput('https://example.com/statutes/123')
      expect(r.input_type).toBe('url_unknown')
      expect(r.source_domain).toBe('example.com')
    })

    it('marks law.cornell.edu as url_unknown (not yet supported)', () => {
      const r = normalizeInput('https://www.law.cornell.edu/uscode/text/21/802')
      expect(r.input_type).toBe('url_unknown')
    })
  })

  // ── Canonical IDs ────────────────────────────────────────────────────────────

  describe('canonical IDs', () => {
    it('identifies valid canonical ID', () => {
      const r = normalizeInput('federal/usc/26/501')
      expect(r.input_type).toBe('canonical_id')
      expect(r.normalized_text).toBe('federal/usc/26/501')
      expect(r.confidence).toBe(1.0)
    })

    it('normalizes uppercase canonical ID to lowercase', () => {
      const r = normalizeInput('Federal/USC/26/501')
      expect(r.input_type).toBe('canonical_id')
      expect(r.normalized_text).toBe('federal/usc/26/501')
    })

    it('normalizes mixed-case canonical ID', () => {
      const r = normalizeInput('NY/Penal/220.16')
      expect(r.input_type).toBe('canonical_id')
      expect(r.normalized_text).toBe('ny/penal/220.16')
    })

    it('rejects malformed canonical ID with double slash', () => {
      const r = normalizeInput('federal//501')
      expect(r.input_type).not.toBe('canonical_id')
    })

    it('rejects malformed canonical ID with empty section', () => {
      const r = normalizeInput('ny/penal/')
      expect(r.input_type).not.toBe('canonical_id')
    })

    it('rejects single-segment string', () => {
      const r = normalizeInput('federal')
      expect(r.input_type).not.toBe('canonical_id')
    })
  })

  // ── Citation text ────────────────────────────────────────────────────────────

  describe('citation text', () => {
    it('identifies structured federal citation', () => {
      const r = normalizeInput('26 U.S.C. § 501(c)(3)')
      expect(r.input_type).toBe('citation')
      expect(r.normalized_text).toBe('26 U.S.C. § 501(c)(3)')
    })

    it('identifies NY Penal Law citation', () => {
      const r = normalizeInput('NY Penal Law 220.16')
      expect(r.input_type).toBe('citation')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
    })

    it('does not set a confidence that overrides the parser', () => {
      const r = normalizeInput('26 U.S.C. § 501')
      expect(r.input_type).toBe('citation')
      expect(r.confidence).toBe(0.0)
    })

    it('trims whitespace and preserves citation text', () => {
      const r = normalizeInput('  NY Penal Law 220.16  ')
      expect(r.input_type).toBe('citation')
      expect(r.normalized_text).toBe('NY Penal Law 220.16')
      expect(r.raw_input).toBe('  NY Penal Law 220.16  ')
    })
  })

  // ── Unknown ──────────────────────────────────────────────────────────────────

  describe('unknown input', () => {
    it('marks garbage input as unknown', () => {
      const r = normalizeInput('garbage input')
      expect(r.input_type).toBe('unknown')
      expect(r.confidence).toBe(0.0)
    })

    it('marks empty string as unknown', () => {
      const r = normalizeInput('  ')
      expect(r.input_type).toBe('unknown')
    })
  })

  // ── raw_input preservation ───────────────────────────────────────────────────

  it('always preserves raw_input verbatim', () => {
    const raw = '  Federal/USC/26/501  '
    const r = normalizeInput(raw)
    expect(r.raw_input).toBe(raw)
  })
})
