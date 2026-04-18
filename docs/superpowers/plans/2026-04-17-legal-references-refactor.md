# Legal References Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `citations` DB table to `legal_references`, replace the `outbound_citations` field on `ResolvedProvision` with `legal_relationships`, add a shared relationship write boundary with runtime validation, expand relationship/source-method enums, and update all consuming code and tests.

**Architecture:** Single-source-of-truth migration — `ALTER TABLE citations RENAME TO legal_references`. No parallel tables. A Neon branch snapshot is taken before migration. All write paths route through a shared `upsertRelationship()` helper that calls `validateRelationship()` before any INSERT; ingest, manual, import, and future inference paths all use this boundary so no row can be inserted without validation.

**Tech Stack:** TypeScript 5, PostgreSQL (Neon serverless), Next.js 15, Vitest, `tsx` for scripts, `@statute-chain/types` / `@statute-chain/legal-core` monorepo packages.

---

## Migration Strategy: Option A (single-source-of-truth)

**Chosen strategy:** `ALTER TABLE citations RENAME TO legal_references`

Rationale: a rename is atomic, instant, and leaves no period where two tables can diverge. There are no parallel tables, no write-freeze ambiguity, and no cleanup step needed.

**Compatibility layer:** Immediately after the rename, `CREATE OR REPLACE VIEW citations AS SELECT * FROM legal_references` is created as a temporary read-compat bridge. Legacy read queries (SELECT) against `citations` continue to work transparently during the deploy window. Legacy writes (INSERT/UPDATE/DELETE) against the view will fail at the DB level — Postgres does not allow writes to a plain view without an INSTEAD OF trigger, which we intentionally do not add. This means any stale write path surfaces immediately as an error rather than silently diverging. The view is dropped once all code is confirmed clean.

**Deploy order:**
1. Take Neon branch snapshot (rollback point).
2. Run `_migrate-rename-citations.ts` — renames the table, creates compat view.
3. Deploy new application code.
4. Run smoke tests (listed in go/no-go checklist below).
5. Run `_migrate-drop-compat-view.ts` — drops the compat view.

**Rollback:** Restore from the Neon branch snapshot taken in step 1. The rename script does not drop `citations` — it only renames — so pre-deploy state is recoverable via snapshot.

---

## Shared Write Boundary

All relationship rows are written through a single function: `upsertRelationship()` in `packages/legal-core/src/resolver/upsertRelationship.ts`.

- Takes a `DbClient` and a relationship payload.
- Calls `validateRelationship()` before every INSERT.
- Issues `INSERT INTO legal_references ... ON CONFLICT DO UPDATE` so re-ingesting or importing a relationship refreshes its metadata (type, source, confidence, explanation) rather than silently leaving a stale row.
- `ingestNyProvisions`, `ingestFederalProvisions`, future manual-import paths, and future inference jobs all call `upsertRelationship()` — none issue their own `INSERT INTO legal_references` directly.

This means validation is structurally impossible to bypass: there is no second write path.

---

## File Structure

### New files
| Path | Responsibility |
|------|----------------|
| `packages/legal-core/src/resolver/validateRelationship.ts` | Rule function — enforces `depends_on` constraints |
| `packages/legal-core/src/resolver/validateRelationship.test.ts` | Unit tests for validation rules |
| `packages/legal-core/src/resolver/upsertRelationship.ts` | Shared write boundary — calls validate then INSERT |
| `packages/legal-core/src/resolver/upsertRelationship.test.ts` | Unit tests for the write boundary |
| `scripts/_migrate-rename-citations.ts` | Renames `citations` → `legal_references`, creates compat view |
| `scripts/_migrate-drop-compat-view.ts` | Drops the `citations` compat view |
| `scripts/_rollback-legal-references.ts` | Documents rollback path (Neon branch restore) |
| `docs/SCHEMA.md` | Human-readable final-state schema reference |

