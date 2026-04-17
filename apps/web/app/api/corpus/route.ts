import { NextResponse } from 'next/server'
import { getDbClient } from '../../../lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const db = getDbClient()

    const [provisionRows, citationRows, recentRows] = await Promise.all([
      db.query<{ count: string; jurisdiction: string }>(
        `SELECT jurisdiction, COUNT(*)::text AS count FROM provisions GROUP BY jurisdiction ORDER BY jurisdiction`,
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM citations`,
      ),
      db.query<{ canonical_id: string; ingested_at: string | null }>(
        `SELECT canonical_id, ingested_at FROM provisions ORDER BY ingested_at DESC NULLS LAST`,
      ),
    ])

    const provisionsTotal = recentRows.length
    const byJurisdiction = Object.fromEntries(
      provisionRows.map((r) => [r.jurisdiction, parseInt(r.count, 10)]),
    )
    const citationsTotal = parseInt(citationRows[0]?.count ?? '0', 10)
    const canonicalIds = recentRows.map((r) => r.canonical_id)
    const lastIngestedAt = recentRows[0]?.ingested_at ?? null

    return NextResponse.json({
      provisionsTotal,
      byJurisdiction,
      citationsTotal,
      canonicalIds,
      lastIngestedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
