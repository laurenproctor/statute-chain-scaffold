import type { DbClient } from '../resolver/resolveCitation.js'

export interface MissingNode {
  canonical_id: string
  inbound_count: number
  priority_score: number
}

const JURISDICTION_WEIGHT: Record<string, number> = {
  federal: 2.0,
  ny: 1.0,
}

export function scoreMissingNode(canonicalId: string, inboundCount: number): number {
  const jurisdiction = canonicalId.split('/')[0] ?? ''
  const weight = JURISDICTION_WEIGHT[jurisdiction] ?? 0.5
  return inboundCount * weight
}

export async function logMissingNodes(
  _fromId: string,
  missingIds: string[],
  db: DbClient,
): Promise<void> {
  for (const id of missingIds) {
    const score = scoreMissingNode(id, 1)
    await db.query(
      `insert into missing_nodes (canonical_id, inbound_count, priority_score, last_seen_at)
       values ($1, $2, $3, now())
       on conflict (canonical_id) do update
         set inbound_count   = missing_nodes.inbound_count + 1,
             priority_score  = (missing_nodes.inbound_count + 1) * $2,
             last_seen_at    = now()`,
      [id, score],
    )
  }
}

export async function getTopMissing(limit: number, db: DbClient): Promise<MissingNode[]> {
  return db.query<MissingNode>(
    `select canonical_id, inbound_count, priority_score
     from missing_nodes
     order by priority_score desc
     limit $1`,
    [limit],
  )
}
