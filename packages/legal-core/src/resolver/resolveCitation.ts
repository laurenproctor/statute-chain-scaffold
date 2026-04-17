import type { ParsedCitation, ResolvedProvision, LegalRelationship, LegalRelationshipType, LegalRelationshipSourceMethod } from '@statute-chain/types'

export interface DbClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
}

type ProvisionRow = {
  canonical_id: string
  text_content: string | null
  ingestion_status: string
  confidence: string
  provenance_source: string | null
  ingested_at: string | null
}

type CitationRow = {
  to_canonical_id: string
  relationship_type: string | null
  source_method: string | null
  confidence: string | null
  explanation: string | null
}

type AliasRow = { canonical_id: string }
type AmbiguousRow = { candidate_ids: string[] }
type ChildRow = { canonical_id: string }

// Builds a human label for an article-level canonical_id.
// ny/penal/220 → "NY Penal Law Article 220"
// federal/usc/21/8 → "21 U.S.C. Part 8"  (generic fallback)
function articleLabel(canonicalId: string): string {
  const parts = canonicalId.split('/')
  const jurisdiction = parts[0]
  const code = parts[1]

  const NY_NAMES: Record<string, string> = {
    penal: 'NY Penal Law', phl: 'NY Public Health Law',
    cplr: 'NY Civil Practice Law & Rules', vtl: 'NY Vehicle & Traffic Law',
    ed: 'NY Education Law', gbl: 'NY General Business Law',
    corr: 'NY Correction Law', exec: 'NY Executive Law', tax: 'NY Tax Law',
  }

  if (jurisdiction === 'ny' && code) {
    const section = parts.slice(2).join('/')
    const name = NY_NAMES[code] ?? `NY ${code}`
    return `${name} Article ${section}`
  }

  if (jurisdiction === 'federal' && code === 'usc' && parts.length >= 4) {
    const title = parts[2]
    const section = parts.slice(3).join('/')
    return `${title} U.S.C. Part ${section}`
  }

  return canonicalId
}

function buildRelationship(row: CitationRow): LegalRelationship {
  return {
    target_id: row.to_canonical_id,
    relationship_type: (row.relationship_type ?? 'references') as LegalRelationshipType,
    source_method: (row.source_method ?? 'parser') as LegalRelationshipSourceMethod,
    confidence: row.confidence != null ? parseFloat(row.confidence) : undefined,
    explanation: row.explanation ?? 'Referenced directly in text',
  }
}

async function lookupByCanonicalId(
  canonicalId: string,
  parseConfidence: number,
  db: DbClient,
): Promise<ResolvedProvision> {
  const provisions = await db.query<ProvisionRow>(
    'SELECT canonical_id, text_content, ingestion_status, confidence, provenance_source, ingested_at FROM provisions WHERE canonical_id = $1',
    [canonicalId],
  )

  // Query citations unconditionally — outbound edges are returned even when the provision
  // text has not been ingested yet, so callers can continue traversing the chain.
  const citations = await db.query<CitationRow>(
    'SELECT to_canonical_id, relationship_type, source_method, confidence, explanation FROM citations WHERE from_canonical_id = $1',
    [canonicalId],
  )

  const legal_relationships = citations.map(buildRelationship)
  const outbound_citations = citations.map((c) => c.to_canonical_id)

  if (provisions.length === 0) {
    const children = await db.query<ChildRow>(
      `SELECT canonical_id FROM provisions WHERE canonical_id LIKE $1 ORDER BY canonical_id`,
      [`${canonicalId}.%`],
    )
    if (children.length > 0) {
      return {
        canonical_id: canonicalId,
        status: 'article_partial',
        label: articleLabel(canonicalId),
        confidence: parseConfidence,
        article_sections: children.map((c) => c.canonical_id),
        outbound_citations,
        legal_relationships,
        provenance: { source: 'unknown' },
      }
    }
    return {
      canonical_id: canonicalId,
      status: 'not_ingested',
      confidence: parseConfidence,
      outbound_citations,
      legal_relationships,
      provenance: { source: 'unknown' },
    }
  }

  const row = provisions[0]
  const dbConfidence = parseFloat(row!.confidence)
  // Fall back to 1.0 if DB value is missing or non-numeric (preserves parse confidence)
  const safeDbConfidence = Number.isFinite(dbConfidence) ? dbConfidence : 1.0
  return {
    canonical_id: row!.canonical_id,
    status: row!.ingestion_status === 'ingested' ? 'ingested' : 'not_ingested',
    confidence: parseConfidence * safeDbConfidence,
    text: row!.text_content ?? undefined,
    outbound_citations,
    legal_relationships,
    provenance: {
      source: row!.provenance_source ?? 'unknown',
      ingested_at: row!.ingested_at ?? undefined,
    },
  }
}

export async function resolveCitation(
  parsed: ParsedCitation,
  db: DbClient,
): Promise<ResolvedProvision> {
  // 1. Direct canonical_id lookup
  if (parsed.canonical_id) {
    return lookupByCanonicalId(parsed.canonical_id, parsed.confidence, db)
  }

  // 2. Alias lookup
  const aliases = await db.query<AliasRow>(
    'SELECT canonical_id FROM aliases WHERE alias = $1',
    [parsed.raw],
  )

  if (aliases.length > 0) {
    const result = await lookupByCanonicalId(aliases[0]!.canonical_id, parsed.confidence, db)
    return {
      ...result,
      status: 'alias_resolved',
      resolved_from: parsed.raw,
    }
  }

  // 3. Ambiguous lookup
  const ambiguous = await db.query<AmbiguousRow>(
    'SELECT candidate_ids FROM ambiguous_citations WHERE raw = $1 LIMIT 1',
    [parsed.raw],
  )

  if (ambiguous.length > 0) {
    return {
      canonical_id: parsed.raw,
      status: 'ambiguous',
      confidence: parsed.confidence * 0.5,
      candidates: ambiguous[0]!.candidate_ids,
      outbound_citations: [],
      legal_relationships: [],
      provenance: { source: 'unknown' },
    }
  }

  // 4. Fallback
  return {
    canonical_id: parsed.raw,
    status: 'not_ingested',
    confidence: parsed.confidence,
    outbound_citations: [],
    legal_relationships: [],
    provenance: { source: 'unknown' },
  }
}
