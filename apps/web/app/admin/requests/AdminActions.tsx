'use client'

import { useState } from 'react'

type Status = 'requested' | 'queued' | 'loading' | 'loaded' | 'failed' | 'ignored'

export function AdminActions({ canonicalId, initialStatus }: { canonicalId: string; initialStatus: Status }) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [busy, setBusy] = useState(false)

  async function act(next: 'queued' | 'loaded' | 'ignored') {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/request-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId, status: next }),
      })
      if (res.ok) setStatus(next)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loaded')  return <span className="admin-status-badge admin-status-loaded">Loaded</span>
  if (status === 'ignored') return <span className="admin-status-badge admin-status-ignored">Ignored</span>
  if (status === 'queued')  return <span className="admin-status-badge admin-status-queued">Queued</span>

  return (
    <span className="admin-actions">
      <button className="admin-action-btn" disabled={busy} onClick={() => act('queued')}>Queue</button>
      <button className="admin-action-btn" disabled={busy} onClick={() => act('loaded')}>Mark Loaded</button>
      <button className="admin-action-btn admin-action-muted" disabled={busy} onClick={() => act('ignored')}>Ignore</button>
    </span>
  )
}
