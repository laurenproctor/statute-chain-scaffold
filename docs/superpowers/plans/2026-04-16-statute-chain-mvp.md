# Statute Chain MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic legal citation parser, Postgres-backed resolver, and BFS chain builder, wired to a minimal Next.js UI and API route.

**Architecture:** `parseCitation` (pure regex) → `resolveCitation` (DB lookup with alias + ambiguity handling) → `buildChain` (BFS traversal with cycle detection, depth/node/timeout guards). A Next.js API route is the only entry point for the UI.

**Tech Stack:** TypeScript 5.4 (strict), pnpm workspaces, Vitest, postgres.js, Next.js 14, Docker Compose (Postgres 16).

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `packages/types/src/index.ts` | Exists (complete) | All shared types — do not modify |
| `packages/legal-core/src/parser/parseCitation.ts` | Stub | Regex parser — implement here |
| `packages/legal-core/src/resolver/resolveCitation.ts` | Stub | DB resolver — implement here |
| `packages/legal-core/src/chain/buildChain.ts` | Stub | BFS traversal — implement here |
| `packages/legal-core/src/index.ts` | Exists (complete) | Re-exports — do not modify |
| `packages/database/src/index.ts` | Exists (complete) | Postgres client singleton — do not modify |
| `packages/database/schema.sql` | Exists (complete) | 4-table schema — do not modify |
| `tests/parser.test.ts` | Scaffolded | Parser tests — fill in assertions |
| `tests/resolver.test.ts` | Scaffolded | Resolver tests — fill in assertions |
| `tests/chain.test.ts` | Create | Chain builder tests |
| `scripts/seed-db.ts` | Stub | Deterministic fixture seed |
| `apps/web/app/api/resolve/route.ts` | Create | Next.js API route |
| `apps/web/app/page.tsx` | Exists (stub) | Citation input UI — replace |

---

## Task 1: Parser — structured federal citations

**Files:**
- Modify: `packages/legal-core/src/parser/parseCitation.ts`
- Modify: `tests/parser.test.ts`

The parser is a pure function. No I/O. It takes a raw string and returns either a `ParsedCitation` or a `ParseError`. Structured citations get `confidence: 1.0`. The `canonical_id` is built deterministically from parsed parts.

A federal USC citation looks like: `42 U.S.C. § 1983` or `26 U.S.C. § 501(c)(3)`.
- Title number: digits before `U.S.C.`
- Section: digits (and dots) after `§`
- Subsections: parenthesized tokens after the section, e.g. `(c)(3)` → `['c', '3']`
- `canonical_id` format: `federal/usc/<title>/<section>` e.g. `federal/usc/42/1983`
- `code`: `usc/<title>` e.g. `usc/42`

- [ ] **Step 1.1: Write failing parser tests for structured federal citations**

Replace the TODO stubs in `tests/parser.test.ts` with real assertions:

```typescript
import { describe, it, expect } from 'vitest'
import { parseCitation } from '../packages/legal-core/src/parser/parseCitation.js'
import type { ParsedCitation, ParseError } from '../packages/types/src/index.js'

function isParsed(r: unknown): r is ParsedCitation {
  return typeof r === 'object' && r !== null && !('status' in r)
}
function isError(r: unknown): r is ParseError {
  return typeof r === 'object' && r !== null && 'status' in r && (r as ParseError).status === 'parse_failed'
}

describe('parseCitation — structured federal', () => {
  it('parses 42 U.S.C. § 1983', () => {
    const result = parseCitation('42 U.S.C. § 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBe(1.0)
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc/42')
    expect(result.section).toBe('1983')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBe('federal/usc/42/1983')
  })

  it('parses 26 U.S.C. § 501(c)(3)', () => {
    const result = parseCitation('26 U.S.C. § 501(c)(3)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.section).toBe('501')
    expect(result.subsection_path).toEqual(['c', '3'])
    expect(result.canonical_id).toBe('federal/usc/26/501')
  })

  it('returns ParseError for unrecognizable input', () => {
    const result = parseCitation('not a citation at all')
    expect(isError(result)).toBe(true)
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -40
```

Expected: tests fail with "not implemented" or assertion errors.

- [ ] **Step 1.3: Implement structured federal parser**

Replace `packages/legal-core/src/parser/parseCitation.ts` entirely:

