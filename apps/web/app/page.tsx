'use client'

import { useState, useEffect, useRef } from 'react'
import type { ParsedCitation, ResolvedProvision, ChainGraph, ChainNode } from '@statute-chain/types'
import { formatCanonicalId, extractSubtitle, knownDescription, sourceAttribution } from '../lib/formatCanonicalId'
import { statusBadge, ConfidenceLabel } from '../components/ui'

interface QueryResponse {
  parsed: ParsedCitation
  resolved: ResolvedProvision
  chain: ChainGraph
}

// ── Relationship trust helpers ────────────────────────────────────────────────

function confidenceLabel(value: number | undefined): 'High' | 'Medium' | 'Low' {
  if (value === undefined) return 'High' // parser-direct citations default High
  if (value >= 0.9) return 'High'
  if (value >= 0.7) return 'Medium'
  return 'Low'
}

type RelationshipMeta = {
  explanation: string
  type: string
  confidence: 'High' | 'Medium' | 'Low'
  method: string
}

function nodeRelationship(node: ChainNode, edges: ChainGraph['edges']): RelationshipMeta {
  // Prefer explanation from the actual relationship data stored on the inbound edge
  const inboundEdge = edges.find(e => e.to === node.canonical_id)
  if (inboundEdge?.relationship) {
    const rel = inboundEdge.relationship
    return {
      explanation: rel.explanation,
      type: rel.relationship_type,
      confidence: confidenceLabel(rel.confidence),
      method: rel.source_method,
    }
  }

  // Fall back to status-based derivation (backward compat / missing relationship data)
  switch (node.status) {
    case 'alias_resolved':
      return {
        explanation: 'This citation resolves to the linked canonical authority.',
        type: 'alias',
        confidence: confidenceLabel(node.confidence),
        method: 'parser',
      }
    case 'ambiguous':
      return {
        explanation: 'This citation matched multiple authorities; the closest match is shown.',
        type: 'references',
        confidence: 'Medium',
        method: 'parser',
      }
    case 'not_ingested':
    case 'not_found':
      return {
        explanation: 'Referenced in the text of this statute but not yet loaded in corpus.',
        type: 'references',
        confidence: 'High',
        method: 'parser',
      }
    default:
      return {
        explanation: 'Referenced directly in the text of this statute.',
        type: 'references',
        confidence: 'High',
        method: 'parser',
      }
  }
}

