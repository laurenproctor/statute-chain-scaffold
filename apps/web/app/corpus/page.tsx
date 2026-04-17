import { getDbClient } from '../../lib/db'
import { formatCanonicalId } from '../../lib/formatCanonicalId'

export const dynamic = 'force-dynamic'

interface CorpusData {
  provisionsTotal: number
  byJurisdiction: Record<string, number>
  referencesTotal: number
  canonicalIds: string[]
  lastIngestedAt: string | null
  recentAdditions: { canonical_id: string; ingested_at: string }[]
  error?: string
}

async function getCorpusData(): Promise<CorpusData> {
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

    return {
      provisionsTotal: allRows.length,
      byJurisdiction: Object.fromEntries(
        provisionRows.map((r) => [r.jurisdiction, parseInt(r.count, 10)]),
      ),
      referencesTotal: parseInt(citationRows[0]?.count ?? '0', 10),
      canonicalIds: allRows.map((r) => r.canonical_id),
      lastIngestedAt: allRows[0]?.ingested_at ?? null,
      recentAdditions: recentAdditionRows.map((r) => ({ canonical_id: r.canonical_id, ingested_at: r.ingested_at })),
    }
  } catch (err) {
    return {
      provisionsTotal: 0,
      byJurisdiction: {},
      referencesTotal: 0,
      canonicalIds: [],
      lastIngestedAt: null,
      recentAdditions: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

function formatTs(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

export default async function CorpusPage() {
  const data = await getCorpusData()

  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Corpus Status</p>
        <h1>Ingested provisions and reference graph.</h1>
        <p className="tagline">All statutes loaded in the system, with source and coverage metadata.</p>
      </header>

      {data.error ? (
        <div className="error-banner">{data.error}</div>
      ) : (
        <>
          <section className="section">
            <div className="section-title">Overview</div>
            <div className="parse-preview">
              <div className="preview-row">
                <span className="label">provisions</span>
                <span>{data.provisionsTotal}</span>
              </div>
              {Object.entries(data.byJurisdiction).map(([jur, count]) => (
                <div key={jur} className="preview-row">
                  <span className="label" style={{ paddingLeft: 12 }}>{jur}</span>
                  <span className="muted">{count}</span>
                </div>
              ))}
              <div className="preview-row">
                <span className="label">references</span>
                <span>{data.referencesTotal}</span>
              </div>
              <div className="preview-row">
                <span className="label">last ingest</span>
                <span className="muted" style={{ fontSize: 12 }}>{formatTs(data.lastIngestedAt)}</span>
              </div>
            </div>
          </section>

          {data.recentAdditions.length > 0 && (
            <section className="section">
              <div className="section-title">Recently added</div>
              <div className="chain-view">
                <div className="nodes-list">
                  {data.recentAdditions.map((r) => (
                    <div key={r.canonical_id} className="node-row">
                      <div className="node-header">
                        <span className="node-label">{formatCanonicalId(r.canonical_id)}</span>
                      </div>
                      <div className="node-canonical">{r.canonical_id}</div>
                      <div className="node-meta" style={{ paddingLeft: 0 }}>
                        Added {formatTs(r.ingested_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">All provisions ({data.canonicalIds.length})</div>
            <div className="chain-view">
              <div className="nodes-list">
                {data.canonicalIds.map((id) => (
                  <div key={id} className="node-row">
                    <div className="node-header">
                      <span className="node-label">{formatCanonicalId(id)}</span>
                    </div>
                    <div className="node-canonical">{id}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <footer className="site-footer">
        Informational research tool. Verify conclusions against official sources and current law.
      </footer>
    </main>
  )
}
