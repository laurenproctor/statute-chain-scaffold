'use client'

import { useState, useEffect, useRef } from 'react'
import type { ParsedCitation, ChainGraph, ChainNode } from '@statute-chain/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChainResponse {
  parsed: ParsedCitation
  graph: ChainGraph
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: ChainNode['status']) {
  const cls: Record<string, string> = {
    ingested: 'badge-ingested',
    alias_resolved: 'badge-alias',
    not_ingested: 'badge-missing',
    ambiguous: 'badge-ambiguous',
    parse_failed: 'badge-error',
  }
  const labels: Record<string, string> = {
    ingested: 'found',
    alias_resolved: 'alias',
    not_ingested: 'not ingested',
    ambiguous: 'ambiguous',
    parse_failed: 'parse error',
  }
  return (
    <span className={`badge ${cls[status] ?? 'badge-missing'}`}>
      {labels[status] ?? status}
    </span>
  )
}

function ConfidencePip({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--muted)'
  return (
    <span style={{ color, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
      {pct}%
    </span>
  )
}

// ── Parse Preview ─────────────────────────────────────────────────────────────

function ParsePreview({ data }: { data: ParsedCitation }) {
  return (
    <div className="parse-preview">
      <div className="preview-row">
        <span className="label">format</span>
        <span className={data.format === 'structured' ? 'text-green' : 'text-amber'}>
          {data.format}
        </span>
      </div>
      <div className="preview-row">
        <span className="label">jurisdiction</span>
        <span>{data.jurisdiction}</span>
      </div>
      <div className="preview-row">
        <span className="label">code</span>
        <span>{data.code || <span className="muted">—</span>}</span>
      </div>
      <div className="preview-row">
        <span className="label">section</span>
        <span>{data.section || <span className="muted">—</span>}</span>
      </div>
      {data.subsection_path.length > 0 && (
        <div className="preview-row">
          <span className="label">subsections</span>
          <span>({data.subsection_path.join(')(')}) </span>
        </div>
      )}
      <div className="preview-row">
        <span className="label">canonical id</span>
        <span className="mono">
          {data.canonical_id ?? <span className="muted">none — informal ref</span>}
        </span>
      </div>
      <div className="preview-row">
        <span className="label">confidence</span>
        <ConfidencePip value={data.confidence} />
      </div>
    </div>
  )
}

// ── Chain Node Row ────────────────────────────────────────────────────────────

function NodeRow({ node, edges }: { node: ChainNode; edges: ChainGraph['edges'] }) {
  const [open, setOpen] = useState(node.depth === 0)
  const children = edges.filter((e) => e.from === node.canonical_id).map((e) => e.to)

  return (
    <div className="node-row" style={{ paddingLeft: node.depth * 20 }}>
      <div
        className="node-header"
        onClick={() => node.text && setOpen((o) => !o)}
        style={{ cursor: node.text ? 'pointer' : 'default' }}
      >
        <span className="node-connector">{node.depth === 0 ? '◉' : '└'}</span>
        <span className="mono node-id">{node.canonical_id}</span>
        {statusBadge(node.status)}
        <ConfidencePip value={node.confidence} />
        {node.text && <span className="toggle-hint">{open ? '▲' : '▼'}</span>}
      </div>
      {node.status === 'alias_resolved' && node.resolved_from && (
        <div className="node-meta">
          alias of <span className="mono">{node.resolved_from}</span>
        </div>
      )}
      {node.status === 'ambiguous' && node.candidates && (
        <div className="node-meta">
          candidates:{' '}
          {node.candidates.map((c) => (
            <span key={c} className="mono candidate">{c} </span>
          ))}
        </div>
      )}
      {open && node.text && (
        <div className="node-text">
          {node.text.slice(0, 400)}{node.text.length > 400 ? '…' : ''}
        </div>
      )}
      {children.length > 0 && (
        <div className="node-children">
          → {children.map((id) => (
            <span key={id} className="mono child-ref">{id} </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chain View ────────────────────────────────────────────────────────────────

function ChainView({ data }: { data: ChainResponse }) {
  const { graph } = data
  const sorted = Object.values(graph.nodes).sort(
    (a, b) => a.depth - b.depth || a.canonical_id.localeCompare(b.canonical_id),
  )

  return (
    <div className="chain-view">
      <div className="chain-meta">
        <span>{graph.total_nodes} node{graph.total_nodes !== 1 ? 's' : ''}</span>
        <span>{graph.edges.length} edge{graph.edges.length !== 1 ? 's' : ''}</span>
        <span>{graph.query_ms}ms</span>
        {graph.truncated && (
          <span className="text-amber">truncated · {graph.truncation_reason}</span>
        )}
      </div>
      <div className="nodes-list">
        {sorted.map((node) => (
          <NodeRow key={node.canonical_id} node={node} edges={graph.edges} />
        ))}
      </div>
      {graph.unresolved.length > 0 && (
        <div className="unresolved">
          <div className="unresolved-label">not yet ingested</div>
          {graph.unresolved.map((id) => (
            <div key={id} className="mono muted" style={{ fontSize: 12 }}>{id}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [input, setInput] = useState('')
  const [depth, setDepth] = useState(3)
  const [parseData, setParseData] = useState<ParsedCitation | null>(null)
  const [chainData, setChainData] = useState<ChainResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = input.trim()
    if (!trimmed) { setParseData(null); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/parse?q=${encodeURIComponent(trimmed)}`)
      if (res.ok) setParseData(await res.json() as ParsedCitation)
    }, 200)
  }, [input])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setChainData(null)
    try {
      const res = await fetch('/api/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citation: trimmed, depth }),
      })
      if (!res.ok) {
        const body = await res.json() as { error: string }
        setError(body.error)
      } else {
        setChainData(await res.json() as ChainResponse)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="site-header">
        <h1>Statute Chain</h1>
        <p className="tagline">Paste a citation. Expand the chain.</p>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="citation-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. NY Penal Law 220.16 or 26 U.S.C. § 501(c)(3)"
          autoFocus
          spellCheck={false}
        />
        <div className="form-controls">
          <label className="depth-label">
            depth
            <input
              type="number"
              className="depth-input"
              min={1}
              max={10}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
          </label>
          <button
            className="submit-btn"
            type="submit"
            disabled={loading || !input.trim()}
          >
            {loading ? 'resolving…' : 'Resolve →'}
          </button>
        </div>
      </form>

      {parseData && !chainData && (
        <section className="section">
          <div className="section-title">Parse preview</div>
          <ParsePreview data={parseData} />
        </section>
      )}

      {error && <div className="error-banner">{error}</div>}

      {chainData && (
        <section className="section">
          <div className="section-title">Chain</div>
          <ParsePreview data={chainData.parsed} />
          <ChainView data={chainData} />
        </section>
      )}
    </main>
  )
}
