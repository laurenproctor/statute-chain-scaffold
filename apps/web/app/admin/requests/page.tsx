import { getDbClient } from '../../../lib/db'
import { formatCanonicalId } from '../../../lib/formatCanonicalId'
import { getSourceCapability } from '../../../lib/ingestTarget'
import { AdminActions } from './AdminActions'

export const dynamic = 'force-dynamic'

type RequestRow = {
  canonical_id: string
  latest_raw_input: string
  requested_at: string
  request_count: number
  status: string
  source_mode: string
  last_error: string | null
}

async function getRequests(): Promise<{ rows: RequestRow[]; error?: string }> {
  try {
    const db = getDbClient()
    const rows = await db.query<RequestRow>(
      `SELECT canonical_id, latest_raw_input, requested_at, request_count, status, source_mode, last_error
       FROM citation_requests
       ORDER BY request_count DESC, requested_at DESC`,
    )
    return { rows }
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

type Status = 'requested' | 'queued' | 'loading' | 'loaded' | 'failed' | 'ignored'
type SourceMode = 'live_api' | 'fixture' | 'manual'

export default async function RequestsPage() {
  const { rows, error } = await getRequests()

  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Ingest Console</p>
        <h1>Load request queue.</h1>
        <p className="tagline">{rows.length} pending request{rows.length !== 1 ? 's' : ''}. Ingest or ignore each below.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {rows.length === 0 && !error && (
        <div className="muted" style={{ marginTop: 24, fontSize: 13 }}>No requests yet.</div>
      )}

      {rows.length > 0 && (
        <section className="section">
          <div className="chain-view">
            <div className="nodes-list">
              {rows.map((row) => {
                // Re-derive capability server-side so label/fixturePath stays current
                const cap = getSourceCapability(row.canonical_id)
                return (
                  <div key={row.canonical_id} className="node-row">
                    <div className="node-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span className="node-label">{formatCanonicalId(row.canonical_id)}</span>
                        <div className="node-canonical">{row.canonical_id}</div>
                      </div>
                      <AdminActions
                        canonicalId={row.canonical_id}
                        initialStatus={row.status as Status}
                        sourceMode={cap.mode as SourceMode}
                        sourceLabel={cap.label}
                        initialLastError={row.last_error}
                      />
                    </div>
                    <div className="admin-row-meta">
                      <span>Requested {row.request_count}×</span>
                      <span>Last: {formatTs(row.requested_at)}</span>
                      {row.latest_raw_input !== row.canonical_id && (
                        <span className="muted">"{row.latest_raw_input}"</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        Informational research tool. Verify conclusions against official sources and current law.
      </footer>
    </main>
  )
}