### Modified files
| Path | Change summary |
|------|----------------|
| `packages/types/src/index.ts` | Expand enums, remove `outbound_citations` from `ResolvedProvision` |
| `packages/legal-core/src/resolver/resolveCitation.ts` | Query `legal_references`, remove `outbound_citations` |
| `packages/legal-core/src/resolver/resolveCitation.test.ts` | Update SQL check, mock shape, assertions |
| `packages/legal-core/src/chain/buildChain.ts` | Remove `outbound_citations` fallback |
| `packages/legal-core/src/chain/buildChain.test.ts` | Update `FakeProvision`, `provision()`, SQL check |
| `packages/legal-core/src/ingest/ny.ts` | Remove inline INSERT, call `upsertRelationship()`, `citations→references` in `IngestResult` |
| `packages/legal-core/src/ingest/ny.test.ts` | Update SQL checks, assertions |
| `packages/legal-core/src/ingest/federal.ts` | Same as ny.ts |
| `packages/legal-core/src/ingest/federal.test.ts` | Update SQL checks, assertions |
| `tests/resolver.test.ts` | Update mock rows, assertions |
| `apps/web/app/api/corpus/route.ts` | Query `legal_references`, rename `citationsTotal→referencesTotal` |
| `apps/web/app/api/query/route.test.ts` | Remove `outbound_citations` from `mockResolved` |
| `apps/web/app/law-navigator/page.tsx` | `outbound_citations.length → legal_relationships.length` |
| `packages/database/schema.sql` | Final-state schema only: `legal_references`, no `citations`, no transitional comments |
| `scripts/ingest-ny.ts` | `result.citations → result.references` in log output |
| `scripts/ingest-federal.ts` | Same |
| `scripts/ingest-missing.ts` | Same |

---

## Task 1: Expand types — enums and remove `outbound_citations`

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Update `LegalRelationshipType`**

```typescript
// BEFORE:
export type LegalRelationshipType =
  | 'references' | 'defines' | 'uses_term' | 'depends_on' | 'incorporates'

// AFTER:
export type LegalRelationshipType =
  | 'references'
  | 'defines'
  | 'uses_term'
  | 'depends_on'
  | 'incorporates'
  | 'amends'
  | 'repeals'
```

- [ ] **Step 2: Update `LegalRelationshipSourceMethod`**

```typescript
// BEFORE:
export type LegalRelationshipSourceMethod =
  | 'parser' | 'definition_extractor' | 'manual'

// AFTER:
export type LegalRelationshipSourceMethod =
  | 'parser'
  | 'definition_extractor'
  | 'manual'
  | 'inferred'
  | 'imported'
```

- [ ] **Step 3: Remove `outbound_citations` from `ResolvedProvision`**

```typescript
// BEFORE:
export type ResolvedProvision = {
  canonical_id: string
  status: IngestionStatus
  confidence: number
  text?: string
  label?: string
  resolved_from?: string
  candidates?: string[]
  article_sections?: string[]
  outbound_citations: string[]        // backward compat — TO BE REMOVED
  legal_relationships: LegalRelationship[]
  provenance: { source: string; ingested_at?: string }
}

// AFTER (outbound_citations removed entirely):
export type ResolvedProvision = {
  canonical_id: string
  status: IngestionStatus
  confidence: number
  text?: string
  label?: string
  resolved_from?: string
  candidates?: string[]
  article_sections?: string[]
  legal_relationships: LegalRelationship[]
  provenance: { source: string; ingested_at?: string }
}
```

- [ ] **Step 4: Verify compile errors surface (expected)**

```bash
cd /Users/laurenproctor/Documents/Claude\ Code/statute-chain-scaffold
npx tsc --noEmit 2>&1 | head -60
```

Expected: errors referencing `outbound_citations` across multiple files — correct. Fix them in subsequent tasks.

---

## Task 2: Add `validateRelationship` (TDD)

