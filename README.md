# Statute Chain

Statute Chain is a legal intelligence platform that maps how statutes, code sections, and related laws connect — so professionals can understand the full meaning of a law faster.

Instead of manually chasing definitions, schedules, incorporated sections, and chained references across multiple codes, Statute Chain maps them instantly.

---

## Core Use Cases

* Enter a statute reference like `NY Penal 220.16`
* Paste a public statute URL
* Detect embedded statute references in legal text
* Resolve aliases and canonical references
* Build linked law chains
* Surface unresolved or missing references
* Understand statutes faster

---

## Why It Matters

Many laws are difficult to interpret because they depend on:

* defined terms in other sections
* schedules and appendices
* incorporated federal statutes
* prior offense references
* nested subdivisions and paragraphs

Statute Chain helps users move from a raw statute reference to structured understanding.

---

## Example

### Input

```text
NY Penal 220.16
```

### Output

```text
220.16
├─ 220.00 Definitions
├─ Public Health Law 3306 Schedules
│  ├─ Schedule I
│  └─ Schedule II
└─ Related prior offenses under Article 220
```

---

## URL Mode

Paste a supported public law page:

```text
https://www.nysenate.gov/legislation/laws/PEN/220.16
```

Statute Chain will:

1. Fetch visible statute text
2. Detect statute references
3. Resolve references
4. Build merged dependency graph
5. Show unresolved items

### Example URL Response

```json
{
  "source_type": "url",
  "source_url": "https://www.nysenate.gov/legislation/laws/PEN/220.16",
  "extracted_title": "NY Penal Law 220.16",
  "references_found": [
    {
      "raw": "section 3306",
      "format": "informal",
      "status": "resolved",
      "resolved_canonical_id": "ny/phl/3306"
    }
  ],
  "chain": {
    "nodes": [],
    "edges": []
  },
  "unresolved": []
}
```

---

## Architecture

### Packages

#### parser

Responsible for reference intelligence.

* `parseCitation()`
* `scanAllCitations()`
* structured + informal reference detection
* confidence scoring
* offsets + context windows

#### resolver

Maps statute references to known laws.

* canonical IDs
* aliases
* ingestion status
* ambiguity states

#### chain

Builds linked law graphs.

* breadth first traversal
* cycle prevention
* node caps
* depth controls
* metrics

#### database

Stores provisions, references, aliases, metadata.

#### web

Next.js application with API routes and search UI.

---

## Response Philosophy

Statute Chain is **recall first**.

It does not silently drop references.

Results are labeled:

* resolved
* alias_resolved
* ambiguous
* not_ingested
* unresolved_text

---

## Current Focus

Initial domain coverage is targeted toward high-value legal chains:

* New York Penal Law
* New York Public Health Law
* 21 USC 802
* 21 USC 812

This narrow-first strategy creates real utility before broad expansion.

---

## Tech Stack

* TypeScript
* Node.js
* Next.js
* Vitest
* SQL

---

## Local Development

### Install

```bash
pnpm install
```

### Run Web App

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

---

## Example API Requests

### Statute Reference Query

```json
POST /api/query

{
  "query": "NY Penal 220.16"
}
```

### URL Query

```json
POST /api/query

{
  "url": "https://www.nysenate.gov/legislation/laws/PEN/220.16"
}
```

---

## Security Notes

URL mode includes:

* http / https only
* localhost and private IP blocking
* request timeout
* response size cap

---

## Product Vision

Statute Chain aims to become the fastest way to understand how a law actually works.

Not just text retrieval.

Structural understanding.

---

## Roadmap

* More jurisdictions
* Better informal reference resolution
* Visual graph UI
* Saved research sessions
* Attorney workflows
* Compliance intelligence
* Legislative change tracking

---

## Contributing

Pull requests and thoughtful issue reports are welcome.

---

## License

Private / Internal project unless otherwise specified.
