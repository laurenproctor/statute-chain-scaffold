import { createHash } from 'crypto'
import { extractCitationsFromText } from '@statute-chain/parser'
import type { DbClient } from '../resolver/resolveCitation.js'

export interface FederalFixtureRow {
  title: string
  section: string
  chapterName?: string
  heading?: string
  text: string
  sourceUrl: string
}

export interface IngestResult {
  provisions: number
  citations: number
  errors: string[]
}

export function computeVersionHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function normalizeFederalProvision(row: FederalFixtureRow) {
  return {
    canonical_id: `federal/usc/${row.title}/${row.section}`,
    jurisdiction: 'federal' as const,
    code: `usc/${row.title}`,
    section: row.section,
    text_content: row.text,
    provenance_source: row.sourceUrl,
    version_hash: computeVersionHash(row.text),
  }
}

export async function ingestFederalProvisions(
  rows: FederalFixtureRow[],
  db: DbClient,
): Promise<IngestResult> {
  const result: IngestResult = { provisions: 0, citations: 0, errors: [] }

  for (const row of rows) {
    try {
      const p = normalizeFederalProvision(row)
      await db.query(
        `INSERT INTO provisions
           (canonical_id, jurisdiction, code, section, text_content, ingestion_status, confidence, provenance_source, version_hash)
         VALUES ($1, $2, $3, $4, $5, 'ingested', 1.0, $6, $7)
         ON CONFLICT (canonical_id) DO UPDATE
           SET text_content = EXCLUDED.text_content,
               ingestion_status = 'ingested',
               provenance_source = EXCLUDED.provenance_source,
               version_hash = EXCLUDED.version_hash,
               ingested_at = now()`,
        [p.canonical_id, p.jurisdiction, p.code, p.section, p.text_content, p.provenance_source, p.version_hash],
      )
      result.provisions++

      const outboundIds = extractCitationsFromText(p.text_content)
      for (const toId of outboundIds.filter((id) => id !== p.canonical_id)) {
        await db.query(
          `INSERT INTO citations (from_canonical_id, to_canonical_id, depth_found)
           VALUES ($1, $2, $3)
           ON CONFLICT (from_canonical_id, to_canonical_id) DO NOTHING`,
          [p.canonical_id, toId, 1],
        )
        result.citations++
      }
    } catch (err) {
      result.errors.push(
        `usc/${row.title}/${row.section}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return result
}
