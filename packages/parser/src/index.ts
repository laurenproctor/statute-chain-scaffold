import type { ParsedCitation, Jurisdiction, CitationFormat } from '@statute-chain/types'

// ── NY code abbreviation map ─────────────────────────────────────────────────

const NY_ABBREV: Record<string, string> = {
  'penal law': 'penal',
  'penal': 'penal',
  'pl': 'penal',
  'cplr': 'cplr',
  'phl': 'phl',
  'public health law': 'phl',
  'veh. & traf. law': 'vtl',
  'vehicle and traffic law': 'vtl',
  'vtl': 'vtl',
  'tax law': 'tax',
  'education law': 'ed',
  'el': 'ed',
  'general business law': 'gbl',
  'gbl': 'gbl',
  'correction law': 'corr',
  'executive law': 'exec',
}

// ── Informal alias map ───────────────────────────────────────────────────────

const INFORMAL_FEDERAL: Record<string, true> = {
  'irc': true,
  'internal revenue code': true,
}

const INFORMAL_NY_CODE: Record<string, string> = {
  'penal': 'penal',
}

// ── Subsection extractor ─────────────────────────────────────────────────────

function extractSubsections(raw: string): string[] {
  const path: string[] = []
  const re = /\(([a-z0-9]+)\)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    path.push(m[1]!.toLowerCase())
  }
  return path
}

// ── Canonical ID builders ────────────────────────────────────────────────────

function federalCanonicalId(title: string, section: string): string {
  return `federal/usc/${title}/${section}`
}

function nyCanonicalId(code: string, section: string): string {
  return `ny/${code}/${section}`
}

// ── Pattern: structured federal USC ─────────────────────────────────────────
// Matches: 26 U.S.C. § 501(c)(3) | 21 USC 802 | 42 USC § 1983
// Requires: numeric title + USC variant + section number
// § is optional when title is present; without § and without title → not structured

const FEDERAL_USC_RE =
  /^(\d+)\s+U\.?S\.?C\.?\s*(?:§\s*)?(\d+(?:\.\d+)*)(.*)$/i

// ── Pattern: structured NY ───────────────────────────────────────────────────
// Matches: N.Y. Penal Law § 265.02 | Penal Law 220.16 | CPLR 3212 | PHL 3306
// N.Y. prefix is optional; code name required; § optional

const NY_LONG_RE =
  /^(?:N\.?Y\.?\s+)?([\w.& ]+?(?:law))\s*(?:§\s*)?(\d+(?:\.\d+)*)(.*)$/i

const NY_ABBREV_RE =
  /^(CPLR|PHL|VTL|PL|GBL|EL)\s+(?:§\s*)?(\d+(?:\.\d+)*)(.*)$/i

// ── Pattern: informal — bare § with number ───────────────────────────────────
const BARE_SECTION_RE = /^§\s*(\d+(?:\.\d+)*)(.*)$/i

// ── Pattern: informal — "Section NNNN" ───────────────────────────────────────
const SECTION_WORD_RE = /^(?:section|sec\.?)\s+(\d+(?:\.\d+)*)(.*)$/i

// ── Pattern: informal — "Penal § NNN" ────────────────────────────────────────
const INFORMAL_NY_RE = /^(penal|cplr|phl|vtl)\s+§\s*(\d[\w.]*)(.*)$/i

