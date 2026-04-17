import type { ChainGraph, ChainNode, ChainEdge, BuildChainOptions } from '@statute-chain/types'
import { resolveCitation, type DbClient } from '../resolver/resolveCitation.js'

const DEFAULTS = {
  maxDepth: 20,  // default; hard cap is 100
  nodeCap: 75,
  timeoutMs: 1500,
} as const

// Outbound citation IDs from the DB are always canonical (no spaces).
// Strings with spaces are user-supplied aliases or informal refs — leave canonical_id
// undefined so the resolver falls through to alias/ambiguous lookups.
function toCitationInput(raw: string) {
  const isCanonical = !/\s/.test(raw)
  return {
    raw,
    format: 'structured' as const,
    confidence: 1.0,
    jurisdiction: 'unknown' as const,
    code: '',
    section: '',
    subsection_path: [],
    ...(isCanonical ? { canonical_id: raw } : {}),
  }
}

export async function buildChain(
  citation: string,
  db: DbClient,
  options: BuildChainOptions = {},
): Promise<ChainGraph> {
  const maxDepth = Math.min(Math.max(options.maxDepth ?? DEFAULTS.maxDepth, 1), 100)
  const nodeCap = options.nodeCap ?? DEFAULTS.nodeCap
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs

  const start = Date.now()
  const deadline = start + timeoutMs

  const nodes: Record<string, ChainNode> = {}
  const edges: ChainEdge[] = []
  const unresolved: string[] = []
  const visited = new Set<string>()

  let truncated = false
  let truncationReason: ChainGraph['truncation_reason'] = undefined
  let depthReached = 0

  // BFS queue — each entry is [citationString, depth]
  const queue: Array<[string, number]> = [[citation, 0]]

  while (queue.length > 0) {
    if (Date.now() > deadline) {
      truncated = true
      truncationReason = 'timeout'
      break
    }

    const entry = queue.shift()!
    const [current, depth] = entry

    // Record edges for already-visited nodes without re-resolving
    if (visited.has(current)) continue
    visited.add(current)

    if (Object.keys(nodes).length >= nodeCap) {
      truncated = true
      truncationReason = 'node_cap'
      break
    }

    const resolved = await resolveCitation(toCitationInput(current), db)
    const nodeId = resolved.canonical_id

    const node: ChainNode = { ...resolved, depth }
    nodes[nodeId] = node

    if (depth > depthReached) depthReached = depth

    if (resolved.status === 'not_ingested') {
      unresolved.push(nodeId)
      // Don't follow legal_relationships from unresolved nodes —
      // we have no text content so outbound edges are unreliable.
      continue
    }

    if (resolved.status === 'ambiguous') {
      // Record node for inspection but don't auto-follow candidates.
      continue
    }

    const relationships = resolved.legal_relationships

    // Record outbound edges and enqueue unvisited children
    for (const rel of relationships) {
      const childId = rel.target_id
      const alreadyVisited = visited.has(childId)
      edges.push({
        from: nodeId,
        to: childId,
        depth,
        resolved: alreadyVisited
          ? (nodes[childId]?.status === 'ingested' || nodes[childId]?.status === 'alias_resolved')
          : false, // will be updated implicitly as nodes are added
        relationship: rel,
      })

      if (!alreadyVisited) {
        if (depth >= maxDepth) {
          truncated = true
          truncationReason = 'depth'
          // Don't enqueue — but still record the edge
        } else {
          queue.push([childId, depth + 1])
        }
      }
    }
  }

  // Resolve edge.resolved flags now that all nodes are known
  for (const edge of edges) {
    const targetNode = nodes[edge.to]
    edge.resolved =
      targetNode !== undefined &&
      (targetNode.status === 'ingested' || targetNode.status === 'alias_resolved')
  }

  return {
    root: citation,
    nodes,
    edges,
    unresolved,
    truncated,
    ...(truncationReason !== undefined && { truncation_reason: truncationReason }),
    depth_reached: depthReached,
    total_nodes: Object.keys(nodes).length,
    query_ms: Date.now() - start,
  }
}
