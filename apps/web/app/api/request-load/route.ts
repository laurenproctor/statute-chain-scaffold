import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '../../../lib/db'
import { getSourceCapability } from '../../../lib/ingestTarget'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { canonical_id?: unknown; raw_input?: unknown }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const canonical_id = typeof body.canonical_id === 'string' ? body.canonical_id.trim() : ''
  const raw_input    = typeof body.raw_input    === 'string' ? body.raw_input.trim()    : canonical_id

  if (!canonical_id) {
    return NextResponse.json({ error: 'Missing field: canonical_id' }, { status: 400 })
  }

  try {
    const db = getDbClient()
    const source_mode = getSourceCapability(canonical_id).mode
    const rows = await db.query<{ canonical_id: string; request_count: number }>(
      `INSERT INTO citation_requests (canonical_id, latest_raw_input, requested_at, request_count, status, source_mode)
       VALUES ($1, $2, now(), 1, 'requested', $3)
       ON CONFLICT (canonical_id) DO UPDATE SET
         latest_raw_input = EXCLUDED.latest_raw_input,
         requested_at     = now(),
         request_count    = citation_requests.request_count + 1,
         source_mode      = EXCLUDED.source_mode
       RETURNING canonical_id, request_count`,
      [canonical_id, raw_input, source_mode],
    )
    const row = rows[0]
    return NextResponse.json({ canonical_id, request_count: row?.request_count ?? 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