**Files:**
- Create: `packages/legal-core/src/resolver/validateRelationship.ts`
- Create: `packages/legal-core/src/resolver/validateRelationship.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/legal-core/src/resolver/validateRelationship.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateRelationship } from './validateRelationship.js'
import type { LegalRelationship } from '@statute-chain/types'

function rel(overrides: Partial<LegalRelationship>): LegalRelationship {
  return {
    target_id: 'ny/penal/220.00',
    relationship_type: 'references',
    source_method: 'parser',
    explanation: 'Referenced directly in text',
    ...overrides,
  }
}

describe('validateRelationship', () => {
  it('passes for a normal references edge', () => {
    expect(() => validateRelationship(rel({}))).not.toThrow()
  })

  it('passes for depends_on with inferred source and explanation', () => {
    expect(() =>
      validateRelationship(
        rel({
          relationship_type: 'depends_on',
          source_method: 'inferred',
          explanation: 'Definition required for interpretation',
        }),
      ),
    ).not.toThrow()
  })

  it('throws for depends_on with non-inferred source_method', () => {
    expect(() =>
      validateRelationship(
        rel({
          relationship_type: 'depends_on',
          source_method: 'parser',
          explanation: 'some explanation',
        }),
      ),
    ).toThrow(/depends_on.*inferred/)
  })

  it('throws for depends_on with missing explanation', () => {
    expect(() =>
      validateRelationship(
        rel({ relationship_type: 'depends_on', source_method: 'inferred', explanation: '' }),
      ),
    ).toThrow(/explanation/)
  })

  it('throws for depends_on with whitespace-only explanation', () => {
    expect(() =>
      validateRelationship(
        rel({ relationship_type: 'depends_on', source_method: 'inferred', explanation: '   ' }),
      ),
    ).toThrow(/explanation/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run packages/legal-core/src/resolver/validateRelationship.test.ts 2>&1
```

Expected: FAIL — `validateRelationship` not found.

- [ ] **Step 3: Implement**

Create `packages/legal-core/src/resolver/validateRelationship.ts`:

```typescript
import type { LegalRelationship } from '@statute-chain/types'

export function validateRelationship(rel: LegalRelationship): void {
  if (rel.relationship_type === 'depends_on') {
    if (rel.source_method !== 'inferred') {
      throw new Error(
        `depends_on edge to ${rel.target_id} requires source_method 'inferred', got '${rel.source_method}'`,
      )
    }
    if (!rel.explanation?.trim()) {
      throw new Error(
        `depends_on edge to ${rel.target_id} requires a non-empty explanation`,
      )
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/legal-core/src/resolver/validateRelationship.test.ts 2>&1
```

Expected: 5 tests PASS.

---

## Task 3: Add shared `upsertRelationship` write boundary (TDD)

**Files:**
- Create: `packages/legal-core/src/resolver/upsertRelationship.ts`
- Create: `packages/legal-core/src/resolver/upsertRelationship.test.ts`

- [ ] **Step 1: Define the payload type and write failing tests**

Create `packages/legal-core/src/resolver/upsertRelationship.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { upsertRelationship } from './upsertRelationship.js'
import type { DbClient } from './resolveCitation.js'

function makeDb() {
  const calls: { sql: string; params: unknown[] }[] = []
  const db: DbClient = {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      calls.push({ sql, params: params ?? [] })
      return []
    },
  }
  return { db, calls }
}

describe('upsertRelationship', () => {
  it('calls INSERT ... ON CONFLICT DO UPDATE INTO legal_references with correct columns', async () => {
    const { db, calls } = makeDb()
    await upsertRelationship(
      { from_canonical_id: 'ny/penal/220.16', target_id: 'ny/penal/220.00',
        relationship_type: 'references', source_method: 'parser',
        explanation: 'Referenced directly in text' },
      db,
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]!.sql).toMatch(/INSERT INTO legal_references/)
    expect(calls[0]!.params).toContain('ny/penal/220.16')
    expect(calls[0]!.params).toContain('ny/penal/220.00')
  })

  it('throws before INSERT when validateRelationship fails', async () => {
    const { db, calls } = makeDb()
    await expect(
      upsertRelationship(
        { from_canonical_id: 'ny/penal/220.16', target_id: 'ny/penal/220.00',
          relationship_type: 'depends_on', source_method: 'parser',
          explanation: 'some reason' },
        db,
      ),
    ).rejects.toThrow(/depends_on.*inferred/)
    expect(calls).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run packages/legal-core/src/resolver/upsertRelationship.test.ts 2>&1
```

Expected: FAIL — `upsertRelationship` not found.

- [ ] **Step 3: Implement**

Create `packages/legal-core/src/resolver/upsertRelationship.ts`:

