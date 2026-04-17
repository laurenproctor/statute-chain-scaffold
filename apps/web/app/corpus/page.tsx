import { getDbClient } from '../../lib/db'
import { formatCanonicalId } from '../../lib/formatCanonicalId'

export const dynamic = 'force-dynamic'

interface CorpusData {
  provisionsTotal: number
  byJurisdiction: Record<string, number>
  citationsTotal: number
  canonicalIds: string[]
  lastIngestedAt: string | null
  error?: string
}

async function getCorpusData(): Promise<CorpusData> {
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

    return {
      provisionsTotal: recentRows.length,
      byJurisdiction: Object.fromEntries(
        provisionRows.map((r) => [r.jurisdiction, parseInt(r.count, 10)]),
      ),
      citationsTotal: parseInt(citationRows[0]?.count ?? '0', 10),
      canonicalIds: recentRows.map((r) => r.canonical_id),
      lastIngestedAt: recentRows[0]?.ingested_at ?? null,
    }
  } catch (err) {
    return {
      provisionsTotal: 0,
      byJurisdiction: {},
      citationsTotal: 0,
      canonicalIds: [],
      lastIngestedAt: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

function formatTs(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

export default async function CorpusPage() {
  const data = await getCorpusData()

  return (
    <main className="page">
      <header className="site-header">
        <h1>Corpus Status</h1>
        <p className="tagline">Ingested provisions and citation graph.</p>
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
                <span className="label">citations</span>
                <span>{data.citationsTotal}</span>
              </div>
              <div className="preview-row">
                <span className="label">last ingest</span>
                <span className="mono" style={{ fontSize: 12 }}>{formatTs(data.lastIngestedAt)}</span>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-title">Loaded provisions ({data.canonicalIds.length})</div>
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

      <div style={{ marginTop: 32 }}>
        <a href="/" style={{ color: 'var(--muted)', fontSize: 12 }}>← back to resolver</a>
      </div>
    </main>
  )
}
