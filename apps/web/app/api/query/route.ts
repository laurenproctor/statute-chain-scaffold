import { NextRequest, NextResponse } from 'next/server'
import { parseCitation, normalizeInput } from '@statute-chain/parser'
import { resolveCitation, buildChain, logMissingNodes } from '@statute-chain/legal-core'
import { getDbClient } from '../../../lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { query?: unknown }
  try {
    body = await req.json() as { query?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return NextResponse.json({ error: 'Missing field: query' }, { status: 400 })
  }

  try {
    const db = getDbClient()
    const norm = normalizeInput(query)
    const parsed = parseCitation(norm.normalized_text)
    const resolved = await resolveCitation(parsed, db)
    const startId = resolved.canonical_id ?? parsed.canonical_id ?? query
    const chain = await buildChain(startId, db, {})

    if (chain.unresolved.length > 0) {
      logMissingNodes(startId, chain.unresolved, db).catch(() => undefined)
    }

    return NextResponse.json({ input: norm, parsed, resolved, chain })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