```typescript
import type { LegalRelationship } from '@statute-chain/types'
import type { DbClient } from './resolveCitation.js'
import { validateRelationship } from './validateRelationship.js'

export type RelationshipPayload = LegalRelationship & {
  from_canonical_id: string
}

export async function upsertRelationship(
  payload: RelationshipPayload,
  db: DbClient,
): Promise<void> {
  validateRelationship(payload)
  await db.query(
    `INSERT INTO legal_references
       (from_canonical_id, to_canonical_id, relationship_type, source_method, confidence, explanation)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (from_canonical_id, to_canonical_id) DO UPDATE SET
       relationship_type = EXCLUDED.relationship_type,
       source_method     = EXCLUDED.source_method,
       confidence        = EXCLUDED.confidence,
       explanation       = EXCLUDED.explanation`,
    [
      payload.from_canonical_id,
      payload.target_id,
      payload.relationship_type,
      payload.source_method,
      payload.confidence ?? null,
      payload.explanation,
    ],
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run packages/legal-core/src/resolver/upsertRelationship.test.ts 2>&1
```

Expected: 2 tests PASS.

---

## Task 4: Update `resolveCitation.ts` and its tests

**Files:**
- Modify: `packages/legal-core/src/resolver/resolveCitation.ts`
- Modify: `packages/legal-core/src/resolver/resolveCitation.test.ts`

- [ ] **Step 1: Update `resolveCitation.ts`**

1. Rename internal type `CitationRow` → `ReferenceRow`.
2. Change SQL `FROM citations` → `FROM legal_references`.
3. Remove all lines that build or return `outbound_citations`.

The query block (around line 95–105):
```typescript
// BEFORE:
const citations = await db.query<CitationRow>(
  'SELECT to_canonical_id, relationship_type, source_method, confidence, explanation FROM citations WHERE from_canonical_id = $1',
  [canonicalId],
)
const legal_relationships = citations.map(buildRelationship)
const outbound_citations = citations.map((c) => c.to_canonical_id)

// AFTER:
const references = await db.query<ReferenceRow>(
  'SELECT to_canonical_id, relationship_type, source_method, confidence, explanation FROM legal_references WHERE from_canonical_id = $1',
  [canonicalId],
)
const legal_relationships = references.map(buildRelationship)
```

Remove `outbound_citations` from every return statement.

- [ ] **Step 2: Update `resolveCitation.test.ts`**

Three changes:

```typescript
// Change 1 — table key in makeDb mock:
citations?: Record<string, unknown>[]
// →
legal_references?: Record<string, unknown>[]

// Change 2 — SQL detection:
if (sql.includes('FROM citations')) {
// →
if (sql.includes('FROM legal_references')) {

// Change 3 — assertions:
expect(result.outbound_citations).toEqual(['federal/usc/26/502', 'federal/usc/26/170'])
// →
expect(result.legal_relationships.map(r => r.target_id)).toEqual(['federal/usc/26/502', 'federal/usc/26/170'])
```

- [ ] **Step 3: Run resolver tests**

```bash
npx vitest run packages/legal-core/src/resolver/resolveCitation.test.ts 2>&1
```

Expected: all PASS.

---

## Task 5: Update `buildChain.ts` and its tests

**Files:**
- Modify: `packages/legal-core/src/chain/buildChain.ts`
- Modify: `packages/legal-core/src/chain/buildChain.test.ts`

- [ ] **Step 1: Remove `outbound_citations` fallback in `buildChain.ts`**

Find the block:
```typescript
const relationships = resolved.legal_relationships.length > 0
  ? resolved.legal_relationships
  : resolved.outbound_citations.map(id => ({
      target_id: id,
      relationship_type: 'references' as const,
      source_method: 'parser' as const,
      explanation: 'Referenced directly in text',
    }))
```

Replace with:
```typescript
const relationships = resolved.legal_relationships
```

- [ ] **Step 2: Update `buildChain.test.ts`**

**Change 1** — `FakeProvision` type:
```typescript
// BEFORE:
type FakeProvision = Omit<ResolvedProvision, 'outbound_citations'> & {
  outbound_citations: string[]
}
// AFTER:
type FakeProvision = ResolvedProvision
```

**Change 2** — `provision()` helper:
```typescript
// BEFORE:
function provision(id: string, outbound: string[] = [], ...): FakeProvision {
  return { ..., outbound_citations: outbound, legal_relationships: [], ... }
}

// AFTER:
function provision(id: string, outbound: string[] = [], ...): FakeProvision {
  return {
    ...,
    legal_relationships: outbound.map((target_id) => ({
      target_id,
      relationship_type: 'references' as const,
      source_method: 'parser' as const,
      explanation: 'Referenced directly in text',
    })),
    ...
  }
}
```