```typescript
import type { ParsedCitation, ParseError } from '@statute-chain/types'

export type ParseResult = ParsedCitation | ParseError

// Matches: 42 U.S.C. § 1983  /  26 U.S.C. § 501(c)(3)
const FEDERAL_USC = /^(\d+)\s+U\.S\.C\.\s+§\s*(\d[\d.]*)((?:\([^)]+\))*)/

// Matches: N.Y. Penal Law § 265.02  /  N.Y. Tax Law § 1105(a)
const NY_STATUTE = /^N\.Y\.\s+(\w[\w\s]+?)\s+(?:Law\s+)?§\s*(\d[\d.]*)((?:\([^)]+\))*)/i

// Informal: Penal § 265  /  IRC 501(c)  /  Section 1983
const INFORMAL_SECTION = /\bsection\s+(\d[\d.]*)((?:\([^)]+\))*)/i
const INFORMAL_CODE_SECTION = /\b(\w+)\s+§\s*(\d[\d.]*)((?:\([^)]+\))*)/i
const INFORMAL_IRC = /\bIRC\s+(\d[\d.]*)((?:\([^)]+\))*)/i

function parseSubsections(raw: string): string[] {
  return [...raw.matchAll(/\(([^)]+)\)/g)].map(m => m[1] ?? '')
}

function nyCodeSlug(lawName: string): string {
  return lawName.trim().toLowerCase().replace(/\s+/g, '-')
}

export function parseCitation(input: string): ParseResult {
  const trimmed = input.trim()

  // Structured: federal USC
  const usc = trimmed.match(FEDERAL_USC)
  if (usc) {
    const [, title, section, subsRaw] = usc
    const subsection_path = parseSubsections(subsRaw ?? '')
    return {
      raw: input,
      format: 'structured',
      confidence: 1.0,
      jurisdiction: 'federal',
      code: `usc/${title}`,
      section: section ?? '',
      subsection_path,
      canonical_id: `federal/usc/${title}/${section}`,
    }
  }

  // Structured: NY statute
  const ny = trimmed.match(NY_STATUTE)
  if (ny) {
    const [, lawName, section, subsRaw] = ny
    const subsection_path = parseSubsections(subsRaw ?? '')
    const slug = nyCodeSlug(lawName ?? '')
    return {
      raw: input,
      format: 'structured',
      confidence: 1.0,
      jurisdiction: 'ny',
      code: slug,
      section: section ?? '',
      subsection_path,
      canonical_id: `ny/${slug}/${section}`,
    }
  }

  // Informal: IRC <section>
  const irc = trimmed.match(INFORMAL_IRC)
  if (irc) {
    const [, section, subsRaw] = irc
    return {
      raw: input,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'usc/26',
      section: section ?? '',
      subsection_path: parseSubsections(subsRaw ?? ''),
      canonical_id: undefined,
    }
  }

  // Informal: Section <number>
  const sec = trimmed.match(INFORMAL_SECTION)
  if (sec) {
    const [, section, subsRaw] = sec
    return {
      raw: input,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'unknown',
      section: section ?? '',
      subsection_path: parseSubsections(subsRaw ?? ''),
      canonical_id: undefined,
    }
  }

  // Informal: <code> § <section>
  const codeSection = trimmed.match(INFORMAL_CODE_SECTION)
  if (codeSection) {
    const [, code, section, subsRaw] = codeSection
    return {
      raw: input,
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'unknown',
      code: (code ?? '').toLowerCase(),
      section: section ?? '',
      subsection_path: parseSubsections(subsRaw ?? ''),
      canonical_id: undefined,
    }
  }

  return { raw: input, error: `no pattern matched: "${input}"`, status: 'parse_failed' }
}
```

- [ ] **Step 1.4: Run tests and confirm they pass**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -60
```

Expected: all parser tests in `tests/parser.test.ts` pass.

- [ ] **Step 1.5: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add packages/legal-core/src/parser/parseCitation.ts tests/parser.test.ts
git commit -m "feat(parser): implement structured federal + NY + informal citation parsing"
```

---

## Task 2: Parser — NY citations and informal patterns

**Files:**
- Modify: `tests/parser.test.ts` (add NY + informal tests)

The implementation from Task 1 already covers NY and informal. This task locks in tests for those branches.

NY citation: `N.Y. Penal Law § 265.02(b)` → `{ jurisdiction: 'ny', code: 'penal', section: '265.02', subsection_path: ['b'], canonical_id: 'ny/penal/265.02' }`

Informal: `Penal § 265` → `{ format: 'informal', confidence: 0.6, canonical_id: undefined }`

- [ ] **Step 2.1: Add NY and informal test cases to `tests/parser.test.ts`**

Append these describe blocks to the existing test file:

```typescript
describe('parseCitation — structured NY', () => {
  it('parses N.Y. Penal Law § 265.02', () => {
    const result = parseCitation('N.Y. Penal Law § 265.02')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('structured')
    expect(result.confidence).toBe(1.0)
    expect(result.jurisdiction).toBe('ny')
    expect(result.code).toBe('penal')
    expect(result.section).toBe('265.02')
    expect(result.subsection_path).toEqual([])
    expect(result.canonical_id).toBe('ny/penal/265.02')
  })

  it('parses N.Y. Penal Law § 265.02(b) with subsection', () => {
    const result = parseCitation('N.Y. Penal Law § 265.02(b)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.subsection_path).toEqual(['b'])
    expect(result.canonical_id).toBe('ny/penal/265.02')
  })

  it('parses N.Y. Tax Law § 1105', () => {
    const result = parseCitation('N.Y. Tax Law § 1105')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.jurisdiction).toBe('ny')
    expect(result.code).toBe('tax')
    expect(result.section).toBe('1105')
    expect(result.canonical_id).toBe('ny/tax/1105')
  })
})

describe('parseCitation — informal', () => {
  it('Penal § 265 is informal with no canonical_id', () => {
    const result = parseCitation('Penal § 265')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.confidence).toBe(0.6)
    expect(result.canonical_id).toBeUndefined()
  })

  it('IRC 501(c) maps to federal/usc/26', () => {
    const result = parseCitation('IRC 501(c)')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.jurisdiction).toBe('federal')
    expect(result.code).toBe('usc/26')
    expect(result.subsection_path).toEqual(['c'])
    expect(result.canonical_id).toBeUndefined()
  })

  it('Section 1983 is informal with unknown jurisdiction', () => {
    const result = parseCitation('Section 1983')
    expect(isParsed(result)).toBe(true)
    if (!isParsed(result)) return
    expect(result.format).toBe('informal')
    expect(result.section).toBe('1983')
    expect(result.canonical_id).toBeUndefined()
  })
})
```

