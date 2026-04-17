import type { IngestionStatus } from '@statute-chain/types'

export function statusBadge(status: IngestionStatus) {
  const cls: Record<string, string> = {
    ingested:        'badge-ingested',
    alias_resolved:  'badge-alias',
    not_ingested:    'badge-missing',
    not_found:       'badge-missing',
    ambiguous:       'badge-ambiguous',
    parse_failed:    'badge-error',
    article_partial: 'badge-ambiguous',
  }
  const labels: Record<string, string> = {
    ingested:        'found',
    alias_resolved:  'alias',
    not_ingested:    'not ingested',
    not_found:       'not found',
    ambiguous:       'ambiguous',
    parse_failed:    'parse error',
    article_partial: 'article',
  }
  return (
    <span className={`badge ${cls[status] ?? 'badge-missing'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export function ConfidenceLabel({ value }: { value: number }) {
  if (value >= 0.90) return <span className="confidence-label confidence-high">High confidence match</span>
  if (value >= 0.60) return <span className="confidence-label confidence-mid">Moderate confidence match</span>
  return <span className="confidence-label confidence-low">Low confidence match</span>
}