**Change 3** — DB mock SQL check and return shape:
```typescript
// SQL check:
if (sql.includes('FROM citations')) {
// →
if (sql.includes('FROM legal_references')) {

// Return shape:
// BEFORE (approximate):
return provisions[p]?.outbound_citations?.map(id => ({ from_canonical_id: p, to_canonical_id: id })) as T[]

// AFTER:
return (provisions[p]?.legal_relationships ?? []).map((rel) => ({
  from_canonical_id: p,
  to_canonical_id: rel.target_id,
  relationship_type: rel.relationship_type,
  source_method: rel.source_method,
  confidence: rel.confidence ?? null,
  explanation: rel.explanation,
})) as T[]
```

- [ ] **Step 3: Run buildChain tests**

```bash
npx vitest run packages/legal-core/src/chain/buildChain.test.ts 2>&1
```

Expected: all PASS.

---

## Task 6: Update ingest (`ny.ts`, `federal.ts`) and their tests

**Files:**
- Modify: `packages/legal-core/src/ingest/ny.ts`
- Modify: `packages/legal-core/src/ingest/ny.test.ts`
- Modify: `packages/legal-core/src/ingest/federal.ts`
- Modify: `packages/legal-core/src/ingest/federal.test.ts`

- [ ] **Step 1: Update `IngestResult` type**

In whichever file defines `IngestResult` (check `ny.ts` and `federal.ts`):
```typescript
// BEFORE:
export type IngestResult = { provisions: number; citations: number; errors: string[] }
// AFTER:
export type IngestResult = { provisions: number; references: number; errors: string[] }
```

- [ ] **Step 2: Refactor `ny.ts` to use `upsertRelationship`**

Remove the inline `INSERT INTO citations` (or any current INSERT). Import and call `upsertRelationship` instead:

```typescript
import { upsertRelationship } from '../resolver/upsertRelationship.js'

// Replace the existing upsertCitation / INSERT block with:
for (const rel of relationships) {
  await upsertRelationship({ from_canonical_id: canonicalId, ...rel }, db)
  result.references++
}
```

No direct `INSERT INTO` in `ny.ts` after this change.

- [ ] **Step 3: Refactor `federal.ts` the same way**

Same pattern as Step 2.

- [ ] **Step 4: Update `ny.test.ts`**

```typescript
// SQL checks:
'INSERT INTO citations' → 'INSERT INTO legal_references'
'FROM citations'        → 'FROM legal_references'

// Assertions:
result.citations          → result.references
resolved.outbound_citations → resolved.legal_relationships.map(r => r.target_id)
```

- [ ] **Step 5: Update `federal.test.ts`**

Same changes as Step 4. Additionally, the mock return shape for `legal_references` queries must include full relationship fields:
```typescript
return stored.map(row => ({
  to_canonical_id: row.to_canonical_id,
  relationship_type: row.relationship_type ?? 'references',
  source_method: row.source_method ?? 'parser',
  confidence: row.confidence ?? null,
  explanation: row.explanation ?? 'Referenced directly in text',
})) as T[]
```

Assertions (around lines 296, 310):
```typescript
expect(resolved.outbound_citations).toContain('federal/usc/21/812')
// →
expect(resolved.legal_relationships.map(r => r.target_id)).toContain('federal/usc/21/812')
```

- [ ] **Step 6: Run ingest tests**

```bash
npx vitest run packages/legal-core/src/ingest/ 2>&1
```

Expected: all PASS.

---

## Task 7: Update integration tests, web routes, UI, and scripts

**Files:**
- Modify: `tests/resolver.test.ts`
- Modify: `apps/web/app/api/corpus/route.ts`
- Modify: `apps/web/app/api/query/route.test.ts`
- Modify: `apps/web/app/law-navigator/page.tsx`
- Modify: `scripts/ingest-ny.ts`, `scripts/ingest-federal.ts`, `scripts/ingest-missing.ts`

- [ ] **Step 1: Update `tests/resolver.test.ts`**

