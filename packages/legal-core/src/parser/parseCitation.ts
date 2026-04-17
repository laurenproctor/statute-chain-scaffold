import type { ParsedCitation, ParseError } from '@statute-chain/types'

export type ParseResult = ParsedCitation | ParseError

function parseSubsections(tail: string): string[] {
  const path: string[] = []
  const re = /\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tail)) !== null) {
    path.push(m[1])
  }
  return path
}

export function parseCitation(input: string): ParseResult {
  const raw = input

  // Structured: Federal USC — "42 U.S.C. § 1983" or "26 U.S.C. § 501(c)(3)"
  const uscMatch = raw.match(/^(\d+)\s+U\.S\.C\.\s+§\s*(\d+(?:\.\d+)*)((?:\([^)]+\))*)$/)
  if (uscMatch) {
    const title = uscMatch[1]
    const section = uscMatch[2]
    const subsection_path = parseSubsections(uscMatch[3])
    return {
      raw,
      format: 'structured',
      confidence: 1.0,
      jurisdiction: 'federal',
      code: `usc/${title}`,
      section,
      subsection_path,
      canonical_id: `federal/usc/${title}/${section}`,
    }
  }

  // Structured: NY statute — "N.Y. Penal Law § 265.02(b)"
  const nyMatch = raw.match(/^N\.Y\.\s+(.+?)\s+Law\s+§\s*(\d+(?:\.\d+)*)((?:\([^)]+\))*)$/)
  if (nyMatch) {
    const lawName = nyMatch[1].toLowerCase().replace(/\s+/g, '-')
    const section = nyMatch[2]
    const subsection_path = parseSubsections(nyMatch[3])
    return {
      raw,
      format: 'structured',
      confidence: 1.0,
      jurisdiction: 'ny',
      code: lawName,
      section,
      subsection_path,
      canonical_id: `ny/${lawName}/${section}`,
    }
  }

  // Informal: IRC — "IRC 501(c)"
  const ircMatch = raw.match(/^IRC\s+([\d.]+)((?:\([^)]+\))*)$/)
  if (ircMatch) {
    const section = ircMatch[1]
    const subsection_path = parseSubsections(ircMatch[2])
    return {
      raw,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'usc/26',
      section,
      subsection_path,
      canonical_id: undefined,
    }
  }

  // Informal: "Section 1983"
  const sectionMatch = raw.match(/^Section\s+([\d.]+)((?:\([^)]+\))*)$/i)
  if (sectionMatch) {
    const section = sectionMatch[1]
    const subsection_path = parseSubsections(sectionMatch[2])
    return {
      raw,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'unknown',
      code: 'unknown',
      section,
      subsection_path,
      canonical_id: undefined,
    }
  }

  // Informal: "Penal § 265"
  const codeSecMatch = raw.match(/^([A-Za-z][A-Za-z ]*?)\s+§\s*(\d+(?:\.\d+)*)((?:\([^)]+\))*)$/)
  if (codeSecMatch) {
    const code = codeSecMatch[1].trim().toLowerCase().replace(/\s+/g, '-')
    const section = codeSecMatch[2]
    const subsection_path = parseSubsections(codeSecMatch[3])
    return {
      raw,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'unknown',
      code,
      section,
      subsection_path,
      canonical_id: undefined,
    }
  }

  return {
    raw,
    error: `no pattern matched: "${raw}"`,
    status: 'parse_failed',
  }
}
