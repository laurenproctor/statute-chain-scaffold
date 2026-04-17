export type NormalizedInput = {
  raw_input: string
  input_type: 'citation' | 'url_supported' | 'url_unknown' | 'canonical_id' | 'unknown'
  normalized_text: string
  source_domain?: string
  confidence: number
}

// jurisdiction/code/section — dots and hyphens allowed in section segment
const CANONICAL_RE = /^[a-z]+\/[a-z0-9]+\/[a-z0-9][a-z0-9./-]*$/

const NYSENATE_PEN_RE = /^\/legislation\/laws\/pen\/([a-z0-9][a-z0-9.-]*)$/i
const USCODE_PATH_RE = /^\/uscode\/text\/(\d+)\/([a-z0-9][a-z0-9.-]*)$/i
const USCODE_QUERY_RE = /usc-prelim-title(\d+)-section([a-z0-9]+)/i

export function normalizeInput(rawInput: string): NormalizedInput {
  const trimmed = rawInput.trim()

  // ── URL ──────────────────────────────────────────────────────────────────────
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL
    try {
      url = new URL(trimmed)
    } catch {
      return { raw_input: rawInput, input_type: 'url_unknown', normalized_text: trimmed, confidence: 0.0 }
    }

    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = url.pathname.replace(/\/+$/, '')

    if (domain === 'nysenate.gov') {
      const m = NYSENATE_PEN_RE.exec(pathname)
      if (m) {
        return {
          raw_input: rawInput,
          input_type: 'url_supported',
          normalized_text: `NY Penal Law ${m[1]!}`,
          source_domain: domain,
          confidence: 1.0,
        }
      }
      return { raw_input: rawInput, input_type: 'url_unknown', normalized_text: trimmed, source_domain: domain, confidence: 0.0 }
    }

    if (domain === 'uscode.house.gov') {
      const pathM = USCODE_PATH_RE.exec(pathname)
      if (pathM) {
        return {
          raw_input: rawInput,
          input_type: 'url_supported',
          normalized_text: `${pathM[1]!} U.S.C. § ${pathM[2]!}`,
          source_domain: domain,
          confidence: 1.0,
        }
      }
      const queryM = USCODE_QUERY_RE.exec(url.search)
      if (queryM) {
        return {
          raw_input: rawInput,
          input_type: 'url_supported',
          normalized_text: `${queryM[1]!} U.S.C. § ${queryM[2]!}`,
          source_domain: domain,
          confidence: 1.0,
        }
      }
      return { raw_input: rawInput, input_type: 'url_unknown', normalized_text: trimmed, source_domain: domain, confidence: 0.0 }
    }

    return { raw_input: rawInput, input_type: 'url_unknown', normalized_text: trimmed, source_domain: domain, confidence: 0.0 }
  }

  // ── Canonical ID (case-insensitive: normalize to lowercase) ──────────────────
  const lowered = trimmed.toLowerCase()
  if (CANONICAL_RE.test(lowered)) {
    return { raw_input: rawInput, input_type: 'canonical_id', normalized_text: lowered, confidence: 1.0 }
  }

  // ── Citation heuristic — parser owns final confidence ────────────────────────
  if (
    /[§]/.test(trimmed) ||
    /\bu\.?s\.?c\.?\b/i.test(trimmed) ||
    /\b(cplr|penal|phl|vtl|gbl|irc)\b/i.test(trimmed) ||
    /\bpublic\s+health\s+law\b/i.test(trimmed) ||
    /\bsection\s+\d/i.test(trimmed)
  ) {
    return { raw_input: rawInput, input_type: 'citation', normalized_text: trimmed, confidence: 0.0 }
  }

  return { raw_input: rawInput, input_type: 'unknown', normalized_text: trimmed, confidence: 0.0 }
}
