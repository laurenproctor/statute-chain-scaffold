import { NextResponse } from 'next/server'
import { getDbClient } from '../../../../lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const url = process.env['DATABASE_URL']
  const hasDatabaseUrl = Boolean(url)

  // Redact credentials, keep host only
  let dbHost: string | null = null
  try {
    if (url) {
      const parsed = new URL(url)
      dbHost = parsed.host
    }
  } catch {
    dbHost = 'unparseable'
  }

  let provisionsCount: number | string = 'error'
  try {
    const db = getDbClient()
    const rows = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM provisions')
    provisionsCount = parseInt(rows[0]?.count ?? '0', 10)
  } catch (err) {
    provisionsCount = err instanceof Error ? err.message : 'unknown error'
  }

  return NextResponse.json({ hasDatabaseUrl, dbHost, provisionsCount })
}
