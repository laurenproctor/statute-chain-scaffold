import { NextResponse } from 'next/server'
import { getDbClient } from '../../../lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const db = getDbClient()

    const [provisionRows, citationRows, allRows, recentAdditionRows] = await Promise.all([
      db.query<{ count: string; jurisdiction: string }>(
        `SELECT jurisdiction, COUNT(*)::text AS count FROM provisions GROUP BY jurisdiction ORDER BY jurisdiction`,
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM legal_references`,
      ),
      db.query<{ canonical_id: string; ingested_at: string | null }>(
        `SELECT canonical_id, ingested_at FROM provisions ORDER BY ingested_at DESC NULLS LAST`,
      ),
      db.query<{ canonical_id: string; ingested_at: string }>(
        `SELECT canonical_id, ingested_at FROM provisions WHERE ingested_at IS NOT NULL ORDER BY ingested_at DESC LIMIT 10`,
      ),
    ])

    const provisionsTotal = allRows.length
    const byJurisdiction = Object.fromEntries(
      provisionRows.map((r) => [r.jurisdiction, parseInt(r.count, 10)]),
    )
    const referencesTotal = parseInt(citationRows[0]?.count ?? '0', 10)
    const canonicalIds = allRows.map((r) => r.canonical_id)
    const lastIngestedAt = allRows[0]?.ingested_at ?? null
    const recentAdditions = recentAdditionRows.map((r) => ({
      canonical_id: r.canonical_id,
      ingested_at: r.ingested_at,
    }))

    return NextResponse.json({
      provisionsTotal,
      byJurisdiction,
      referencesTotal,
      canonicalIds,
      lastIngestedAt,
      recentAdditions,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
