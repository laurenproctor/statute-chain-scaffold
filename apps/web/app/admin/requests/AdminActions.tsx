'use client'

import { useState } from 'react'

type Status = 'requested' | 'queued' | 'loading' | 'loaded' | 'failed' | 'ignored'
type SourceMode = 'live_api' | 'fixture' | 'manual'

async function updateStatus(canonicalId: string, status: 'queued' | 'loaded' | 'ignored') {
  await fetch('/api/admin/request-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canonical_id: canonicalId, status }),
  })
}

function SourceBadge({ mode, label }: { mode: SourceMode; label: string }) {
  const cls =
    mode === 'live_api' ? 'admin-source-live' :
    mode === 'fixture'  ? 'admin-source-fixture' :
                          'admin-source-manual'
  return <span className={`admin-source-badge ${cls}`}>{label}</span>
}

export function AdminActions({
  canonicalId,
  initialStatus,
  sourceMode,
  sourceLabel,
  initialLastError,
}: {
  canonicalId: string
  initialStatus: Status
  sourceMode: SourceMode
  sourceLabel: string
  initialLastError: string | null
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(initialLastError)

  const ingestLabel = sourceMode === 'fixture' ? 'Load Fixture' : 'Ingest Now'

  async function ingest() {
    setBusy(true)
    setFeedback(null)
    setLastError(null)
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/ingest-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId }),
      })
      const body = await res.json() as { error?: string; provisions?: number; citations?: number }
      if (!res.ok) {
        setStatus('failed')
        setLastError(body.error ?? 'Ingest failed')
      } else {
        setStatus('loaded')
        setFeedback(`Loaded — ${body.provisions ?? 0} provision(s), ${body.citations ?? 0} citation(s)`)
      }
    } catch {
      setStatus('failed')
      setLastError('Network error during ingest')
    } finally {
      setBusy(false)
    }
  }

  async function act(next: 'queued' | 'ignored') {
    setBusy(true)
    try {
      await updateStatus(canonicalId, next)
      setStatus(next)
    } finally {
      setBusy(false)
    }
  }

  const canIngest = sourceMode === 'live_api' || sourceMode === 'fixture'

  return (
    <div className="admin-actions-col">
      <SourceBadge mode={sourceMode} label={sourceLabel} />

      <div className="admin-actions">
        {status === 'loading' && (
          <span className="admin-status-badge admin-status-loading">Loading…</span>
        )}

        {status === 'loaded' && (
          <span className="admin-status-badge admin-status-loaded">Loaded ✓</span>
        )}

        {status === 'failed' && (
          <>
            <span className="admin-status-badge admin-status-failed">Failed</span>
            {canIngest && (
              <button className="admin-action-btn" disabled={busy} onClick={ingest}>
                Retry
              </button>
            )}
          </>
        )}

        {status === 'ignored' && (
          <span className="admin-status-badge admin-status-ignored">Ignored</span>
        )}

        {status === 'queued' && (
          <>
            <span className="admin-status-badge admin-status-queued">Queued</span>
            {canIngest && (
              <button className="admin-action-btn" disabled={busy} onClick={ingest}>
                {ingestLabel}
              </button>
            )}
          </>
        )}

        {status === 'requested' && (
          <>
            {canIngest ? (
              <button className="admin-action-btn admin-action-primary" disabled={busy} onClick={ingest}>
                {ingestLabel}
              </button>
            ) : (
              <span className="admin-status-badge admin-status-manual">Manual Review</span>
            )}
            <button className="admin-action-btn admin-action-muted" disabled={busy} onClick={() => act('ignored')}>
              Ignore
            </button>
          </>
        )}
      </div>

      {status === 'loaded' && feedback && (
        <div className="admin-feedback">{feedback}</div>
      )}
      {(status === 'failed') && lastError && (
        <div className="admin-feedback admin-feedback-error">{lastError}</div>
      )}
    </div>
  )
}
