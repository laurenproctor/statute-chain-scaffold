import { NextRequest, NextResponse } from 'next/server'
import { parseCitation } from '@statute-chain/parser'

export const runtime = 'nodejs'

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing query param: q' }, { status: 400 })
  }
  const result = parseCitation(q)
  return NextResponse.json(result)
}