Mock rows for the `legal_references` query need full fields:
```typescript
// BEFORE:
[{ to_canonical_id: 'ny/penal/265.00' }]

// AFTER:
[{
  to_canonical_id: 'ny/penal/265.00',
  relationship_type: 'references',
  source_method: 'parser',
  confidence: null,
  explanation: 'Referenced directly in text',
}]
```

Assertions:
```typescript
expect(result.outbound_citations).toEqual(['ny/penal/265.00'])
// →
expect(result.legal_relationships.map(r => r.target_id)).toEqual(['ny/penal/265.00'])
```

- [ ] **Step 2: Update corpus route**

```typescript
// SQL:
`SELECT COUNT(*)::text AS count FROM citations`
// →
`SELECT COUNT(*)::text AS count FROM legal_references`

// Variable:
citationsTotal → referencesTotal  (including JSON response key)
```

- [ ] **Step 3: Update query route test**

```typescript
// Remove from mockResolved:
outbound_citations: [],
```

- [ ] **Step 4: Update law-navigator UI**

```typescript
// BEFORE:
{data.outbound_citations.length} linked authorit{data.outbound_citations.length !== 1 ? 'ies' : 'y'}

// AFTER:
{data.legal_relationships.length} linked authorit{data.legal_relationships.length !== 1 ? 'ies' : 'y'}
```

- [ ] **Step 5: Update CLI scripts**

In `scripts/ingest-ny.ts`, `ingest-federal.ts`, `ingest-missing.ts`:
```typescript
result.citations → result.references   (in log output strings)
```

- [ ] **Step 6: Run all tests and TypeScript check**

```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
```

Expected: zero test failures, zero TypeScript errors.

---

## Task 8: Write migration scripts and update schema + docs

**Files:**
- Create: `scripts/_migrate-rename-citations.ts`
- Create: `scripts/_migrate-drop-compat-view.ts`
- Create: `scripts/_rollback-legal-references.ts`
- Modify: `packages/database/schema.sql`
- Create: `docs/SCHEMA.md`

- [ ] **Step 1: Write `_migrate-rename-citations.ts`**

Create `scripts/_migrate-rename-citations.ts`:

