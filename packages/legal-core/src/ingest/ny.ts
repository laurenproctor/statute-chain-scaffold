import { extractCitationsFromText } from '@statute-chain/parser'
import type { LegalRelationship } from '@statute-chain/types'
import type { DbClient } from '../resolver/resolveCitation.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NyFixtureRow {
  lawId: string
  locationId: string
  lawName: string
  docType: string
  text: string
  sourceUrl: string
}

export interface ProvisionRow {
  canonical_id: string
  jurisdiction: 'ny'
  code: string
  section: string
  text_content: string
  provenance_source: string
}

export interface IngestResult {
  provisions: number
  citations: number
  errors: string[]
}

// ── Law ID → canonical code map ───────────────────────────────────────────────

const LAW_ID_TO_CODE: Record<string, string> = {
  PEN: 'penal',
  PBH: 'phl',
  CVP: 'cplr',
  VAT: 'vtl',
  TAX: 'tax',
  EDN: 'ed',
  GBS: 'gbl',
  COR: 'corr',
  EXC: 'exec',
}

// ── Normalize ─────────────────────────────────────────────────────────────────

export function normalizeNyProvision(row: NyFixtureRow): ProvisionRow {
  const code = LAW_ID_TO_CODE[row.lawId] ?? row.lawId.toLowerCase()
  const section = row.locationId

  return {
    canonical_id: `ny/${code}/${section}`,
    jurisdiction: 'ny',
    code,
    section,
    text_content: row.text,
    provenance_source: row.sourceUrl,
  }
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertProvision(p: ProvisionRow, db: DbClient): Promise<void> {
  await db.query(
    `INSERT INTO provisions
       (canonical_id, jurisdiction, code, section, text_content, ingestion_status, confidence, provenance_source)
     VALUES ($1, $2, $3, $4, $5, 'ingested', 1.0, $6)
     ON CONFLICT (canonical_id) DO UPDATE
       SET text_content = EXCLUDED.text_content,
           ingestion_status = 'ingested',
           provenance_source = EXCLUDED.provenance_source,
           ingested_at = now()`,
    [p.canonical_id, p.jurisdiction, p.code, p.section, p.text_content, p.provenance_source],
  )
}

async function upsertCitation(
  fromId: string,
  rel: LegalRelationship,
  db: DbClient,
): Promise<void> {
  await db.query(
    `INSERT INTO citations
       (from_canonical_id, to_canonical_id, depth_found, relationship_type, source_method, confidence, explanation)
     VALUES ($1, $2, 1, $3, $4, $5, $6)
     ON CONFLICT (from_canonical_id, to_canonical_id) DO NOTHING`,
    [fromId, rel.target_id, rel.relationship_type, rel.source_method, rel.confidence ?? null, rel.explanation],
  )
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export async function ingestNyProvisions(
  rows: NyFixtureRow[],
  db: DbClient,
): Promise<IngestResult> {
  const result: IngestResult = { provisions: 0, citations: 0, errors: [] }

  for (const row of rows) {
    try {
      const provision = normalizeNyProvision(row)
      await upsertProvision(provision, db)
      result.provisions++

      const outboundIds = extractCitationsFromText(provision.text_content)
      for (const targetId of outboundIds.filter((id) => id !== provision.canonical_id)) {
        const rel: LegalRelationship = {
          target_id: targetId,
          relationship_type: 'references',
          source_method: 'parser',
          confidence: 1.0,
          explanation: 'Referenced directly in text',
        }
        await upsertCitation(provision.canonical_id, rel, db)
        result.citations++
      }
    } catch (err) {
      result.errors.push(
        `${row.lawId}/${row.locationId}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return result
}
