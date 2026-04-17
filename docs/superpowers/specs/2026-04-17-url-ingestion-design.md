# URL Ingestion Mode — Design Spec

**Date:** 2026-04-17
**Status:** Locked

---

## Goal

Users paste a statute webpage URL and receive a merged citation chain graph. The system fetches the page server-side, extracts all citations (structured and informal), resolves each one, deduplicates roots, and runs `buildChain` sequentially until a global node cap is reached.

Recall first, precision through labeling — no citation is silently dropped.

---

## Architecture

Three new units with single responsibilities, plus extensions to existing types and the route.

```
url
 └─ fetchStatutePage()          apps/web/lib/fetchStatutePage.ts
       { text, title }
 └─ scanAllCitations(text)      packages/parser/src/scanAllCitations.ts
       ScannedCitation[]
 └─ resolveCitation() × N       existing @statute-chain/legal-core
       UrlCitationResult[]
 └─ dedupe ingested roots
       root[] (capped at maxRoots, sorted by citation frequency)
 └─ buildChain() × roots        sequential until global nodeCap hit
       ChainGraph[]
 └─ merge graphs
       UrlQueryResponse
```

---

## Types

All new types are added to `packages/types/src/index.ts`.

### `ScannedCitation`

```typescript
export type ScannedCitation = {
  raw: string            // matched text span as it appears in page
  canonical_id?: string  // set when a structured pattern matched
  format: 'structured' | 'informal'
  confidence: number     // 0–1, from parser pattern confidence
  start: number          // char offset in stripped plain text
  end: number            // char offset in stripped plain text
  context: string        // ~60 chars surrounding the match
}
```

### `UrlCitationResult`

After resolution, each `ScannedCitation` is augmented with its resolution outcome.

```typescript
export type UrlCitationResult = ScannedCitation & {
  status: IngestionStatus | 'unresolved_text'
  resolved_canonical_id?: string  // present when resolution succeeded; may differ from canonical_id if alias
}
```

### `UnresolvedRef`

Returned in `unresolved[]` — carries a machine-readable reason rather than a bare string.

```typescript
export type UnresolvedRefReason =
  | 'not_ingested'    // canonical ID known but not yet in DB
  | 'ambiguous'       // multiple candidates, cannot auto-resolve
  | 'parse_failed'    // parser could not produce a canonical ID
  | 'unresolved_text' // informal text with no DB match at all

export type UnresolvedRef = {
  raw: string
  canonical_id?: string
  reason: UnresolvedRefReason
  candidates?: string[]  // populated when reason === 'ambiguous'
}
```

### `UrlQueryOptions`

Passed as request body alongside `url`. All fields optional.

```typescript
export type UrlQueryOptions = {
  maxRoots?: number   // default 50  — max unique ingested roots to expand
  maxDepth?: number   // default 1   — buildChain maxDepth per root
  nodeCap?: number    // default 200 — global merged node ceiling
  timeoutMs?: number  // default 15000 — wall-clock budget (fetch + resolve + chain)
}
```

### `UrlQueryResponse`

```typescript
export type UrlQueryResponse = {
  source_type: 'url'
  source_url: string
  extracted_title: string
  citations_found: UrlCitationResult[]  // all scanned citations, with status
  chain: ChainGraph                     // merged graph across all expanded roots
  unresolved: UnresolvedRef[]           // citations that could not be chained

  // Truncation flags
  truncated: boolean
  truncation_reason?: 'node_cap' | 'root_cap' | 'timeout'
  roots_expanded: number   // how many roots were expanded before stopping
  roots_found: number      // total unique ingested roots identified

  // Timing metrics (ms)
  timing: {
    fetch_ms: number
    scan_ms: number
    resolve_ms: number
    chain_ms: number
    total_ms: number
  }
}
```

---

## Unit: `scanAllCitations` (new)

**File:** `packages/parser/src/scanAllCitations.ts`
**Exported from:** `packages/parser/src/index.ts`

### Behavior

Takes plain text (already HTML-stripped). Runs all citation patterns — both structured (same as `extractCitationsFromText`) and informal — and returns every match as a `ScannedCitation`. Deduplicates by `raw` text span. Never drops a match regardless of confidence.

### Patterns covered

| Pattern | Format | Example | Confidence |
|---|---|---|---|
| Federal USC structured | structured | `26 U.S.C. § 501(c)(3)` | 0.97 |
| NY abbreviation structured | structured | `CPLR 3212` | 0.96 |
| NY long-form structured | structured | `Penal Law § 265.02` | 0.96 |
| Informal NY | informal | `Penal § 265` | 0.60 |
| Informal federal (IRC/INA/etc.) | informal | `IRC 501(c)` | 0.65 |
| Bare section | informal | `§ 501(c)` | 0.40 |
| Section word | informal | `Section 1983` | 0.35 |

### Output deduplication

Matches with identical `raw` span are merged (first occurrence wins for `start`/`end`, highest confidence wins).

---

## Unit: `fetchStatutePage` (new)

**File:** `apps/web/lib/fetchStatutePage.ts`

### Signature

```typescript
export async function fetchStatutePage(
  url: string,
  timeoutMs: number,
): Promise<{ text: string; title: string; fetch_ms: number }>
```

Throws `FetchError` with a `code` on any validation or network failure. The route catches this and returns a 400 or 502 accordingly.

### Validation

1. Parse URL — reject non-`http`/`https` schemes with code `INVALID_SCHEME`
2. Resolve hostname via `dns.promises.lookup` — reject if the resolved IP falls in any of:
   - `127.0.0.0/8` (loopback)
   - `10.0.0.0/8` (RFC 1918)
   - `172.16.0.0/12` (RFC 1918)
   - `192.168.0.0/16` (RFC 1918)
   - `::1` / `fc00::/7` (IPv6 loopback + ULA)
   - `169.254.0.0/16` (link-local)
   - Reject with code `SSRF_BLOCKED`
