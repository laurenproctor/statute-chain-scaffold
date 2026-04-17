export type Jurisdiction = 'ny' | 'federal' | (string & {})

export type CitationFormat = 'structured' | 'informal'

export type ParsedCitation = {
  raw: string
  format: CitationFormat
  confidence: number
  jurisdiction: Jurisdiction
  code: string
  section: string
  subsection_path: string[]
  canonical_id?: string
}

export type ParseError = {
  raw: string
  error: string
  status: 'parse_failed'
}

export type IngestionStatus =
  | 'ingested'
  | 'not_ingested'
  | 'alias_resolved'
  | 'ambiguous'
  | 'not_found'
  | 'parse_failed'

export type ResolvedProvision = {
  canonical_id: string
  status: IngestionStatus
  confidence: number
  text?: string
  resolved_from?: string
  candidates?: string[]
  outbound_citations: string[]
  provenance: {
    source: string
    ingested_at?: string
  }
}

export type ChainEdge = {
  from: string
  to: string
  depth: number
  resolved: boolean
}

export type ChainNode = ResolvedProvision & {
  depth: number
}

export type ChainGraph = {
  root: string
  nodes: Record<string, ChainNode>
  edges: ChainEdge[]
  unresolved: string[]
  truncated: boolean
  truncation_reason?: 'depth' | 'node_cap' | 'timeout'
  depth_reached: number
  total_nodes: number
  query_ms: number
}

export type BuildChainOptions = {
  maxDepth?: number
  nodeCap?: number
  timeoutMs?: number
}
