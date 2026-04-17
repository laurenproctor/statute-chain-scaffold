'use client'

import { useState, useEffect, useRef } from 'react'
import type { ParsedCitation, ResolvedProvision, ChainGraph, ChainNode } from '@statute-chain/types'

interface QueryResponse {
  parsed: ParsedCitation
  resolved: ResolvedProvision
  chain: ChainGraph
}

function statusBadge(status: ChainNode['status']) {
  const cls: Record<string, string> = {
    ingested: 'badge-ingested',
    alias_resolved: 'badge-alias',
    not_ingested: 'badge-missing',
    not_found: 'badge-missing',
    ambiguous: 'badge-ambiguous',
    parse_failed: 'badge-error',
  }
  const labels: Record<string, string> = {
    ingested: 'found',
    alias_resolved: 'alias',
    not_ingested: 'not ingested',
    not_found: 'not found',
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

function ParseCard({ data }: { data: ParsedCitation }) {
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

function ResolveCard({ data }: { data: ResolvedProvision }) {
  return (
    <div className="resolve-card">
      <div className="preview-row">
        <span className="label">status</span>
        <span>{statusBadge(data.status)}</span>
      </div>
      <div className="preview-row">
        <span className="label">canonical id</span>
        <span className="mono">{data.canonical_id}</span>
      </div>
      <div className="preview-row">
        <span className="label">confidence</span>
        <ConfidencePip value={data.confidence} />
      </div>
      {data.resolved_from && (
        <div className="preview-row">
          <span className="label">alias of</span>
          <span className="mono">{data.resolved_from}</span>
        </div>
      )}
      {data.candidates && data.candidates.length > 0 && (
        <div className="preview-row">
          <span className="label">candidates</span>
          <span>
            {data.candidates.map((c) => (
              <span key={c} className="mono candidate">{c} </span>
            ))}
          </span>
        </div>
      )}
      <div className="preview-row">
        <span className="label">source</span>
        <span className="muted">{data.provenance.source}</span>
      </div>
      {data.outbound_citations.length > 0 && (
        <div className="preview-row">
          <span className="label">outbound</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {data.outbound_citations.length} citation{data.outbound_citations.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

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

function ChainView({ data }: { data: QueryResponse }) {
  const { chain } = data
  const sorted = Object.values(chain.nodes).sort(
    (a, b) => a.depth - b.depth || a.canonical_id.localeCompare(b.canonical_id),
  )

  return (
    <div className="chain-view">
      <div className="chain-meta">
        <span>{chain.total_nodes} node{chain.total_nodes !== 1 ? 's' : ''}</span>
        <span>{chain.edges.length} edge{chain.edges.length !== 1 ? 's' : ''}</span>
        <span>{chain.query_ms}ms</span>
        {chain.truncated && (
          <span className="text-amber">truncated · {chain.truncation_reason}</span>
        )}
      </div>
      <div className="nodes-list">
        {sorted.map((node) => (
          <NodeRow key={node.canonical_id} node={node} edges={chain.edges} />
        ))}
      </div>
      {chain.unresolved.length > 0 && (
        <div className="unresolved">
          <div className="unresolved-label">not yet ingested</div>
          {chain.unresolved.map((id) => (
            <div key={id} className="mono muted" style={{ fontSize: 12 }}>{id}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function DebugPanel({ data }: { data: QueryResponse }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="debug-wrapper">
      <button className="debug-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▲ hide JSON' : '▼ show JSON'}
      </button>
      {open && (
        <div className="debug-panel">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [input, setInput] = useState('')
  const [parsePreview, setParsePreview] = useState<ParsedCitation | null>(null)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = input.trim()
    if (!trimmed) { setParsePreview(null); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/parse?q=${encodeURIComponent(trimmed)}`)
      if (res.ok) setParsePreview(await res.json() as ParsedCitation)
    }, 200)
  }, [input])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json() as { error: string }
        setError(body.error)
      } else {
        setResult(await res.json() as QueryResponse)
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
          <button
            className="submit-btn"
            type="submit"
            disabled={loading || !input.trim()}
          >
            {loading ? 'resolving…' : 'Resolve →'}
          </button>
        </div>
      </form>

      {parsePreview && !result && (
        <section className="section">
          <div className="section-title">Parse preview</div>
          <ParseCard data={parsePreview} />
        </section>
      )}

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <>
          <section className="section">
            <div className="section-title">Parse</div>
            <ParseCard data={result.parsed} />
          </section>

          <section className="section">
            <div className="section-title">Resolve</div>
            <ResolveCard data={result.resolved} />
          </section>

          <section className="section">
            <div className="section-title">Chain</div>
            <ChainView data={result} />
          </section>

          <DebugPanel data={result} />
        </>
      )}
    </main>
  )
}