- [ ] **Step 2.2: Run tests**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -80
```

Expected: all tests pass.

- [ ] **Step 2.3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add tests/parser.test.ts
git commit -m "test(parser): add NY structured and informal citation test cases"
```

---

## Task 3: Resolver — direct canonical_id lookup

**Files:**
- Modify: `packages/legal-core/src/resolver/resolveCitation.ts`
- Modify: `tests/resolver.test.ts`

The resolver takes a `ParsedCitation` and a `DbClient`, performs a DB lookup, and returns `ResolvedProvision`. The `DbClient` interface is already defined in the stub — do not change it.

Lookup path:
1. If `canonical_id` is present → `SELECT` from `provisions` where `canonical_id = $1`
2. Row found → return `status: 'ingested'` with `text`, provenance, outbound citations
3. Row missing → return `status: 'not_ingested'`

The DB row shape returned by `provisions` queries:
```typescript
type ProvisionRow = {
  canonical_id: string
  text_content: string | null
  ingestion_status: string
  confidence: string   // numeric comes back as string from postgres.js
  provenance_source: string | null
  ingested_at: string | null
}
```

Outbound citations come from a second query:
```sql
SELECT to_canonical_id FROM citations WHERE from_canonical_id = $1
```

- [ ] **Step 3.1: Write failing resolver tests**

Replace `tests/resolver.test.ts` entirely:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { resolveCitation } from '../packages/legal-core/src/resolver/resolveCitation.js'
import type { ParsedCitation } from '../packages/types/src/index.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

type MockRow = Record<string, unknown>

function makeDb(responses: MockRow[][]): DbClient {
  let call = 0
  return {
    query: vi.fn().mockImplementation(() => {
      const rows = responses[call] ?? []
      call++
      return Promise.resolve(rows)
    }),
  }
}

const structured: ParsedCitation = {
  raw: 'N.Y. Penal Law § 265.02',
  format: 'structured',
  confidence: 1.0,
  jurisdiction: 'ny',
  code: 'penal',
  section: '265.02',
  subsection_path: [],
  canonical_id: 'ny/penal/265.02',
}

describe('resolveCitation — direct lookup', () => {
  it('returns ingested when provision found', async () => {
    const db = makeDb([
      [{ canonical_id: 'ny/penal/265.02', text_content: 'Criminal possession...', ingestion_status: 'ingested', confidence: '1.00', provenance_source: 'ny-open-legislation', ingested_at: '2026-01-01T00:00:00Z' }],
      [{ to_canonical_id: 'ny/penal/265.00' }],
    ])
    const result = await resolveCitation(structured, db)
    expect(result.status).toBe('ingested')
    expect(result.text).toBe('Criminal possession...')
    expect(result.outbound_citations).toEqual(['ny/penal/265.00'])
    expect(result.confidence).toBe(1.0)
    expect(result.provenance.source).toBe('ny-open-legislation')
  })

  it('returns not_ingested when provision row missing', async () => {
    const db = makeDb([[], []])
    const result = await resolveCitation(structured, db)
    expect(result.status).toBe('not_ingested')
    expect(result.text).toBeUndefined()
    expect(result.outbound_citations).toEqual([])
  })
})
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -60
```

Expected: resolver tests fail.

- [ ] **Step 3.3: Implement direct lookup in resolveCitation**

Replace `packages/legal-core/src/resolver/resolveCitation.ts` entirely:

```typescript
import type { ParsedCitation, ResolvedProvision } from '@statute-chain/types'

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

type CitationRow = { to_canonical_id: string }
type AliasRow = { canonical_id: string }
type AmbiguousRow = { candidate_ids: string[] }

export async function resolveCitation(
  parsed: ParsedCitation,
  db: DbClient,
): Promise<ResolvedProvision> {
  const canonicalId = parsed.canonical_id

  if (canonicalId) {
    return lookupByCanonicalId(canonicalId, parsed.confidence, db)
  }

  // No canonical_id — check aliases first
  const aliases = await db.query<AliasRow>(
    'SELECT canonical_id FROM aliases WHERE alias = $1',
    [parsed.raw],
  )
  if (aliases.length > 0 && aliases[0]) {
    const resolved = await lookupByCanonicalId(aliases[0].canonical_id, parsed.confidence, db)
    return { ...resolved, status: 'alias_resolved', resolved_from: parsed.raw }
  }

  // Check ambiguous_citations
  const ambiguous = await db.query<AmbiguousRow>(
    'SELECT candidate_ids FROM ambiguous_citations WHERE raw = $1 LIMIT 1',
    [parsed.raw],
  )
  if (ambiguous.length > 0 && ambiguous[0]) {
    return {
      canonical_id: parsed.raw,
      status: 'ambiguous',
      confidence: parsed.confidence * 0.5,
      candidates: ambiguous[0].candidate_ids,
      outbound_citations: [],
      provenance: { source: 'unknown' },
    }
  }

  return {
    canonical_id: parsed.raw,
    status: 'not_ingested',
    confidence: parsed.confidence,
    outbound_citations: [],
    provenance: { source: 'unknown' },
  }
}

