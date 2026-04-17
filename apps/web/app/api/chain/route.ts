import { NextRequest, NextResponse } from 'next/server'
import { parseCitation } from '@statute-chain/parser'
import { buildChain, logMissingNodes } from '@statute-chain/legal-core'
import { getDbClient } from '../../../lib/db'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { citation?: string; depth?: number }
  try {
    body = await req.json() as { citation?: string; depth?: number }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const citation = body.citation?.trim()
  if (!citation) {
    return NextResponse.json({ error: 'Missing field: citation' }, { status: 400 })
  }

  const depth = Math.min(Math.max(Number(body.depth ?? 3), 1), 10)
  const parsed = parseCitation(citation)
  const startId = parsed.canonical_id ?? citation

  const db = getDbClient()
  const graph = await buildChain(startId, db, { maxDepth: depth })

  if (graph.unresolved.length > 0) {
    logMissingNodes(startId, graph.unresolved, db).catch(() => undefined)
  }

  return NextResponse.json({ parsed, graph })
}
