import type { ParsedCitation, ResolvedProvision } from '@statute-chain/types'

export interface DbClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
}

export async function resolveCitation(
  _parsed: ParsedCitation,
  _db: DbClient,
): Promise<ResolvedProvision> {
  // TODO: implement resolver — see spec
  return {
    canonical_id: _parsed.canonical_id ?? _parsed.raw,
    status: 'not_ingested',
    confidence: _parsed.confidence,
    outbound_citations: [],
    provenance: { source: 'unknown' },
  }
}