// ── Pattern: informal — "IRC NNN" ────────────────────────────────────────────
const INFORMAL_FEDERAL_RE = /^(irc)\s+(\d[\w.]*)(.*)$/i

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseCitation(input: string): ParsedCitation {
  const trimmed = input.trim()

  // 1. Structured federal USC
  const fedMatch = FEDERAL_USC_RE.exec(trimmed)
  if (fedMatch) {
    const title = fedMatch[1]!
    const section = fedMatch[2]!
    const rest = fedMatch[3] ?? ''
    const subsection_path = extractSubsections(rest)
    return {
      raw: input,
      format: 'structured' as CitationFormat,
      confidence: 0.97,
      jurisdiction: 'federal' as Jurisdiction,
      code: 'usc',
      section,
      subsection_path,
      canonical_id: federalCanonicalId(title, section),
    }
  }

  // 2. Structured NY — abbreviations (CPLR, PHL, VTL, PL …)
  const nyAbbrevMatch = NY_ABBREV_RE.exec(trimmed)
  if (nyAbbrevMatch) {
    const abbrev = nyAbbrevMatch[1]!.toLowerCase()
    const section = nyAbbrevMatch[2]!
    const rest = nyAbbrevMatch[3] ?? ''
    const code = NY_ABBREV[abbrev] ?? abbrev
    return {
      raw: input,
      format: 'structured' as CitationFormat,
      confidence: 0.96,
      jurisdiction: 'ny' as Jurisdiction,
      code,
      section,
      subsection_path: extractSubsections(rest),
      canonical_id: nyCanonicalId(code, section),
    }
  }

  // 3. Structured NY — long form (Penal Law, Veh. & Traf. Law …)
  const nyLongMatch = NY_LONG_RE.exec(trimmed)
  if (nyLongMatch) {
    const codeName = nyLongMatch[1]!.trim().toLowerCase()
    const section = nyLongMatch[2]!
    const rest = nyLongMatch[3] ?? ''
    const code = NY_ABBREV[codeName] ?? codeName.replace(/\s+/g, '-')
    return {
      raw: input,
      format: 'structured' as CitationFormat,
      confidence: 0.96,
      jurisdiction: 'ny' as Jurisdiction,
      code,
      section,
      subsection_path: extractSubsections(rest),
      canonical_id: nyCanonicalId(code, section),
    }
  }

  // 4. Informal — "Penal § 265"
  const infNyMatch = INFORMAL_NY_RE.exec(trimmed)
  if (infNyMatch) {
    const codeName = infNyMatch[1]!.toLowerCase()
    const section = infNyMatch[2]!
    const rest = infNyMatch[3] ?? ''
    const code = INFORMAL_NY_CODE[codeName] ?? codeName
    return {
      raw: input,
      format: 'informal' as CitationFormat,
      confidence: 0.6,
      jurisdiction: 'ny' as Jurisdiction,
      code,
      section,
      subsection_path: extractSubsections(rest),
    }
  }

  // 5. Informal — "IRC 501(c)"
  const infFedMatch = INFORMAL_FEDERAL_RE.exec(trimmed)
  if (infFedMatch) {
    const section = infFedMatch[2]!
    const rest = infFedMatch[3] ?? ''
    return {
      raw: input,
      format: 'informal' as CitationFormat,
      confidence: 0.65,
      jurisdiction: 'federal' as Jurisdiction,
      code: 'irc',
      section,
      subsection_path: extractSubsections(rest),
    }
  }

  // 6. Informal — "§ 501(c)"
  const bareSectionMatch = BARE_SECTION_RE.exec(trimmed)
  if (bareSectionMatch) {
    const section = bareSectionMatch[1]!
    const rest = bareSectionMatch[2] ?? ''
    return {
      raw: input,
      format: 'informal' as CitationFormat,
      confidence: 0.4,
      jurisdiction: 'unknown',
      code: '',
      section,
      subsection_path: extractSubsections(rest),
    }
  }

  // 7. Informal — "Section 1983"
  const sectionWordMatch = SECTION_WORD_RE.exec(trimmed)
  if (sectionWordMatch) {
    const section = sectionWordMatch[1]!
    const rest = sectionWordMatch[2] ?? ''
    return {
      raw: input,
      format: 'informal' as CitationFormat,
      confidence: 0.35,
      jurisdiction: 'unknown',
      code: '',
      section,
      subsection_path: extractSubsections(rest),
    }
  }

  // Fallback — unrecognized
  return {
    raw: input,
    format: 'informal' as CitationFormat,
    confidence: 0.1,
    jurisdiction: 'unknown',
    code: '',
    section: '',
    subsection_path: [],
  }
}

export { extractCitationsFromText } from './extractCitations.js'
export { normalizeInput } from './normalizeInput.js'
export type { NormalizedInput } from './normalizeInput.js'
