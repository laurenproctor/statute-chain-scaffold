# Statute Chain MVP Design
_Date: 2026-04-16_

## Overview

A deterministic legal citation resolver that parses a citation string, looks it up in Postgres, and recursively follows cross-references up to N hops, returning a typed chain graph. Correctness over flair.

---

## Scope

- Jurisdictions: NY + Federal (v1). Jurisdiction type is extensible (`string`).
- Citation formats: structured (high confidence) and informal/shorthand (lower confidence, flagged).
- Resolution: parse → DB lookup → return provision text or not-ingested status.
- Chain: BFS traversal with cycle detection, node cap, timeout, depth guard.
- UI: single citation input → chain display. Depth override via `?depth=N` query param (min 1, max 10, default 3). No UI control.

---

## Architecture

```
[User: citation string]
        ↓
[Next.js API route]          — validate input, call buildChain, serialize JSON
        ↓
[legal-core/buildChain]      — BFS, cycle detection, guards, returns ChainGraph
        ↓
[legal-core/resolveCitation] — single DB lookup, returns ResolvedProvision
        ↓
[legal-core/parseCitation]   — pure regex, returns ParsedCitation | ParseError
        ↓
[Postgres]                   — provisions, citations (edges), aliases tables
```

---

## Types (`packages/types/legal.ts`)

```typescript
type Jurisdiction = 'ny' | 'federal' | string
type CitationFormat = 'structured' | 'informal'

type ParsedCitation = {
  raw: string
  format: CitationFormat
  confidence: number            // 0–1; structured = 1.0, informal < 1.0
  jurisdiction: Jurisdiction
  code: string                  // e.g. "penal", "usc/26"
  section: string               // e.g. "265.02"
  subsection_path: string[]     // e.g. ["c", "3"]
  canonical_id?: string         // optional; undefined when ambiguous
}

type ParseError = {
  raw: string
  error: string
  status: 'parse_failed'
}

type IngestionStatus =
  | 'ingested'
  | 'not_ingested'
  | 'alias_resolved'
  | 'ambiguous'
  | 'not_found'
  | 'parse_failed'

type ResolvedProvision = {
  canonical_id: string
  status: IngestionStatus
  confidence: number
  text?: string
  resolved_from?: string        // alias source when alias_resolved
  candidates?: string[]         // set when ambiguous
  outbound_citations: string[]
  provenance: {
    source: string              // e.g. "ny-open-legislation"
    ingested_at?: string        // ISO timestamp
  }
}

type ChainEdge = {
  from: string
  to: string
  depth: number
  resolved: boolean
}

type ChainNode = ResolvedProvision & { depth: number }

type ChainGraph = {
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
```

---

## Database Schema (`packages/database/schema.sql`)

```sql
create table if not exists provisions (
  canonical_id        text primary key,
  jurisdiction        text not null,
  code                text not null,
  section             text not null,
  text_content        text,
  ingestion_status    text not null default 'ingested',
  confidence          numeric(3,2) not null default 1.0,
  provenance_source   text,
  ingested_at         timestamptz default now()
);

create table if not exists citations (
  from_canonical_id   text not null references provisions(canonical_id),
  to_canonical_id     text not null,
  depth_found         int,
  primary key (from_canonical_id, to_canonical_id)
);

create table if not exists aliases (
  alias               text primary key,
  canonical_id        text not null references provisions(canonical_id)
);

create table if not exists ambiguous_citations (
  raw                 text not null,
  candidate_ids       text[] not null,
  created_at          timestamptz default now()
);
```

---

## Parser (`legal-core/src/parser/parseCitation.ts`)

Pure function, no I/O.

**Structured patterns (confidence = 1.0):**
- Federal USC: `42 U.S.C. § 1983`, `26 U.S.C. § 501(c)(3)`
- NY statute: `N.Y. Penal Law § 265.02(b)`, `N.Y. Tax Law § 1105`

**Informal patterns (confidence = 0.6):**
- `Penal § 265`, `IRC 501(c)`, `Section 1983`
- Flagged with `format: 'informal'`

Returns `ParsedCitation | ParseError`. Builds `canonical_id` when unambiguous.

Subsection path parsed separately: `(c)(3)` → `["c", "3"]`.

---

## Resolver (`legal-core/src/resolver/resolveCitation.ts`)

Takes `ParsedCitation` + DB client. Single lookup path:

1. If `canonical_id` present → query `provisions` directly
2. If not → check `aliases` table → re-query provisions
3. If ambiguous → query `ambiguous_citations` → return candidates
4. Returns `ResolvedProvision` with correct `IngestionStatus`

Propagates and adjusts confidence from parse step.

---

## Chain Builder (`legal-core/src/chain/buildChain.ts`)

BFS traversal. Guards:

| Guard | Value |
|-------|-------|
| Default depth | 3 |
| Min depth | 1 |
| Max depth | 10 |
| Node cap | 50 |
| Timeout | 5000ms |

Algorithm:
1. Parse root citation
2. Enqueue root
3. Per node: resolve → collect `outbound_citations` as next-level edges
4. Skip already-visited nodes (cycle detection via `Set<string>`)
5. Stop on depth, node cap, or timeout — set `truncated: true` + `truncation_reason`
6. Return `ChainGraph` with all nodes, typed edges, unresolved list, timing

---

## API Route (`apps/web/app/api/resolve/route.ts`)

```
GET /api/resolve?citation=<raw>&depth=<N>
```

- Validates `citation` present
- Clamps `depth` to [1, 10], defaults to 3
- Calls `buildChain(citation, db, { maxDepth })`
- Returns `ChainGraph` as JSON
- Errors: 400 for missing citation, 500 with message for unexpected failures

---

## Tests

- **Parser:** structured formats, informal formats, subsection path extraction, parse failures, ambiguous inputs
- **Resolver:** ingested hit, alias resolution, not_found, ambiguous, not_ingested
- **Chain builder:** single node, multi-hop, cycle detection (provision referencing itself), node cap truncation, depth truncation, all-unresolved graph

---

## Ingest Scripts

- `scripts/ingest-ny.ts` — fetches NY Open Legislation XML, populates provisions + citations
- `scripts/ingest-federal.ts` — fetches USLM XML for target titles, populates provisions + citations
- `scripts/seed-db.ts` — inserts a small deterministic fixture set for local dev + tests

---

## Out of Scope for MVP

- Authentication
- Full-text search
- Multi-citation bulk extraction from pasted text
- UI depth control
- Citation export
