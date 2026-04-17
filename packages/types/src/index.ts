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
  | 'article_partial'

export type ResolvedProvision = {
  canonical_id: string
  status: IngestionStatus
  confidence: number
  text?: string
  label?: string
  resolved_from?: string
  candidates?: string[]
  article_sections?: string[]
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

// ── Legal Relationships ───────────────────────────────────────────────────────
//
// Scaffold for the Legal Relationships data model. Current system populates
// only "references" relationships (parsed outbound citations). All other
// relationship types are reserved for future rule-engine or LLM enrichment.
//
// TODO: DEFINITIONS GRAPH — terms defined by or relied on by a provision
//   (e.g. "controlled substance" defined in 21 U.S.C. § 802, used by § 841)
//
// TODO: ELEMENTS GRAPH — offense elements (knowingly, possess, quantity threshold)
//
// TODO: DEFENSES / EXCEPTIONS GRAPH — authorized possession, prescription exemption
//
// TODO: PENALTY GRAPH — felony class, mandatory minimum, sentencing enhancement
//
// TODO: TEMPORAL GRAPH — amended_by, effective_date, repealed_on, historical_version
//
// TODO: JURISDICTION GRAPH — federal, NY, CA, local ordinances
//
// TODO: CROSSWALK GRAPH — equivalent / analogous laws across jurisdictions

export type LegalRelationshipType =
  | 'references'
  | 'defines'
  | 'uses_term'
  | 'requires_element'
  | 'creates_offense'
  | 'creates_defense'
  | 'creates_exception'
  | 'enhances_penalty'
  | 'reduces_penalty'
  | 'cross_jurisdiction_match'
  | 'implemented_by'
  | 'limited_by'
  | 'amended_by'
  | 'version_of'

export type LegalRelationship = {
  source_id: string
  target_id: string
  relationship_type: LegalRelationshipType
  confidence?: number
  source_method?: 'parser' | 'rule_engine' | 'llm' | 'human_verified'
  explanation?: string
}