```typescript
/**
 * Migration: rename citations → legal_references (single-source-of-truth).
 * Creates a read-only compat view `citations` pointing to the new table.
 *
 * Run BEFORE deploying new code.
 * After deploy is confirmed stable, run _migrate-drop-compat-view.ts.
 *
 * Usage: npx tsx scripts/_migrate-rename-citations.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'

async function main() {
  const db = getDbClient()

  // Pre-flight: citations must be a real table
  const [citationsCheck] = await db.query<{ table_type: string }>(
    `SELECT table_type FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'citations'`,
  )
  if (!citationsCheck) {
    console.error('citations table not found — aborting')
    process.exit(1)
  }
  if (citationsCheck.table_type !== 'BASE TABLE') {
    console.error(`citations exists but is a ${citationsCheck.table_type}, not a BASE TABLE — aborting`)
    process.exit(1)
  }

  // Pre-flight: legal_references must not exist
  const [lrCheck] = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'legal_references'
    ) AS exists`,
  )
  if (lrCheck?.exists) {
    console.log('legal_references already exists — migration may have already run. Aborting.')
    process.exit(1)
  }

  // Snapshot row count
  const [countRow] = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM citations')
  const rowCount = parseInt(countRow?.count ?? '0', 10)
  console.log(`citations row count before rename: ${rowCount}`)

  // Execute rename + compat view creation atomically
  console.log('Renaming citations → legal_references and creating compat view…')
  await db.query(`
    BEGIN;
    ALTER TABLE citations RENAME TO legal_references;
    CREATE VIEW citations AS SELECT * FROM legal_references;
    COMMIT;
  `)

  // Post-flight: verify row count
  const [newCount] = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM legal_references')
  const actualCount = parseInt(newCount?.count ?? '-1', 10)
  if (actualCount !== rowCount) {
    console.error(`Row count mismatch after rename: expected ${rowCount}, got ${actualCount}`)
    process.exit(1)
  }

  // Post-flight: verify index is present
  const plan = await db.query<{ 'QUERY PLAN': string }>(
    `EXPLAIN SELECT * FROM legal_references WHERE from_canonical_id = 'test'`,
  )
  const planText = plan.map((r) => r['QUERY PLAN']).join('\n')
  if (!planText.includes('Index') && actualCount > 100) {
    console.warn('Warning: query plan does not show index scan — verify indexes')
    console.warn(planText)
  }

  console.log(`✓ Renamed. legal_references has ${actualCount} rows.`)
  console.log('Compat view citations created. Deploy new code, then run _migrate-drop-compat-view.ts.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Write `_migrate-drop-compat-view.ts`**

Create `scripts/_migrate-drop-compat-view.ts`:

```typescript
/**
 * Migration cleanup: drop the citations compat view.
 *
 * Run AFTER new code is deployed and confirmed stable.
 *
 * Usage: npx tsx scripts/_migrate-drop-compat-view.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'

async function main() {
  const db = getDbClient()

  const [viewCheck] = await db.query<{ table_type: string }>(
    `SELECT table_type FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'citations'`,
  )
  if (!viewCheck) {
    console.log('citations view not found — nothing to do')
    process.exit(0)
  }
  if (viewCheck.table_type !== 'VIEW') {
    console.error(`citations exists as ${viewCheck.table_type}, not VIEW — refusing to drop`)
    process.exit(1)
  }

  await db.query('DROP VIEW citations')
  console.log('✓ citations compat view dropped')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Write `_rollback-legal-references.ts`**

Create `scripts/_rollback-legal-references.ts`:

```typescript
/**
 * Rollback guide for the legal_references rename.
 *
 * This script documents the rollback procedure and checks current state.
 * Actual rollback is performed via Neon branch restore — not via this script.
 *
 * Rollback is only safe BEFORE _migrate-drop-compat-view.ts has been run.
 * After the compat view is dropped and new code is stable, the rollback
 * window is closed.
 */
import { getDbClient } from '../apps/web/lib/db.js'

async function main() {
  const db = getDbClient()

  const tableExists = async (name: string, type: string): Promise<boolean> => {
    const [row] = await db.query<{ table_type: string }>(
      `SELECT table_type FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [name],
    )
    return row?.table_type === type
  }

  const hasLrTable = await tableExists('legal_references', 'BASE TABLE')
  const hasCitationsView = await tableExists('citations', 'VIEW')
  const hasCitationsTable = await tableExists('citations', 'BASE TABLE')

  console.log('Current state:')
  console.log(`  legal_references (BASE TABLE): ${hasLrTable ? '✓ present' : '✗ absent'}`)
  console.log(`  citations (VIEW):              ${hasCitationsView ? '✓ present (compat window open)' : '✗ absent'}`)
  console.log(`  citations (BASE TABLE):        ${hasCitationsTable ? '✓ present (pre-migration)' : '✗ absent'}`)

  if (hasCitationsTable) {
    console.log('\nPre-migration state detected — migration has not run yet.')
    return
  }

  if (hasLrTable && hasCitationsView) {
    console.log('\nRollback window is OPEN.')
    console.log('To rollback: restore the Neon branch snapshot taken before migration.')
    console.log('Do NOT attempt a manual rename — restoring from snapshot is the safe path.')
    return
  }

  if (hasLrTable && !hasCitationsView) {
    console.log('\nRollback window is CLOSED (compat view already dropped).')
    console.log('New code is considered stable. Rollback requires a full restore from snapshot.')
    return
  }

  console.error('\nUnexpected state — investigate manually.')
  process.exit(1)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 4: Update `schema.sql` to final state only**

In `packages/database/schema.sql`, replace any `citations` table definition with `legal_references`. The schema must represent the final target state only — no commented-out old table, no transitional notes:

```sql
-- typed edges between provisions
create table if not exists legal_references (
  from_canonical_id   text not null references provisions(canonical_id),
  to_canonical_id     text not null,
  depth_found         int,
  relationship_type   text not null default 'references',
  source_method       text not null default 'parser',
  confidence          numeric(4,3),
  explanation         text not null default 'Referenced directly in text',
  primary key (from_canonical_id, to_canonical_id)
);
```

Remove any `citations` table block from `schema.sql`. Migration history belongs in migration scripts.

- [ ] **Step 5: Create `docs/SCHEMA.md`**

Create `docs/SCHEMA.md`:

```markdown
# Schema

## provisions
One row per ingested legal authority. Primary key: `canonical_id` (e.g. `ny/penal/220.16`).

## legal_references
Typed, directed edges between provisions. Primary key: `(from_canonical_id, to_canonical_id)`.

| Column | Type | Description |
|--------|------|-------------|
| `from_canonical_id` | text | Source provision (FK → provisions) |
| `to_canonical_id` | text | Target provision (may not be ingested yet) |
| `relationship_type` | text | `references \| defines \| uses_term \| depends_on \| incorporates \| amends \| repeals` |
| `source_method` | text | `parser \| definition_extractor \| manual \| inferred \| imported` |
| `confidence` | numeric(4,3) | Optional confidence score (0–1) |
| `explanation` | text | Human-readable reason for the edge |

All writes go through `upsertRelationship()` in `packages/legal-core/src/resolver/upsertRelationship.ts`.

## aliases
Maps alternate canonical IDs to canonical IDs.

## ambiguous_citations
Stores unresolvable references with candidate lists.

## missing_nodes
Priority queue of referenced-but-not-ingested `canonical_id` values.
```

- [ ] **Step 6: Run full test suite and TypeScript check**

```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
```

Expected: zero failures, zero errors.

---

## Commit Plan

Five commits — one per logical concern:

| # | Commit message | Contents |
|---|----------------|----------|
| 1 | `feat(types): expand enums, remove outbound_citations; add validateRelationship + upsertRelationship` | `packages/types/src/index.ts`, `validateRelationship.ts + test`, `upsertRelationship.ts + test` |
| 2 | `feat(resolver+chain): query legal_references, remove outbound_citations fallback` | `resolveCitation.ts + test`, `buildChain.ts + test` |
| 3 | `feat(ingest): route writes through upsertRelationship; update tests` | `ingest/ny.ts + test`, `ingest/federal.ts + test`, `tests/resolver.test.ts` |
| 4 | `feat(web+scripts): update routes, UI, and CLI scripts for legal_references` | `api/corpus/route.ts`, `api/query/route.test.ts`, `law-navigator/page.tsx`, `scripts/ingest-*.ts` |
| 5 | `feat(migration+docs): rename migration scripts, final-state schema.sql, SCHEMA.md` | migration scripts, `schema.sql`, `docs/SCHEMA.md` |

---

## Go/No-Go Deployment Checklist

Do not run migration scripts until every item below is checked.

### Pre-deploy gates
- [ ] All tests pass: `npx vitest run` — zero failures
- [ ] Full TypeScript check passes: `npx tsc --noEmit` — zero errors
- [ ] Next.js production build passes: `npx next build` in `apps/web` — no build errors
- [ ] All five commits reviewed and merged to main

### Database readiness
- [ ] Neon branch snapshot confirmed — branch name and timestamp recorded before running migration
- [ ] `_migrate-rename-citations.ts` reviewed line-by-line by the production owner
- [ ] `_rollback-legal-references.ts` run in dev/staging to confirm state reporting is correct
- [ ] No ingest jobs running (`ingest-ny`, `ingest-federal`, `ingest-missing` are all idle)
- [ ] No manual writes to `citations` or `legal_references` during the migration + deploy window

### Deploy sequence
- [ ] **Step 1:** Run `npx tsx scripts/_migrate-rename-citations.ts` — confirm output shows matching row counts and index scan
- [ ] **Step 2:** Deploy new application code
- [ ] **Step 3:** Run smoke tests (see below) — all must pass before proceeding
- [ ] **Step 4:** Confirm no errors in application logs referencing `citations` table

### Smoke tests (run after deploy, before dropping compat view)
- [ ] `GET /api/corpus` returns `referencesTotal` field with a non-null number
- [ ] `POST /api/chain` with a known provision (e.g. `NY Penal Law 220.16`) returns a non-empty graph
- [ ] Law Navigator page loads and shows correct linked-authority count
- [ ] Compare page loads for two known provisions without error

### Cleanup (only after stability confirmed)
- [ ] Minimum 1 hour of clean production operation observed
- [ ] Run `npx tsx scripts/_migrate-drop-compat-view.ts` — confirm output shows view dropped
- [ ] Run `npx tsx scripts/_rollback-legal-references.ts` — confirm state shows rollback window closed

### Production owner
- [ ] Named individual assigned as responsible for this deploy: _______________
