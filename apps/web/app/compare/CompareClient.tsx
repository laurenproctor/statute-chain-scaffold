'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ParsedCitation, ResolvedProvision, ChainGraph } from '@statute-chain/types'
import { formatCanonicalId, sourceAttribution } from '../../lib/formatCanonicalId'
import { statusBadge, ConfidenceLabel } from '../../components/ui'

// ── Trust helpers ─────────────────────────────────────────────────────────────

function confidenceLabel(v: number | undefined): 'High' | 'Medium' | 'Low' {
  if (v === undefined) return 'High'
  if (v >= 0.9) return 'High'
  if (v >= 0.7) return 'Medium'
  return 'Low'
}

type AuthorityContext = 'shared' | 'left' | 'right'

const CONTEXT_EXPLANATION: Record<AuthorityContext, string> = {
  shared: 'Referenced in the text of both statutes.',
  left:   'Referenced in the text of Law A only.',
  right:  'Referenced in the text of Law B only.',
}

function AuthorityWhyLinked({ context }: { context: AuthorityContext }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="why-linked">
      <button className="why-btn" onClick={() => setOpen(o => !o)}>
        {open ? '▲ Why linked?' : '▼ Why linked?'}
      </button>
      {open && (
        <div className="why-panel">
          <div className="why-row">{CONTEXT_EXPLANATION[context]}</div>
          <div className="why-meta">
            <span className="why-label">Type</span><span className="why-value">references</span>
            <span className="why-label">Confidence</span><span className={`why-value why-conf-${confidenceLabel(undefined).toLowerCase()}`}>{confidenceLabel(undefined)}</span>
            <span className="why-label">Method</span><span className="why-value">parser</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueryResponse {
  parsed: ParsedCitation
  resolved: ResolvedProvision
  chain: ChainGraph
}

interface SideState {
  result: QueryResponse | null
  error: string | null
  loading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryOne(q: string): Promise<QueryResponse> {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  })
  const body = await res.json() as QueryResponse & { error?: string }
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body
}

function referencedAuthorityIds(result: QueryResponse): Set<string> {
  const root = result.resolved.canonical_id
  return new Set(Object.keys(result.chain.nodes).filter(id => id !== root))
}

interface AuthorityComparison {
  leftIds:  Set<string>
  rightIds: Set<string>
  shared:    string[]
  onlyLeft:  string[]
  onlyRight: string[]
}

function compareAuthorities(left: QueryResponse, right: QueryResponse): AuthorityComparison {
  const leftIds  = referencedAuthorityIds(left)
  const rightIds = referencedAuthorityIds(right)
  return {
    leftIds,
    rightIds,
    shared:    [...leftIds].filter(id => rightIds.has(id)).sort(),
    onlyLeft:  [...leftIds].filter(id => !rightIds.has(id)).sort(),
    onlyRight: [...rightIds].filter(id => !leftIds.has(id)).sort(),
  }
}

function isLoaded(r: QueryResponse) {
  return r.resolved.status === 'ingested' || r.resolved.status === 'alias_resolved'
}

function jurisdictionLabel(id: string) {
  const j = id.split('/')[0]
  if (j === 'ny')      return 'New York'
  if (j === 'federal') return 'Federal'
  return j ?? id
}

function codeLabel(parsed: ParsedCitation) {
  if (parsed.jurisdiction === 'federal' && parsed.code.startsWith('usc/')) {
    return `${parsed.code.split('/')[1]} U.S.C.`
  }
  const NY: Record<string, string> = {
    penal: 'Penal Law', phl: 'Public Health Law', cplr: 'Civil Practice Law & Rules',
    vtl: 'Vehicle & Traffic Law', ed: 'Education Law', gbl: 'General Business Law',
  }
  return NY[parsed.code] ?? parsed.code
}

// ── Key Takeaways ─────────────────────────────────────────────────────────────

function keyTakeaways(left: QueryResponse | null, right: QueryResponse | null): string[] {
  const bullets: string[] = []

  if (!left && !right) return []

  // Recognition
  if (left && right) bullets.push('Both references recognized')
  else if (left)     bullets.push('Law A recognized — Law B could not be resolved')
  else               bullets.push('Law B recognized — Law A could not be resolved')

  if (!left || !right) return bullets

  // Corpus availability
  const lLoaded = isLoaded(left)
  const rLoaded = isLoaded(right)
  if (lLoaded && rLoaded)   bullets.push('Both provisions loaded in corpus')
  else if (lLoaded)         bullets.push('Law A loaded in corpus — Law B not yet available')
  else if (rLoaded)         bullets.push('Law B loaded in corpus — Law A not yet available')
  else                      bullets.push('Neither provision is currently loaded in corpus')

  // Jurisdiction
  const lJ = left.resolved.canonical_id.split('/')[0]
  const rJ = right.resolved.canonical_id.split('/')[0]
  if (lJ === rJ) {
    bullets.push(`Same jurisdiction: ${jurisdictionLabel(left.resolved.canonical_id)}`)
  } else {
    bullets.push(`Cross-jurisdiction: ${jurisdictionLabel(left.resolved.canonical_id)} vs ${jurisdictionLabel(right.resolved.canonical_id)}`)
  }

  // Code family
  const lC = left.parsed.code
  const rC = right.parsed.code
  if (lC && rC && lC === rC) {
    bullets.push(`Same code family: ${codeLabel(left.parsed)}`)
  } else if (lC && rC) {
    bullets.push(`Different code families: ${codeLabel(left.parsed)} vs ${codeLabel(right.parsed)}`)
  }

  // Shared referenced authorities
  const cmp = compareAuthorities(left, right)
  const sharedCount = cmp.shared.length
  if (sharedCount > 0) {
    bullets.push(`${sharedCount} shared referenced authorit${sharedCount !== 1 ? 'ies' : 'y'}`)
  } else if (cmp.leftIds.size > 0 || cmp.rightIds.size > 0) {
    bullets.push('No shared referenced authorities')
  }

  // Coverage breadth
  const lE = cmp.leftIds.size
  const rE = cmp.rightIds.size
  if (lE !== rE && (lE > 0 || rE > 0)) {
    if (lE > rE) bullets.push(`Law A has broader reference network (${lE} vs ${rE} linked authorities)`)
    else         bullets.push(`Law B has broader reference network (${rE} vs ${lE} linked authorities)`)
  }

  return bullets
}

// ── Differences Table ─────────────────────────────────────────────────────────

function DiffTable({ left, right, cmp }: { left: QueryResponse; right: QueryResponse; cmp: AuthorityComparison }) {
  const lAttr = sourceAttribution(left.resolved.provenance.source)
  const rAttr = sourceAttribution(right.resolved.provenance.source)

  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['Jurisdiction',
      jurisdictionLabel(left.resolved.canonical_id),
      jurisdictionLabel(right.resolved.canonical_id)],
    ['Code', codeLabel(left.parsed), codeLabel(right.parsed)],
    ['Section', left.parsed.section || '—', right.parsed.section || '—'],
    ['Status', statusBadge(left.resolved.status), statusBadge(right.resolved.status)],
    ['Loaded in corpus',
      isLoaded(left) ? <span className="text-green">Yes</span> : <span className="muted">No</span>,
      isLoaded(right) ? <span className="text-green">Yes</span> : <span className="muted">No</span>],
    ['Reference confidence',
      <ConfidenceLabel key="lc" value={left.parsed.confidence} />,
      <ConfidenceLabel key="rc" value={right.parsed.confidence} />],
    ['Linked authorities', String(cmp.leftIds.size), String(cmp.rightIds.size)],
    ['Official source',
      lAttr?.official ? <span className="text-green">Yes</span> : <span className="muted">{lAttr ? 'Source available' : '—'}</span>,
      rAttr?.official ? <span className="text-green">Yes</span> : <span className="muted">{rAttr ? 'Source available' : '—'}</span>],
    ['Retrieved',
      left.resolved.provenance.ingested_at
        ? new Date(left.resolved.provenance.ingested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      right.resolved.provenance.ingested_at
        ? new Date(right.resolved.provenance.ingested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—'],
  ]

  const lId = left.resolved.canonical_id
  const rId = right.resolved.canonical_id
  const same = (a: unknown, b: unknown) => String(a) === String(b)

  return (
    <table className="diff-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>{formatCanonicalId(lId)}</th>
          <th>{formatCanonicalId(rId)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, lVal, rVal]) => {
          const highlight = !same(lVal, rVal)
          return (
            <tr key={label} className={highlight ? 'diff-row-differ' : ''}>
              <td className="diff-category">{label}</td>
              <td>{lVal}</td>
              <td>{rVal}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Referenced Authorities ────────────────────────────────────────────────────

function AuthorityOverlap({ cmp }: { cmp: AuthorityComparison }) {
  const { leftIds, rightIds, shared, onlyLeft, onlyRight } = cmp

  if (leftIds.size === 0 && rightIds.size === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>No linked authorities found on either side.</p>
  }

  return (
    <div className="authority-overlap">
      <div className="authority-group">
        <div className="authority-group-label authority-shared">Shared Authorities ({shared.length})</div>
        {shared.length === 0
          ? <span className="muted" style={{ fontSize: 12 }}>None</span>
          : shared.map(id => <AuthorityItem key={id} id={id} context="shared" />)}
      </div>
      <div className="authority-group">
        <div className="authority-group-label authority-left">Unique to Law A ({onlyLeft.length})</div>
        {onlyLeft.length === 0
          ? <span className="muted" style={{ fontSize: 12 }}>None</span>
          : onlyLeft.map(id => <AuthorityItem key={id} id={id} context="left" />)}
      </div>
      <div className="authority-group">
        <div className="authority-group-label authority-right">Unique to Law B ({onlyRight.length})</div>
        {onlyRight.length === 0
          ? <span className="muted" style={{ fontSize: 12 }}>None</span>
          : onlyRight.map(id => <AuthorityItem key={id} id={id} context="right" />)}
      </div>
    </div>
  )
}

function AuthorityItem({ id, context }: { id: string; context: AuthorityContext }) {
  return (
    <div className="authority-item">
      <a href={`/?q=${encodeURIComponent(id)}`} className="authority-item-link">
        {formatCanonicalId(id)}
      </a>
      <span className="authority-item-canonical">{id}</span>
      <AuthorityWhyLinked context={context} />
    </div>
  )
}

// ── Side Panel ────────────────────────────────────────────────────────────────

function SidePanel({ label, side, authorityCount }: { label: string; side: SideState; authorityCount?: number }) {
  if (side.loading) {
    return (
      <div className="compare-side compare-side-loading">
        <div className="compare-side-label">{label}</div>
        <p className="muted" style={{ fontSize: 13 }}>Resolving…</p>
      </div>
    )
  }

  if (side.error || !side.result) {
    return (
      <div className="compare-side compare-side-missing">
        <div className="compare-side-label">{label}</div>
        <p className="compare-missing-msg">
          {side.error ?? 'Enter a reference above to compare.'}
        </p>
      </div>
    )
  }

  const { resolved, parsed, chain } = side.result
  const attr = sourceAttribution(resolved.provenance.source)
  const subtitle = resolved.text
    ? resolved.text.replace(/\s+/g, ' ').trim().slice(0, 120) + (resolved.text.length > 120 ? '…' : '')
    : null
  const missing = resolved.status === 'not_ingested' || resolved.status === 'not_found'

  return (
    <div className={`compare-side${missing ? ' compare-side-missing' : ''}`}>
      <div className="compare-side-label">{label}</div>

      <div className="compare-side-title">{formatCanonicalId(resolved.canonical_id)}</div>
      <div className="compare-side-canonical">{resolved.canonical_id}</div>

      <div style={{ marginTop: 8 }}>
        {statusBadge(resolved.status)}
        <span style={{ marginLeft: 8 }}>
          <ConfidenceLabel value={parsed.confidence} />
        </span>
      </div>

      {missing && (
        <p className="compare-missing-msg" style={{ marginTop: 10 }}>
          This reference was recognized but its full text is not yet loaded in corpus.
          {resolved.status !== 'not_found' && (
            <> <a href="/admin/requests" className="compare-missing-action">Request load →</a></>
          )}
        </p>
      )}

      {subtitle && !missing && (
        <p className="compare-side-text">{subtitle}</p>
      )}

      {attr && (
        <div className="compare-attribution">
          {attr.official
            ? <span className="badge badge-official">Official Source</span>
            : <span className="badge badge-source-available">Source Available</span>}
          <span className="attribution-name">{attr.name}</span>
          <a href={attr.url} target="_blank" rel="noopener noreferrer" className="attribution-link">
            View official text →
          </a>
        </div>
      )}

      {authorityCount !== undefined && authorityCount > 0 && (
        <div className="compare-side-stat">
          {authorityCount} linked authorit{authorityCount !== 1 ? 'ies' : 'y'}
        </div>
      )}
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export function CompareClient() {
  const router = useRouter()
  const params = useSearchParams()

  const [leftInput, setLeftInput]   = useState(params.get('left') ?? '')
  const [rightInput, setRightInput] = useState(params.get('right') ?? '')
  const [left,  setLeft]  = useState<SideState>({ result: null, error: null, loading: false })
  const [right, setRight] = useState<SideState>({ result: null, error: null, loading: false })

  // Auto-run on mount if URL params present
  useEffect(() => {
    const l = params.get('left')
    const r = params.get('right')
    if (l && r) runCompare(l, r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runCompare(l: string, r: string) {
    const lt = l.trim()
    const rt = r.trim()
    if (!lt || !rt) return

    setLeft({ result: null, error: null, loading: true })
    setRight({ result: null, error: null, loading: true })

    const [lRes, rRes] = await Promise.allSettled([queryOne(lt), queryOne(rt)])

    setLeft(lRes.status === 'fulfilled'
      ? { result: lRes.value, error: null, loading: false }
      : { result: null, error: lRes.reason instanceof Error ? lRes.reason.message : 'Failed to resolve', loading: false })

    setRight(rRes.status === 'fulfilled'
      ? { result: rRes.value, error: null, loading: false }
      : { result: null, error: rRes.reason instanceof Error ? rRes.reason.message : 'Failed to resolve', loading: false })

    router.push(`/compare?left=${encodeURIComponent(lt)}&right=${encodeURIComponent(rt)}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runCompare(leftInput, rightInput)
  }

  function swap() {
    setLeftInput(rightInput)
    setRightInput(leftInput)
  }

  const bothReady = left.result !== null && right.result !== null
  const anyReady  = left.result !== null || right.result !== null
  const cmp = bothReady ? compareAuthorities(left.result!, right.result!) : null
  const takeaways = keyTakeaways(left.result, right.result)

  return (
    <main className="page compare-page">
      <header className="site-header">
        <div style={{ maxWidth: '66.666%' }}>
          <p className="page-eyebrow">Compare Laws</p>
          <h1>See How Laws Align, Diverge, and Change</h1>
          <p className="tagline">Compare two references and surface scope differences, definitional mismatches, and changes over time, with every linked authority resolved in place.</p>
          <p className="scope-label">Works for statutes, regulations, contracts, treaties, and model codes.</p>
        </div>
      </header>

      <form className="compare-form" onSubmit={handleSubmit}>
        <div className="compare-inputs">
          <div className="compare-input-group">
            <label className="compare-input-label">Law A</label>
            <input
              className="citation-input"
              value={leftInput}
              onChange={e => setLeftInput(e.target.value)}
              placeholder="e.g. 21 U.S.C. § 812"
              spellCheck={false}
            />
          </div>

          <button type="button" className="swap-btn" onClick={swap} title="Swap A and B">
            ⇄
          </button>

          <div className="compare-input-group">
            <label className="compare-input-label">Law B</label>
            <input
              className="citation-input"
              value={rightInput}
              onChange={e => setRightInput(e.target.value)}
              placeholder="e.g. NY Public Health Law § 3306"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="example-chips" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="example-chip"
            onClick={() => { setLeftInput('21 U.S.C. § 812'); setRightInput('NY Public Health Law § 3306') }}
          >
            21 U.S.C. § 812 vs. NY Public Health Law § 3306
          </button>
          <button
            type="button"
            className="example-chip"
            onClick={() => { setLeftInput('NY Penal Law 220.16'); setRightInput('NY Penal Law 220.16') }}
          >
            NY Penal Law 220.16 (2019) vs. NY Penal Law 220.16 (2024)
          </button>
          <button
            type="button"
            className="example-chip"
            onClick={() => { setLeftInput('NY Penal Law 220.16'); setRightInput('NY Penal Law 220.18') }}
          >
            NY Penal Law 220.16 vs. NY Penal Law 220.18
          </button>
        </div>

        <div className="form-controls" style={{ marginTop: 10 }}>
          <button
            className="submit-btn"
            type="submit"
            disabled={!leftInput.trim() || !rightInput.trim() || left.loading || right.loading}
          >
            {left.loading || right.loading ? 'Comparing…' : 'Compare →'}
          </button>
        </div>
      </form>

      {anyReady && takeaways.length > 0 && (
        <section className="section">
          <div className="section-title">Key Takeaways</div>
          <div className="takeaways-block">
            {takeaways.map((t, i) => (
              <div key={i} className="takeaway-item">
                <span className="takeaway-bullet">·</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="compare-columns">
        <SidePanel label="Law A" side={left} {...(cmp ? { authorityCount: cmp.leftIds.size } : {})} />
        <SidePanel label="Law B" side={right} {...(cmp ? { authorityCount: cmp.rightIds.size } : {})} />
      </div>

      {bothReady && cmp && (
        <>
          <section className="section">
            <div className="section-title">Differences</div>
            <DiffTable left={left.result!} right={right.result!} cmp={cmp} />
          </section>

          <section className="section">
            <div className="section-title">Referenced Authorities</div>
            <p className="section-subtitle">Authorities, definitions, and linked provisions relevant to each law.</p>
            <AuthorityOverlap cmp={cmp} />
          </section>
        </>
      )}

    </main>
  )
}
