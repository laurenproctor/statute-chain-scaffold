# Schema

## provisions

One row per ingested legal authority. Primary key: `canonical_id` (e.g. `ny/penal/220.16`).

## legal_references

Typed, directed edges between provisions. Primary key: `(from_canonical_id, to_canonical_id)`.

| Column | Type | Description |
| --- | --- | --- |
| `from_canonical_id` | text | Source provision (FK → provisions) |
| `to_canonical_id` | text | Target provision (may not be ingested yet) |
| `depth_found` | int | BFS depth at which this edge was first discovered (nullable) |
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
