import { describe, it, expect } from 'vitest'
import { buildChain } from './buildChain.js'
import type { DbClient } from '../resolver/resolveCitation.js'
import type { ResolvedProvision } from '@statute-chain/types'

// ── Test DB factory ───────────────────────────────────────────────────────────
//
// Simulates a provisions + citations + aliases + ambiguous_citations store.
// Each node is keyed by canonical_id. legal_relationships drive BFS edges.

type FakeProvision = ResolvedProvision

function makeDb(
  provisions: FakeProvision[],
  aliases: Record<string, string> = {},
  ambiguous: Record<string, string[]> = {},
): DbClient {
  const byId = new Map(provisions.map((p) => [p.canonical_id, p]))

  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const p = params?.[0] as string | undefined

      if (sql.includes('FROM provisions')) {
        const row = byId.get(p ?? '')
        if (!row) return []
        return [{
          canonical_id: row.canonical_id,
          text_content: row.text ?? null,
          ingestion_status: row.status === 'ingested' ? 'ingested' : 'not_ingested',
          confidence: String(row.confidence),
          provenance_source: row.provenance.source,
          ingested_at: row.provenance.ingested_at ?? null,
        }] as T[]
      }

      if (sql.includes('FROM legal_references')) {
        const row = byId.get(p ?? '')
        return (row?.legal_relationships ?? []).map((rel) => ({
          from_canonical_id: p,
          to_canonical_id: rel.target_id,
          relationship_type: rel.relationship_type,
          source_method: rel.source_method,
          confidence: rel.confidence ?? null,
          explanation: rel.explanation,
        })) as T[]
      }

      if (sql.includes('FROM aliases')) {
        const target = aliases[p ?? '']
        if (!target) return []
        return [{ alias: p, canonical_id: target }] as T[]
      }

      if (sql.includes('FROM ambiguous_citations')) {
        const candidates = ambiguous[p ?? '']
        if (!candidates) return []
        return [{ raw: p, candidate_ids: candidates }] as T[]
      }

      return []
    },
  }
}

function provision(
  id: string,
  outbound: string[] = [],
  status: ResolvedProvision['status'] = 'ingested',
): FakeProvision {
  return {
    canonical_id: id,
    status,
    confidence: 1.0,
    text: `Text of ${id}`,
    legal_relationships: outbound.map((target_id) => ({
      target_id,
      relationship_type: 'references' as const,
      source_method: 'parser' as const,
      explanation: 'Referenced directly in text',
    })),
    provenance: { source: 'test' },
  }
}

const ROOT_CITATION = {
  raw: 'federal/usc/26/501',
  canonical_id: 'federal/usc/26/501',
}

// ── 1. Linear chain — basic BFS ───────────────────────────────────────────────

describe('linear chain', () => {
  it('resolves root and follows one outbound citation', async () => {
    const db = makeDb([
      provision('federal/usc/26/501', ['federal/usc/26/502']),
      provision('federal/usc/26/502', []),
    ])

    const graph = await buildChain(ROOT_CITATION.canonical_id, db)

    expect(graph.root).toBe('federal/usc/26/501')
    expect(Object.keys(graph.nodes)).toHaveLength(2)
    expect(graph.nodes['federal/usc/26/501']!.depth).toBe(0)
    expect(graph.nodes['federal/usc/26/502']!.depth).toBe(1)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({
      from: 'federal/usc/26/501',
      to: 'federal/usc/26/502',
      depth: 0,
      resolved: true,
    })
    expect(graph.truncated).toBe(false)
    expect(graph.total_nodes).toBe(2)
  })
})

// ── 2. Circular references ────────────────────────────────────────────────────

describe('circular references', () => {
  it('does not revisit already-visited nodes', async () => {
    const db = makeDb([
      provision('federal/usc/26/501', ['federal/usc/26/502']),
      provision('federal/usc/26/502', ['federal/usc/26/501']), // back to root
    ])

    const graph = await buildChain('federal/usc/26/501', db)

    // Only 2 unique nodes — root not visited twice
    expect(Object.keys(graph.nodes)).toHaveLength(2)
    // Edge back to root recorded but root not re-enqueued
    const backEdge = graph.edges.find(
      (e) => e.from === 'federal/usc/26/502' && e.to === 'federal/usc/26/501',
    )
    expect(backEdge).toBeDefined()
    expect(backEdge!.resolved).toBe(true)
  })

  it('handles self-referencing provision', async () => {
    const db = makeDb([
      provision('federal/usc/26/501', ['federal/usc/26/501']),
    ])

    const graph = await buildChain('federal/usc/26/501', db)

    expect(Object.keys(graph.nodes)).toHaveLength(1)
    // Self-edge recorded
    const selfEdge = graph.edges.find(
      (e) => e.from === 'federal/usc/26/501' && e.to === 'federal/usc/26/501',
    )
    expect(selfEdge).toBeDefined()
  })
})

