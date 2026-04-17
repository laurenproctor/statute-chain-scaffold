import { createHash } from 'crypto'
import { extractCitationsFromText } from '@statute-chain/parser'
import type { LegalRelationship } from '@statute-chain/types'
import type { DbClient } from '../resolver/resolveCitation.js'
import { upsertRelationship } from '../resolver/upsertRelationship.js'

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
  references: number
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
  const result: IngestResult = { provisions: 0, references: 0, errors: [] }

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
      for (const targetId of outboundIds.filter((id) => id !== p.canonical_id)) {
        const rel: LegalRelationship = {
          target_id: targetId,
          relationship_type: 'references',
          source_method: 'parser',
          confidence: 1.0,
          explanation: 'Referenced directly in text',
        }
        await upsertRelationship({ from_canonical_id: p.canonical_id, ...rel }, db)
        result.references++
      }
    } catch (err) {
      result.errors.push(
        `usc/${row.title}/${row.section}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return result
}