async function lookupByCanonicalId(
  canonicalId: string,
  parseConfidence: number,
  db: DbClient,
): Promise<ResolvedProvision> {
  const rows = await db.query<ProvisionRow>(
    'SELECT canonical_id, text_content, ingestion_status, confidence, provenance_source, ingested_at FROM provisions WHERE canonical_id = $1',
    [canonicalId],
  )

  const outboundRows = await db.query<CitationRow>(
    'SELECT to_canonical_id FROM citations WHERE from_canonical_id = $1',
    [canonicalId],
  )
  const outbound_citations = outboundRows.map(r => r.to_canonical_id)

  if (rows.length === 0 || !rows[0]) {
    return {
      canonical_id: canonicalId,
      status: 'not_ingested',
      confidence: parseConfidence,
      outbound_citations,
      provenance: { source: 'unknown' },
    }
  }

  const row = rows[0]
  const dbConfidence = parseFloat(row.confidence)
  return {
    canonical_id: row.canonical_id,
    status: row.ingestion_status === 'ingested' ? 'ingested' : 'not_ingested',
    confidence: parseConfidence * dbConfidence,
    text: row.text_content ?? undefined,
    outbound_citations,
    provenance: {
      source: row.provenance_source ?? 'unknown',
      ingested_at: row.ingested_at ?? undefined,
    },
  }
}
```

- [ ] **Step 3.4: Run tests and confirm they pass**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -80
```

Expected: resolver direct-lookup tests pass.

- [ ] **Step 3.5: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add packages/legal-core/src/resolver/resolveCitation.ts tests/resolver.test.ts
git commit -m "feat(resolver): implement direct lookup, alias resolution, and ambiguous handling"
```

---

## Task 4: Resolver — alias and ambiguous tests

**Files:**
- Modify: `tests/resolver.test.ts`

The implementation from Task 3 already handles aliases and ambiguous citations. This task adds tests for those paths.

- [ ] **Step 4.1: Append alias and ambiguous test cases to `tests/resolver.test.ts`**

Add these describe blocks to the file:

```typescript
describe('resolveCitation — alias resolution', () => {
  it('resolves via aliases table and sets resolved_from', async () => {
    const informal: ParsedCitation = {
      raw: 'IRC 501(c)',
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'usc/26',
      section: '501',
      subsection_path: ['c'],
      canonical_id: undefined,
    }
    const db = makeDb([
      [{ canonical_id: 'federal/usc/26/501' }],
      [{ canonical_id: 'federal/usc/26/501', text_content: 'Exempt orgs...', ingestion_status: 'ingested', confidence: '1.00', provenance_source: 'usc-xml', ingested_at: '2026-01-01T00:00:00Z' }],
      [],
    ])
    const result = await resolveCitation(informal, db)
    expect(result.status).toBe('alias_resolved')
    expect(result.resolved_from).toBe('IRC 501(c)')
    expect(result.text).toBe('Exempt orgs...')
  })
})

describe('resolveCitation — ambiguous', () => {
  it('returns ambiguous status with candidates when found in ambiguous_citations', async () => {
    const ambig: ParsedCitation = {
      raw: 'Section 265',
      format: 'informal',
      confidence: 0.6,
      jurisdiction: 'federal',
      code: 'unknown',
      section: '265',
      subsection_path: [],
      canonical_id: undefined,
    }
    const db = makeDb([
      [],
      [{ candidate_ids: ['ny/penal/265.00', 'ny/penal/265.02'] }],
    ])
    const result = await resolveCitation(ambig, db)
    expect(result.status).toBe('ambiguous')
    expect(result.candidates).toEqual(['ny/penal/265.00', 'ny/penal/265.02'])
    expect(result.confidence).toBeLessThan(0.6)
  })
})
```

- [ ] **Step 4.2: Run tests**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -100
```

Expected: all resolver tests pass.

- [ ] **Step 4.3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add tests/resolver.test.ts
git commit -m "test(resolver): add alias and ambiguous resolution test cases"
```

---

## Task 5: Chain builder — BFS traversal

**Files:**
- Modify: `packages/legal-core/src/chain/buildChain.ts`
- Create: `tests/chain.test.ts`

The chain builder:
1. Parses the root citation string via `parseCitation`
2. If parse fails, returns a graph with a single unresolved node
3. BFS loop: dequeue → resolve → add to nodes → enqueue unvisited outbound citations
4. Cycle detection: `Set<string>` of visited `canonical_id`s
5. Guards checked per iteration: depth exceeded, node cap reached, timeout elapsed
6. Returns `ChainGraph` with all nodes, typed edges, unresolved list, timing

- [ ] **Step 5.1: Write failing chain builder tests**

Create `tests/chain.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { buildChain } from '../packages/legal-core/src/chain/buildChain.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'