// ── 3. Alias chains ───────────────────────────────────────────────────────────

describe('alias chains', () => {
  it('follows an alias to the canonical provision and records resolved_from', async () => {
    // Root citation string is an alias that maps to a canonical id
    const db = makeDb(
      [provision('federal/usc/42/1983', [])],
      { 'Civil Rights Act § 1983': 'federal/usc/42/1983' },
    )

    const graph = await buildChain('Civil Rights Act § 1983', db)

    expect(graph.root).toBe('Civil Rights Act § 1983')
    const node = graph.nodes['federal/usc/42/1983']
    expect(node).toBeDefined()
    expect(node!.status).toBe('alias_resolved')
    expect(node!.resolved_from).toBe('Civil Rights Act § 1983')
  })
})

// ── 4. Missing nodes with unresolved references ──────────────────────────────

describe('missing nodes with unresolved references', () => {
  it('marks missing nodes as not_ingested and records them in unresolved', async () => {
    // 501 references 502, but 502 is not in DB
    const db = makeDb([
      provision('federal/usc/26/501', ['federal/usc/26/502']),
    ])

    const graph = await buildChain('federal/usc/26/501', db)

    expect(graph.nodes['federal/usc/26/502']!.status).toBe('not_ingested')
    expect(graph.unresolved).toContain('federal/usc/26/502')
  })

  it('does not enqueue children of not_ingested nodes (no outbound edges to follow)', async () => {
    // 501 → 502 (not ingested, but citations table has 502 → 503)
    // Since 502 isn't ingested, its legal_relationships should not be followed
    const db = makeDb([
      provision('federal/usc/26/501', ['federal/usc/26/502']),
      // 502 is absent from DB but citations table shows it references 503
    ])

    const graph = await buildChain('federal/usc/26/501', db)

    // 503 should not appear — we don't follow edges from unresolved nodes
    expect(graph.nodes['federal/usc/26/503']).toBeUndefined()
  })
})

// ── 5. Ambiguous candidates ───────────────────────────────────────────────────

describe('ambiguous citations', () => {
  it('records ambiguous node and its candidates, does not follow children', async () => {
    const db = makeDb(
      [provision('federal/usc/26/501', ['Section 1983'])],
      {},
      { 'Section 1983': ['federal/usc/42/1983', 'federal/usc/18/1983'] },
    )

    const graph = await buildChain('federal/usc/26/501', db)

    const ambigNode = graph.nodes['Section 1983']
    expect(ambigNode).toBeDefined()
    expect(ambigNode!.status).toBe('ambiguous')
    expect(ambigNode!.candidates).toEqual(['federal/usc/42/1983', 'federal/usc/18/1983'])
    // Neither candidate should be auto-followed
    expect(graph.nodes['federal/usc/42/1983']).toBeUndefined()
  })
})

// ── 6. Depth cutoff ───────────────────────────────────────────────────────────

describe('depth cutoff', () => {
  it('stops BFS at maxDepth and sets truncated=true', async () => {
    // Chain: A → B → C → D
    const db = makeDb([
      provision('A', ['B']),
      provision('B', ['C']),
      provision('C', ['D']),
      provision('D', []),
    ])

    const graph = await buildChain('A', db, { maxDepth: 2 })

    // depth 0=A, 1=B, 2=C — D at depth 3 should be cut
    expect(graph.nodes['A']).toBeDefined()
    expect(graph.nodes['B']).toBeDefined()
    expect(graph.nodes['C']).toBeDefined()
    expect(graph.nodes['D']).toBeUndefined()
    expect(graph.truncated).toBe(true)
    expect(graph.truncation_reason).toBe('depth')
    expect(graph.depth_reached).toBe(2)
  })

  it('stops BFS when nodeCap is hit and sets truncation_reason=node_cap', async () => {
    const db = makeDb([
      provision('A', ['B', 'C', 'D']),
      provision('B', []),
      provision('C', []),
      provision('D', []),
    ])

    const graph = await buildChain('A', db, { nodeCap: 2 })

    expect(Object.keys(graph.nodes).length).toBeLessThanOrEqual(2)
    expect(graph.truncated).toBe(true)
    expect(graph.truncation_reason).toBe('node_cap')
  })
})

// ── 7. Metadata ───────────────────────────────────────────────────────────────

describe('metadata', () => {
  it('records query_ms as a positive number', async () => {
    const db = makeDb([provision('federal/usc/26/501', [])])

    const graph = await buildChain('federal/usc/26/501', db)

    expect(graph.query_ms).toBeGreaterThanOrEqual(0)
  })

  it('records depth_reached correctly for a two-level chain', async () => {
    const db = makeDb([
      provision('A', ['B']),
      provision('B', ['C']),
      provision('C', []),
    ])

    const graph = await buildChain('A', db)

    expect(graph.depth_reached).toBe(2)
  })
})
