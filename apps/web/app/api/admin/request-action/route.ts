import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '../../../../lib/db'

export const runtime = 'nodejs'

const VALID_STATUSES = ['queued', 'loaded', 'ignored'] as const
type ActionStatus = typeof VALID_STATUSES[number]

export async function POST(req: NextRequest) {
  let body: { canonical_id?: unknown; status?: unknown }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const canonical_id = typeof body.canonical_id === 'string' ? body.canonical_id.trim() : ''
  const status = body.status as string

  if (!canonical_id) {
    return NextResponse.json({ error: 'Missing field: canonical_id' }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status as ActionStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  try {
    const db = getDbClient()
    await db.query(
      `UPDATE citation_requests SET status = $1 WHERE canonical_id = $2`,
      [status, canonical_id],
    )
    return NextResponse.json({ canonical_id, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