type MockRow = Record<string, unknown>

function makeDb(plan: Record<string, { provision: MockRow | null; outbound: string[] }>): DbClient {
  return {
    query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      const id = params?.[0] as string | undefined
      if (!id) return Promise.resolve([])
      const entry = plan[id]
      if (!entry) return Promise.resolve([])
      if (sql.includes('FROM provisions')) {
        return Promise.resolve(entry.provision ? [entry.provision] : [])
      }
      if (sql.includes('FROM citations')) {
        return Promise.resolve(entry.outbound.map(to => ({ to_canonical_id: to })))
      }
      if (sql.includes('FROM aliases') || sql.includes('FROM ambiguous')) {
        return Promise.resolve([])
      }
      return Promise.resolve([])
    }),
  }
}

const provisionRow = (id: string) => ({
  canonical_id: id,
  text_content: `Text of ${id}`,
  ingestion_status: 'ingested',
  confidence: '1.00',
  provenance_source: 'test',
  ingested_at: '2026-01-01T00:00:00Z',
})

describe('buildChain', () => {
  it('single node — no outbound citations', async () => {
    const db = makeDb({
      'ny/penal/265.02': { provision: provisionRow('ny/penal/265.02'), outbound: [] },
    })
    const graph = await buildChain('N.Y. Penal Law § 265.02', db)
    expect(Object.keys(graph.nodes)).toHaveLength(1)
    expect(graph.nodes['ny/penal/265.02']?.status).toBe('ingested')
    expect(graph.edges).toHaveLength(0)
    expect(graph.truncated).toBe(false)
    expect(graph.depth_reached).toBe(0)
  })

  it('two-hop chain follows outbound citations', async () => {
    const db = makeDb({
      'ny/penal/265.02': { provision: provisionRow('ny/penal/265.02'), outbound: ['ny/penal/265.00'] },
      'ny/penal/265.00': { provision: provisionRow('ny/penal/265.00'), outbound: [] },
    })
    const graph = await buildChain('N.Y. Penal Law § 265.02', db, { maxDepth: 3 })
    expect(Object.keys(graph.nodes)).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({ from: 'ny/penal/265.02', to: 'ny/penal/265.00', depth: 1, resolved: true })
  })

  it('cycle detection — does not loop infinitely', async () => {
    const db = makeDb({
      'ny/penal/265.02': { provision: provisionRow('ny/penal/265.02'), outbound: ['ny/penal/265.00'] },
      'ny/penal/265.00': { provision: provisionRow('ny/penal/265.00'), outbound: ['ny/penal/265.02'] },
    })
    const graph = await buildChain('N.Y. Penal Law § 265.02', db, { maxDepth: 10 })
    expect(Object.keys(graph.nodes)).toHaveLength(2)
    expect(graph.truncated).toBe(false)
  })

  it('truncates at maxDepth', async () => {
    const db = makeDb({
      'ny/penal/265.02': { provision: provisionRow('ny/penal/265.02'), outbound: ['ny/penal/265.01'] },
      'ny/penal/265.01': { provision: provisionRow('ny/penal/265.01'), outbound: ['ny/penal/265.00'] },
      'ny/penal/265.00': { provision: provisionRow('ny/penal/265.00'), outbound: [] },
    })
    const graph = await buildChain('N.Y. Penal Law § 265.02', db, { maxDepth: 1 })
    expect(graph.truncated).toBe(true)
    expect(graph.truncation_reason).toBe('depth')
  })

  it('truncates at node cap', async () => {
    const plan: Record<string, { provision: MockRow | null; outbound: string[] }> = {}
    for (let i = 0; i < 10; i++) {
      plan[`ny/penal/${i}`] = {
        provision: provisionRow(`ny/penal/${i}`),
        outbound: i < 9 ? [`ny/penal/${i + 1}`] : [],
      }
    }
    const db = makeDb(plan)
    const graph = await buildChain('N.Y. Penal Law § 0', db, { maxDepth: 10, nodeCap: 3 })
    expect(graph.truncated).toBe(true)
    expect(graph.truncation_reason).toBe('node_cap')
    expect(Object.keys(graph.nodes).length).toBeLessThanOrEqual(3)
  })

  it('records unresolved citations', async () => {
    const db = makeDb({
      'ny/penal/265.02': { provision: provisionRow('ny/penal/265.02'), outbound: ['ny/penal/999.99'] },
      'ny/penal/999.99': { provision: null, outbound: [] },
    })
    const graph = await buildChain('N.Y. Penal Law § 265.02', db)
    expect(graph.unresolved).toContain('ny/penal/999.99')
  })
})
```

- [ ] **Step 5.2: Run tests to confirm they fail**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -80
```

Expected: chain tests fail with empty graph returns.

- [ ] **Step 5.3: Implement BFS chain builder**

Replace `packages/legal-core/src/chain/buildChain.ts` entirely:

```typescript
import type { ChainGraph, ChainNode, ChainEdge, BuildChainOptions } from '@statute-chain/types'
import { parseCitation } from '../parser/parseCitation.js'
import { resolveCitation } from '../resolver/resolveCitation.js'
import type { DbClient } from '../resolver/resolveCitation.js'

const DEFAULTS = {
  maxDepth: 3,
  nodeCap: 50,
  timeoutMs: 5000,
} as const

type QueueItem = { canonicalId: string; depth: number; fromId: string | null }

export async function buildChain(
  citation: string,
  db: DbClient,
  options: BuildChainOptions = {},
): Promise<ChainGraph> {
  const maxDepth = Math.min(Math.max(options.maxDepth ?? DEFAULTS.maxDepth, 1), 10)
  const nodeCap = options.nodeCap ?? DEFAULTS.nodeCap
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs
  const startTime = Date.now()

  const nodes: Record<string, ChainNode> = {}
  const edges: ChainEdge[] = []
  const unresolved: string[] = []
  const visited = new Set<string>()

  let truncated = false
  let truncation_reason: ChainGraph['truncation_reason'] = undefined
  let depth_reached = 0

  // Parse root
  const parsed = parseCitation(citation)
  if ('status' in parsed && parsed.status === 'parse_failed') {
    return {
      root: citation,
      nodes: {},
      edges: [],
      unresolved: [citation],
      truncated: false,
      depth_reached: 0,
      total_nodes: 0,
      query_ms: Date.now() - startTime,
    }
  }

  const rootId = 'canonical_id' in parsed && parsed.canonical_id
    ? parsed.canonical_id
    : parsed.raw

  const queue: QueueItem[] = [{ canonicalId: rootId, depth: 0, fromId: null }]

  while (queue.length > 0) {
    // Timeout guard
    if (Date.now() - startTime > timeoutMs) {
      truncated = true
      truncation_reason = 'timeout'
      break
    }

    // Node cap guard
    if (Object.keys(nodes).length >= nodeCap) {
      truncated = true
      truncation_reason = 'node_cap'
      break
    }

    const item = queue.shift()
    if (!item) break
    const { canonicalId, depth, fromId } = item

    // Cycle detection
    if (visited.has(canonicalId)) {
      if (fromId) {
        edges.push({ from: fromId, to: canonicalId, depth, resolved: canonicalId in nodes })
      }
      continue
    }
    visited.add(canonicalId)

    if (depth > depth_reached) depth_reached = depth

    // Resolve this node
    const resolved = await resolveCitation(
      { ...('canonical_id' in parsed ? parsed : { raw: canonicalId, format: 'structured' as const, confidence: 1.0, jurisdiction: 'unknown', code: 'unknown', section: canonicalId, subsection_path: [] }), canonical_id: canonicalId },
      db,
    )

    const node: ChainNode = { ...resolved, depth }
    nodes[canonicalId] = node

    if (resolved.status === 'not_ingested' || resolved.status === 'not_found') {
      unresolved.push(canonicalId)
    }

    if (fromId) {
      edges.push({ from: fromId, to: canonicalId, depth, resolved: resolved.status === 'ingested' || resolved.status === 'alias_resolved' })
    }

    // Depth guard — enqueue children only if under limit
    if (depth < maxDepth) {
      for (const outId of resolved.outbound_citations) {
        if (!visited.has(outId)) {
          queue.push({ canonicalId: outId, depth: depth + 1, fromId: canonicalId })
        }
      }
    } else if (resolved.outbound_citations.length > 0) {
      truncated = true
      truncation_reason = 'depth'
    }
  }

  return {
    root: rootId,
    nodes,
    edges,
    unresolved,
    truncated,
    truncation_reason,
    depth_reached,
    total_nodes: Object.keys(nodes).length,
    query_ms: Date.now() - startTime,
  }
}
```

- [ ] **Step 5.4: Run tests and confirm they pass**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1 | head -100
```

Expected: all chain tests pass.

- [ ] **Step 5.5: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add packages/legal-core/src/chain/buildChain.ts tests/chain.test.ts
git commit -m "feat(chain): implement BFS traversal with cycle detection, depth/node/timeout guards"
```

---

## Task 6: Seed script

**Files:**
- Modify: `scripts/seed-db.ts`

The seed script inserts a small deterministic set of provisions and cross-reference edges for local dev and tests. It must be idempotent (uses `INSERT ... ON CONFLICT DO NOTHING`).

Seed data:
- `ny/penal/265.02` references `ny/penal/265.00` (definitions)
- `ny/penal/265.00` has no outbound
- `federal/usc/42/1983` has no outbound
- `federal/usc/26/501` references `federal/usc/26/501c3`
- alias: `"IRC 501(c)"` → `federal/usc/26/501`

- [ ] **Step 6.1: Implement seed script**

Replace `scripts/seed-db.ts` entirely:

```typescript
import postgres from 'postgres'

const sql = postgres(process.env['DATABASE_URL'] ?? 'postgres://statute_chain:statute_chain@localhost:5432/statute_chain')

const provisions = [
  { canonical_id: 'ny/penal/265.02', jurisdiction: 'ny', code: 'penal', section: '265.02', text_content: 'Criminal possession of a weapon in the second degree. A person is guilty of criminal possession of a weapon in the second degree when...', ingestion_status: 'ingested', confidence: 1.0, provenance_source: 'ny-open-legislation' },
  { canonical_id: 'ny/penal/265.00', jurisdiction: 'ny', code: 'penal', section: '265.00', text_content: 'Definitions. As used in this article: 1. "Machine-gun" means any...', ingestion_status: 'ingested', confidence: 1.0, provenance_source: 'ny-open-legislation' },
  { canonical_id: 'federal/usc/42/1983', jurisdiction: 'federal', code: 'usc/42', section: '1983', text_content: 'Every person who, under color of any statute, ordinance, regulation, custom, or usage...', ingestion_status: 'ingested', confidence: 1.0, provenance_source: 'usc-xml' },
  { canonical_id: 'federal/usc/26/501', jurisdiction: 'federal', code: 'usc/26', section: '501', text_content: 'Exemption from tax on corporations, certain trusts, etc...', ingestion_status: 'ingested', confidence: 1.0, provenance_source: 'usc-xml' },
  { canonical_id: 'federal/usc/26/501c3', jurisdiction: 'federal', code: 'usc/26', section: '501c3', text_content: 'Corporations, and any community chest, fund, or foundation, organized and operated exclusively for religious, charitable, scientific...', ingestion_status: 'ingested', confidence: 1.0, provenance_source: 'usc-xml' },
]

const citations = [
  { from_canonical_id: 'ny/penal/265.02', to_canonical_id: 'ny/penal/265.00' },
  { from_canonical_id: 'federal/usc/26/501', to_canonical_id: 'federal/usc/26/501c3' },
]

const aliases = [
  { alias: 'IRC 501(c)', canonical_id: 'federal/usc/26/501' },
]

async function seed() {
  for (const p of provisions) {
    await sql`
      INSERT INTO provisions (canonical_id, jurisdiction, code, section, text_content, ingestion_status, confidence, provenance_source)
      VALUES (${p.canonical_id}, ${p.jurisdiction}, ${p.code}, ${p.section}, ${p.text_content}, ${p.ingestion_status}, ${p.confidence}, ${p.provenance_source})
      ON CONFLICT (canonical_id) DO NOTHING
    `
  }

  for (const c of citations) {
    await sql`
      INSERT INTO citations (from_canonical_id, to_canonical_id)
      VALUES (${c.from_canonical_id}, ${c.to_canonical_id})
      ON CONFLICT DO NOTHING
    `
  }

  for (const a of aliases) {
    await sql`
      INSERT INTO aliases (alias, canonical_id)
      VALUES (${a.alias}, ${a.canonical_id})
      ON CONFLICT (alias) DO NOTHING
    `
  }

  console.log('Seed complete.')
  await sql.end()
}

seed().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 6.2: Verify seed script compiles**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
npx tsx --noEmit scripts/seed-db.ts 2>&1 || true
```