3. **Known limitation:** Does not prevent DNS rebinding attacks. Adequate for a research tool; documented here.

### Fetch

- `AbortController` timeout set to `timeoutMs`
- Read body as stream, abort if accumulated bytes exceed **2MB**, with code `RESPONSE_TOO_LARGE`
- Non-2xx response rejects with code `HTTP_ERROR` and the status code

### HTML → plain text

Regex pipeline (no new dependencies):

1. Extract `<title>` content → `title`
2. Remove blocks with content: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`
3. Replace block elements (`<p>`, `<div>`, `<li>`, `<br>`, `<tr>`) with newline
4. Strip all remaining HTML tags
5. Decode common HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&nbsp;`, `&#NNN;`)
6. Collapse runs of whitespace/blank lines

Result is readable plain text suitable for citation scanning.

---

## Unit: Route extension (`/api/query`)

**File:** `apps/web/app/api/query/route.ts`

### Request body

```typescript
{
  query?: string         // existing text citation mode
  url?: string           // new URL ingestion mode
  options?: UrlQueryOptions
}
```

Exactly one of `query` or `url` must be present. Both present → 400 `"Provide either query or url, not both"`.

### URL branch flow

```
1. fetchStatutePage(url, options.timeoutMs)
2. scanAllCitations(text)                          → ScannedCitation[]
3. for each unique raw citation:
     parseCitation(raw)                            → ParsedCitation
     resolveCitation(parsed, db)                   → ResolvedProvision
     map to UrlCitationResult
4. collect unique canonical roots where
     status === 'ingested' | 'alias_resolved'
   sort by frequency (most-cited first)
   cap at maxRoots
5. mergedNodes = {}, mergedEdges = []
   sequentially for each root:
     if Object.keys(mergedNodes).length >= nodeCap → stop, set truncated
     if Date.now() > deadline                      → stop, set truncated
     graph = buildChain(root, db, { maxDepth, nodeCap: nodeCap - mergedNodes.size })
     merge graph.nodes into mergedNodes (existing entries kept)
     append graph.edges (dedup by from+to)
6. build unresolved[] from UrlCitationResults
     where status ∉ { 'ingested', 'alias_resolved' }
7. return UrlQueryResponse
```

### Error responses

| Condition | Status | Error code |
|---|---|---|
| Invalid JSON | 400 | `INVALID_JSON` |
| Neither query nor url | 400 | `MISSING_FIELD` |
| Both query and url | 400 | `AMBIGUOUS_INPUT` |
| Invalid URL scheme | 400 | `INVALID_SCHEME` |
| SSRF blocked | 400 | `SSRF_BLOCKED` |
| Fetch timeout | 504 | `FETCH_TIMEOUT` |
| HTTP error from remote | 502 | `HTTP_ERROR` |
| Response too large | 400 | `RESPONSE_TOO_LARGE` |
| Internal error | 500 | message string |

---

## Testing

### `scanAllCitations.test.ts` (co-located with source)

- Structured federal citation → correct canonical_id, confidence, offsets
- Informal citation → no canonical_id, correct format/confidence
- Mixed text with multiple citations → correct count, no duplicates
- Overlapping/adjacent citations → deduplicated correctly
- Empty string → returns `[]`
- Context window is ~60 chars centered on match

### `fetchStatutePage.test.ts` (co-located in `apps/web/lib/`)

Mock `fetch` and `dns.promises.lookup`. Test:
- Non-http scheme → throws `INVALID_SCHEME`
- Localhost hostname → throws `SSRF_BLOCKED`
- Private IP (10.x) → throws `SSRF_BLOCKED`
- Normal URL → returns `{ text, title, fetch_ms }`
- Fetch timeout → throws `FETCH_TIMEOUT`
- Response > 2MB → throws `RESPONSE_TOO_LARGE`
- HTML stripping: nav/footer/script removed, entity decoding works
- Title extraction

### Route tests (add to `apps/web/app/api/query/route.test.ts`)

Mock `fetchStatutePage` and `scanAllCitations`. Test:
- `url` + `query` both present → 400
- Neither present → 400
- Invalid scheme → 400 `INVALID_SCHEME`
- Successful URL response → correct `UrlQueryResponse` shape
- `truncated: true` when nodeCap hit
- `truncated: true` when timeout hit
- `truncated: true` when root cap hit
- Timing metrics present and non-negative
- `unresolved[]` entries carry correct `reason` field

---

## Known Limitations

1. **DNS rebinding:** SSRF protection checks the resolved IP at validation time, but a malicious DNS server could return a different IP at fetch time. Not mitigated. Acceptable for a legal research tool.
2. **Dynamic/JS-rendered pages:** HTML stripping works on server-rendered HTML only. Pages that render statute text via JavaScript (rare on the supported domains) may return sparse text.
3. **Informal citation precision:** `Section 1983` matched on any page will produce a low-confidence informal ref. False positives are labeled, not dropped.
4. **Parallel chain expansion not implemented:** Roots are expanded sequentially to keep implementation simple and avoid exceeding the time budget.

---

## Supported Domains (informational)

These domains serve well-structured server-rendered HTML and work with the regex stripping approach:

- `nysenate.gov` — NY statute pages
- `law.cornell.edu` — Cornell LII (federal + state)
- `uscode.house.gov` — US Code official text

The feature is not domain-restricted — any publicly accessible statute URL will be attempted.
