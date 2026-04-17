import { parseCitation } from './index.js'

// Global patterns that find citation spans inside free text.
// Order matters: more specific patterns first to avoid partial overlaps.
const SCAN_PATTERNS: RegExp[] = [
  // Federal USC: "26 U.S.C. § 501(c)(3)", "21 USC 802", "18 U.S.C. § 922(g)(1)"
  /\d+\s+U\.?S\.?C\.?\s*§?\s*\d+(?:\.\d+)*(?:\([a-z0-9]+\))*/gi,

  // NY long form: "N.Y. Penal Law § 265.02", "Penal Law 220.16", "Public Health Law § 3306"
  /(?:N\.Y\.\s+)?(?:Penal|Public Health|Vehicle and Traffic|Tax|Education|General Business|Correction|Executive)\s+Law\s*§?\s*\d+(?:\.\d+)*/gi,

  // NY abbreviations: "PHL § 3306", "CPLR 3212", "VTL § 1192"
  /(?:CPLR|PHL|VTL|PL|GBL|EL)\s+(?:§\s*)?\d+(?:\.\d+)*/gi,
]

/**
 * Scans free text for citation patterns and returns a deduplicated list of
 * canonical IDs for all structured citations found.
 */
export function extractCitationsFromText(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const pattern of SCAN_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const span = match[0]!.trim()
      const parsed = parseCitation(span)
      if (parsed.format === 'structured' && parsed.canonical_id) {
        if (!seen.has(parsed.canonical_id)) {
          seen.add(parsed.canonical_id)
          result.push(parsed.canonical_id)
        }
      }
    }
  }

  return result
}
