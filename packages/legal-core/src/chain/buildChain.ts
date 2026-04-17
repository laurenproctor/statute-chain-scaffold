import type { ChainGraph, BuildChainOptions } from '@statute-chain/types'
import type { DbClient } from '../resolver/resolveCitation.js'

const DEFAULTS = {
  maxDepth: 3,
  nodeCap: 50,
  timeoutMs: 5000,
} as const

export async function buildChain(
  _citation: string,
  _db: DbClient,
  options: BuildChainOptions = {},
): Promise<ChainGraph> {
  const _maxDepth = Math.min(Math.max(options.maxDepth ?? DEFAULTS.maxDepth, 1), 10)
  const _nodeCap = options.nodeCap ?? DEFAULTS.nodeCap
  const _timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs

  // TODO: implement BFS traversal — see spec
  void _maxDepth; void _nodeCap; void _timeoutMs

  return {
    root: _citation,
    nodes: {},
    edges: [],
    unresolved: [],
    truncated: false,
    depth_reached: 0,
    total_nodes: 0,
    query_ms: 0,
  }
}