Expected: no TypeScript errors (will fail on DB connection, that's fine).

- [ ] **Step 6.3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add scripts/seed-db.ts
git commit -m "feat(scripts): implement deterministic seed-db with fixtures and aliases"
```

---

## Task 7: API route

**Files:**
- Create: `apps/web/app/api/resolve/route.ts`

The API route is a thin adapter. It reads `citation` and `depth` from query params, calls `buildChain`, returns JSON. It must not contain resolver or parser logic.

- [ ] **Step 7.1: Create the API route**

Create `apps/web/app/api/resolve/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { buildChain } from '@statute-chain/legal-core'
import { getDb } from '@statute-chain/database'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const citation = req.nextUrl.searchParams.get('citation')
  if (!citation || citation.trim() === '') {
    return NextResponse.json({ error: 'citation query param is required' }, { status: 400 })
  }

  const rawDepth = req.nextUrl.searchParams.get('depth')
  const maxDepth = rawDepth
    ? Math.min(Math.max(parseInt(rawDepth, 10) || 3, 1), 10)
    : 3

  try {
    const db = getDb()
    const graph = await buildChain(citation.trim(), db as Parameters<typeof buildChain>[1], { maxDepth })
    return NextResponse.json(graph)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 7.2: Verify the file typechecks**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm typecheck 2>&1 | head -40
```

Expected: zero errors, or only errors in files not touched by this task.

- [ ] **Step 7.3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add apps/web/app/api/resolve/route.ts
git commit -m "feat(api): add GET /api/resolve?citation=&depth= route"
```

---

## Task 8: Web UI — citation input and chain display

**Files:**
- Modify: `apps/web/app/page.tsx`

The UI is a single page: a text input, a submit button, and a tree-like display of the chain graph. No depth control UI (depth is query param only). Use plain React state — no external state library.

The page calls `/api/resolve?citation=<input>` on submit, displays nodes grouped by depth, and shows `truncated` + `truncation_reason` as a warning banner.

- [ ] **Step 8.1: Replace page.tsx**

Replace `apps/web/app/page.tsx` entirely:

```tsx
'use client'

import { useState } from 'react'
import type { ChainGraph, ChainNode } from '@statute-chain/types'

type ApiError = { error: string }

function isApiError(x: unknown): x is ApiError {
  return typeof x === 'object' && x !== null && 'error' in x
}

function nodesByDepth(graph: ChainGraph): Map<number, ChainNode[]> {
  const map = new Map<number, ChainNode[]>()
  for (const node of Object.values(graph.nodes)) {
    const bucket = map.get(node.depth) ?? []
    bucket.push(node)
    map.set(node.depth, bucket)
  }
  return map
}

export default function Home() {
  const [citation, setCitation] = useState('')
  const [graph, setGraph] = useState<ChainGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setGraph(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/resolve?citation=${encodeURIComponent(citation)}`)
      const data: unknown = await res.json()
      if (!res.ok || isApiError(data)) {
        setError(isApiError(data) ? data.error : 'Unknown error')
      } else {
        setGraph(data as ChainGraph)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const depthMap = graph ? nodesByDepth(graph) : null

  return (
    <main style={{ padding: 40, fontFamily: 'monospace', maxWidth: 800 }}>
      <h1 style={{ marginBottom: 4 }}>Statute Chain</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Paste a citation. Expand the chain.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={citation}
          onChange={e => setCitation(e.target.value)}
          placeholder="N.Y. Penal Law § 265.02"
          style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button
          type="submit"
          disabled={loading || !citation.trim()}
          style={{ padding: '8px 16px', fontSize: 14, cursor: 'pointer' }}
        >
          {loading ? 'Resolving…' : 'Resolve'}
        </button>
      </form>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fcc', padding: 12, borderRadius: 4, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {graph && (
        <div>
          {graph.truncated && (
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: 10, borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
              Chain truncated — reason: <strong>{graph.truncation_reason}</strong>. Nodes: {graph.total_nodes}, depth reached: {graph.depth_reached}.
            </div>
          )}

          <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
            {graph.total_nodes} node{graph.total_nodes !== 1 ? 's' : ''} · {graph.query_ms}ms
          </div>

          {depthMap && Array.from(depthMap.entries()).sort(([a], [b]) => a - b).map(([depth, nodes]) => (
            <div key={depth} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#555' }}>Depth {depth}</div>
              {nodes.map(node => (
                <div key={node.canonical_id} style={{ border: '1px solid #e0e0e0', borderRadius: 4, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <code style={{ fontSize: 13, fontWeight: 'bold' }}>{node.canonical_id}</code>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: node.status === 'ingested' ? '#f0fff0' : '#fff0f0', border: `1px solid ${node.status === 'ingested' ? '#90ee90' : '#fcc'}` }}>
                      {node.status}
                    </span>
                    <span style={{ fontSize: 11, color: '#999' }}>conf: {node.confidence.toFixed(2)}</span>
                  </div>
                  {node.text && (
                    <div style={{ fontSize: 13, color: '#333', marginTop: 4, lineHeight: 1.5 }}>
                      {node.text.length > 200 ? node.text.slice(0, 200) + '…' : node.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {graph.unresolved.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#999' }}>Unresolved</div>
              {graph.unresolved.map(id => (
                <code key={id} style={{ display: 'block', fontSize: 13, color: '#999', marginBottom: 4 }}>{id}</code>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 8.2: Verify typecheck**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm typecheck 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 8.3: Commit**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add apps/web/app/page.tsx
git commit -m "feat(ui): add citation input form and chain graph display"
```

---

## Task 9: Run all tests and typecheck

**Files:** none modified — verification only.

- [ ] **Step 9.1: Run full test suite**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm test -- --reporter=verbose 2>&1
```

Expected: all tests pass, zero failures.

- [ ] **Step 9.2: Run typecheck across all packages**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
pnpm typecheck 2>&1
```

Expected: zero TypeScript errors.

- [ ] **Step 9.3: Commit if any fixes were needed**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/statute-chain-scaffold"
git add -p
git commit -m "fix: typecheck and test cleanup"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| Structured federal USC citations | Task 1 |
| Structured NY statute citations | Task 2 |
| Informal citations flagged at confidence 0.6 | Task 1 |
| `canonical_id` optional, built when unambiguous | Task 1 |
| `subsection_path` parsed separately | Task 1 |
| Resolver: direct canonical_id lookup | Task 3 |
| Resolver: alias resolution | Task 3, 4 |
| Resolver: ambiguous → candidates | Task 3, 4 |
| Resolver: not_ingested status | Task 3 |
| Chain BFS traversal | Task 5 |
| Cycle detection | Task 5 |
| Depth guard (default 3, min 1, max 10) | Task 5 |
| Node cap guard (50) | Task 5 |
| Timeout guard (5000ms) | Task 5 |
| `truncated` + `truncation_reason` on early exit | Task 5 |
| `unresolved` list | Task 5 |
| `ChainGraph.query_ms` | Task 5 |
| Seed script with fixtures + aliases | Task 6 |
| `GET /api/resolve?citation=&depth=` | Task 7 |
| `?depth` clamped [1,10], default 3 | Task 7 |
| 400 for missing citation, 500 for failures | Task 7 |
| Web UI: citation input + chain display | Task 8 |
| Truncation warning banner | Task 8 |
| No auth, no billing, no bulk extraction | — (excluded by design) |

All spec requirements are covered.
