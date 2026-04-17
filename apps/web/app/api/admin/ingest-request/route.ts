import { readFileSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { ingestNyProvisions, type NyFixtureRow } from '@statute-chain/legal-core'
import { ingestFederalProvisions, type FederalFixtureRow } from '@statute-chain/legal-core'
import { getDbClient } from '../../../../lib/db'
import { parseIngestRoute, getSourceCapability } from '../../../../lib/ingestTarget'

export const runtime = 'nodejs'

async function setStatus(canonicalId: string, status: string, lastError?: string) {
  const db = getDbClient()
  if (lastError !== undefined) {
    console.error(`[ingest-request] ${canonicalId} → ${status}: ${lastError}`)
    await db.query(
      `UPDATE citation_requests SET status = $1, last_error = $2 WHERE canonical_id = $3`,
      [status, lastError, canonicalId],
    )
  } else {
    await db.query(
      `UPDATE citation_requests SET status = $1, last_error = NULL WHERE canonical_id = $2`,
      [status, canonicalId],
    )
  }
}

async function fetchNy(lawId: string, locationId: string): Promise<NyFixtureRow> {
  const apiKey = process.env['NY_SENATE_API_KEY']
  if (!apiKey) throw new Error('NY_SENATE_API_KEY not configured in environment')

  const url = `https://legislation.nysenate.gov/api/3/laws/${lawId}/${locationId}?key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NY Senate API returned ${res.status} for ${lawId}/${locationId}`)

  const json = await res.json() as {
    success: boolean
    message?: string
    result?: { lawId: string; lawName: string; locationId: string; docType: string; text: string }
  }

  if (!json.success || !json.result) {
    throw new Error(json.message ?? 'NY Senate API returned no result')
  }

  const doc = json.result
  return {
    lawId: doc.lawId,
    locationId: doc.locationId,
    lawName: doc.lawName,
    docType: doc.docType,
    text: doc.text,
    sourceUrl: `https://legislation.nysenate.gov/api/3/laws/${lawId}/${locationId}`,
  }
}

export async function POST(req: NextRequest) {
  let body: { canonical_id?: unknown }
  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const canonical_id = typeof body.canonical_id === 'string' ? body.canonical_id.trim() : ''
  if (!canonical_id) {
    return NextResponse.json({ error: 'Missing field: canonical_id' }, { status: 400 })
  }

  const capability = getSourceCapability(canonical_id)
  const route = parseIngestRoute(canonical_id)

  if (capability.mode === 'manual') {
    return NextResponse.json(
      { error: 'No automated ingest path available for this citation. Requires manual review.' },
      { status: 422 },
    )
  }

  await setStatus(canonical_id, 'loading')

  try {
    const db = getDbClient()
    let result: { provisions: number; citations: number; errors: string[] }

    if (capability.mode === 'live_api' && route.type === 'ny') {
      const row = await fetchNy(route.lawId, route.locationId)
      result = await ingestNyProvisions([row], db)
    } else if (capability.mode === 'fixture' && capability.fixturePath && route.type === 'federal') {
      const fixture = JSON.parse(readFileSync(capability.fixturePath, 'utf-8')) as FederalFixtureRow
      result = await ingestFederalProvisions([fixture], db)
    } else {
      const reason = `source_mode '${capability.mode}' has no handler for route type '${route.type}'`
      await setStatus(canonical_id, 'failed', reason)
      return NextResponse.json({ error: reason }, { status: 422 })
    }

    if (result.errors.length > 0) {
      const reason = result.errors.join('; ')
      await setStatus(canonical_id, 'failed', reason)
      return NextResponse.json({ error: `Ingest pipeline errors: ${reason}` }, { status: 500 })
    }

    await setStatus(canonical_id, 'loaded')
    return NextResponse.json({
      canonical_id,
      source_mode: capability.mode,
      provisions: result.provisions,
      citations: result.citations,
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    await setStatus(canonical_id, 'failed', reason)
    return NextResponse.json({ error: reason }, { status: 500 })
  }
}