function WhyLinked({ meta }: { meta: RelationshipMeta }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="why-linked">
      <button className="why-btn" onClick={() => setOpen(o => !o)}>
        {open ? '▲ Why linked?' : '▼ Why linked?'}
      </button>
      {open && (
        <div className="why-panel">
          <div className="why-row">{meta.explanation}</div>
          <div className="why-meta">
            <span className="why-label">Type</span><span className="why-value">{meta.type}</span>
            <span className="why-label">Confidence</span><span className={`why-value why-conf-${meta.confidence.toLowerCase()}`}>{meta.confidence}</span>
            <span className="why-label">Method</span><span className="why-value">{meta.method}</span>
          </div>
        </div>
      )}
    </div>
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

function RequestLoadButton({ canonicalId, rawInput }: { canonicalId: string; rawInput: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function request() {
    setState('loading')
    try {
      await fetch('/api/request-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId, raw_input: rawInput }),
      })
    } finally {
      setState('done')
    }
  }

  if (state === 'done') {
    return <span className="request-thanks">Thanks. Requests help prioritize coverage.</span>
  }

  return (
    <button
      className="request-load-btn"
      disabled={state === 'loading'}
      onClick={request}
    >
      {state === 'loading' ? 'Requesting…' : 'Request This Law'}
    </button>
  )
}

function AttributionBlock({ provenance }: { provenance: ResolvedProvision['provenance'] }) {
  const attr = sourceAttribution(provenance.source)
  if (!attr) {
    return <div className="attribution-block"><span className="attribution-unavailable">Source metadata unavailable</span></div>
  }
  const date = provenance.ingested_at
    ? new Date(provenance.ingested_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : null
  return (
    <div className="attribution-block">
      {attr.official && <span className="badge badge-official">Official Source</span>}
      {!attr.official && <span className="badge badge-source-available">Source Available</span>}
      <span className="attribution-name">{attr.name}</span>
      {date && <span className="attribution-date">Retrieved {date}</span>}
      <a href={attr.url} target="_blank" rel="noopener noreferrer" className="attribution-link">
        View official text →
      </a>
    </div>
  )
}

function NavigationCard({
  data,
  articleSections,
  onResolve,
  onSelectSection,
}: {
  data: ParsedCitation
  articleSections: string[] | null
  onResolve: () => void
  onSelectSection: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const label = data.canonical_id
    ? formatCanonicalId(data.canonical_id)
    : data.raw

  function copyId() {
    if (!data.canonical_id) return
    navigator.clipboard.writeText(data.canonical_id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="nav-card">
      <div className="nav-card-label">{label}</div>
      {data.canonical_id && (
        <div className="node-canonical" style={{ marginBottom: 12 }}>{data.canonical_id}</div>
      )}
      <div className="nav-card-actions">
        <button className="nav-action-btn nav-action-primary" onClick={onResolve}>
          Resolve chain →
        </button>
        {data.canonical_id && (
          <button className="nav-action-btn" onClick={copyId}>
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        )}
      </div>
      {articleSections && articleSections.length > 0 && (
        <div className="nav-sections">
          <div className="nav-sections-label">Loaded sections</div>
          {articleSections.map((id) => {
            const sec = id.split('/').slice(2).join('/')
            return (
              <button key={id} className="nav-section-btn" onClick={() => onSelectSection(id)}>
                §{sec}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
        <ConfidenceLabel value={data.confidence} />
      </div>
    </div>
  )
}

function ResolveCard({ data, onSelectSection }: { data: ResolvedProvision; onSelectSection?: (id: string) => void }) {
  return (
    <div className="resolve-card">
      <div className="preview-row">
        <span className="label">status</span>
        <span>{statusBadge(data.status)}</span>
      </div>
      <div className="preview-row">
        <span className="label">citation</span>
        <span>
          {formatCanonicalId(data.canonical_id)}
          <span className="node-canonical" style={{ display: 'block' }}>{data.canonical_id}</span>
        </span>
      </div>
      <div className="preview-row">
        <span className="label">confidence</span>
        <ConfidenceLabel value={data.confidence} />
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
      {data.status === 'article_partial' && data.article_sections && (
        <div className="preview-row">
          <span className="label">note</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {data.label ?? formatCanonicalId(data.canonical_id)} not directly loaded
          </span>
        </div>
      )}
      {data.article_sections && data.article_sections.length > 0 && (
        <div className="preview-row">
          <span className="label">sections</span>
          <span>
            {data.article_sections.map((id) => (
              <span
                key={id}
                className={`article-section-item${onSelectSection ? ' article-section-link' : ''}`}
                onClick={() => onSelectSection?.(id)}
              >
                {formatCanonicalId(id)}
              </span>
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
          <span className="label">references</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {data.outbound_citations.length} linked authorit{data.outbound_citations.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}
    </div>
  )
}

function NodeRow({ node, edges, onSelect }: { node: ChainNode; edges: ChainGraph['edges']; onSelect?: (id: string) => void }) {
  const [open, setOpen] = useState(node.depth === 0)
  const whyMeta = node.depth > 0 ? nodeRelationship(node, edges) : null
  const children = edges.filter((e) => e.from === node.canonical_id).map((e) => e.to)
  const subtitle = knownDescription(node.canonical_id) ?? extractSubtitle(node.text)
  const isMissing = node.status === 'not_ingested' || node.status === 'not_found'
  const isLoaded = node.status === 'ingested' || node.status === 'alias_resolved'

  return (
    <div className={`node-row${isMissing ? ' node-row-missing' : ''}`} style={{ paddingLeft: node.depth * 20 }}>
      <div
        className="node-header"
        onClick={() => node.text ? setOpen((o) => !o) : onSelect?.(node.canonical_id)}
        style={{ cursor: node.text || onSelect ? 'pointer' : 'default' }}
      >
        <span className="node-connector">{node.depth === 0 ? '◉' : '└'}</span>
        <span className="node-label">{formatCanonicalId(node.canonical_id)}</span>
        {statusBadge(node.status)}
        {node.text && <span className="toggle-hint">{open ? '▲' : '▼'}</span>}
        {!node.text && onSelect && !isMissing && <span className="toggle-hint">→</span>}
      </div>
      {subtitle && !open && <div className="node-subtitle">{subtitle}</div>}
      {whyMeta && <WhyLinked meta={whyMeta} />}
      {isMissing && (
        <div className="node-missing-note">
          Recognized citation — full text not yet loaded in corpus.
          {(() => {
            const parts = node.canonical_id.split('/')
            const parent = parts.length > 3 ? parts.slice(0, -1).join('/') : null
            return parent && onSelect
              ? <> <span className="node-missing-action" onClick={() => onSelect(parent)}>Browse parent article →</span></>
              : null
          })()}
          <div className="node-missing-actions">
            <RequestLoadButton canonicalId={node.canonical_id} rawInput={node.canonical_id} />
          </div>
        </div>
      )}
      {node.status === 'alias_resolved' && node.resolved_from && (
        <div className="node-meta">alias of <span className="mono">{node.resolved_from}</span></div>
      )}
      {node.status === 'ambiguous' && node.candidates && (
        <div className="node-meta">
          candidates:{' '}
          {node.candidates.map((c) => <span key={c} className="mono candidate">{c} </span>)}
        </div>
      )}
      {open && node.text && (
        <div className="node-text">
          {node.text.slice(0, 400)}{node.text.length > 400 ? '…' : ''}
        </div>
      )}
      {isLoaded && open && (
        <AttributionBlock provenance={node.provenance} />
      )}
      {isLoaded && !open && node.provenance.source !== 'unknown' && node.provenance.source && (
        <div className="node-source-inline">
          {sourceAttribution(node.provenance.source)?.official
            ? <span className="badge badge-official" style={{ marginLeft: 0 }}>Official Source</span>
            : <span className="badge badge-source-available" style={{ marginLeft: 0 }}>Source Available</span>}
        </div>
      )}
      {children.length > 0 && (
        <div className="node-children">
          links to:{' '}
          {children.map((id) => (
            <span key={id} className="child-label" onClick={() => onSelect?.(id)}>
              {formatCanonicalId(id)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultSummary({ data }: { data: QueryResponse }) {
  const { chain, resolved } = data
  const nodes = Object.values(chain.nodes)
  const foundCount = nodes.filter((n) => n.status === 'ingested' || n.status === 'alias_resolved' || n.status === 'article_partial').length
  const missingCount = nodes.filter((n) => n.status === 'not_ingested' || n.status === 'not_found').length + chain.unresolved.length
  const federalCount = nodes.filter((n) => n.canonical_id.startsWith('federal/')).length

  return (
    <div className="result-summary">
      <div className="summary-label">{formatCanonicalId(resolved.canonical_id)}</div>
      <div className="summary-stats">
        <span className="summary-stat">
          <span className="summary-stat-value">{chain.edges.length}</span>
          <span className="summary-stat-key">linked</span>
        </span>
        <span className="summary-divider" />
        <span className="summary-stat">
          <span className="summary-stat-value text-green">{foundCount}</span>
          <span className="summary-stat-key">found</span>
        </span>
        <span className="summary-divider" />
        <span className="summary-stat">
          <span className="summary-stat-value" style={{ color: missingCount > 0 ? 'var(--amber)' : 'var(--muted)' }}>{missingCount}</span>
          <span className="summary-stat-key">missing</span>
        </span>
        <span className="summary-divider" />
        <span className="summary-stat">
          <span className="summary-stat-value" style={{ color: 'var(--blue)' }}>{federalCount}</span>
          <span className="summary-stat-key">federal</span>
        </span>
      </div>
    </div>
  )
}

function ChainView({ data, onSelectNode }: { data: QueryResponse; onSelectNode?: (id: string) => void }) {
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
          <NodeRow key={node.canonical_id} node={node} edges={chain.edges} {...(onSelectNode ? { onSelect: onSelectNode } : {})} />
        ))}
      </div>
      {chain.unresolved.length > 0 && (
        <div className="unresolved">
          <div className="unresolved-label">Referenced but not yet loaded</div>
          {chain.unresolved.map((id) => (
            <div key={id} className="mono muted" style={{ fontSize: 12 }}>{formatCanonicalId(id)}</div>
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
        {open ? '▲ hide debug' : '▼ show debug'}
      </button>
      {open && (
        <div className="debug-panel">
          <div className="section-title" style={{ marginBottom: 8 }}>Parse</div>
          <ParseCard data={data.parsed} />
          <div className="section-title" style={{ margin: '12px 0 8px' }}>Resolve</div>
          <ResolveCard data={data.resolved} />
          <div className="section-title" style={{ margin: '12px 0 8px' }}>Raw JSON</div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [input, setInput] = useState('')
  const [parsePreview, setParsePreview] = useState<ParsedCitation | null>(null)
  const [articleSections, setArticleSections] = useState<string[] | null>(null)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = input.trim()
    if (!trimmed) { setParsePreview(null); setArticleSections(null); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/parse?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) return
      const parsed = await res.json() as ParsedCitation
      setParsePreview(parsed)
      // For article-level canonical IDs (section has no dot), fetch children
      if (parsed.canonical_id && !/\./.test(parsed.section)) {
        const qres = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        })
        if (qres.ok) {
          const qdata = await qres.json() as QueryResponse
          setArticleSections(qdata.resolved.article_sections ?? null)
        }
      } else {
        setArticleSections(null)
      }
    }, 300)
  }, [input])

  async function resolve(query: string) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (trimmed) resolve(trimmed)
  }

  function selectSection(canonicalId: string) {
    const label = formatCanonicalId(canonicalId)
    setInput(label)
    resolve(label)
  }

  return (
    <main className="page">
      <header className="site-header">
        <h1>Statute Explorer</h1>
        <p className="tagline">Enter a legal citation to explore its referenced authorities.</p>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="citation-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 21 U.S.C. § 802 or NY Penal Law 220.16"
          autoFocus
          spellCheck={false}
        />
        <div className="example-pills">
          {['21 U.S.C. § 802', 'NY Penal Law 220.16', '21 U.S.C. § 812'].map((ex) => (
            <button
              key={ex}
              type="button"
              className="example-pill"
              onClick={() => setInput(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
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
          <NavigationCard
            data={parsePreview}
            articleSections={articleSections}
            onResolve={() => resolve(input.trim())}
            onSelectSection={selectSection}
          />
        </section>
      )}

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <>
          <ResultSummary data={result} />

          <section className="section">
            <div className="section-title">Referenced statutes</div>
            <ChainView data={result} onSelectNode={selectSection} />
          </section>

          {result.resolved.article_sections && result.resolved.article_sections.length > 0 && (
            <section className="section">
              <div className="section-title">Available sections</div>
              <ResolveCard data={result.resolved} onSelectSection={selectSection} />
            </section>
          )}

          <DebugPanel data={result} />
        </>
      )}
      <footer className="site-footer">
        Informational research tool. Verify conclusions against official sources and current law.
      </footer>
    </main>
  )
}
