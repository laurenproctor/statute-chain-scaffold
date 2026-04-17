import type { LegalRelationship } from '@statute-chain/types'
import type { DbClient } from './resolveCitation.js'
import { validateRelationship } from './validateRelationship.js'

export type RelationshipPayload = LegalRelationship & {
  from_canonical_id: string
}

export async function upsertRelationship(
  payload: RelationshipPayload,
  db: DbClient,
): Promise<void> {
  validateRelationship(payload)
  await db.query(
    `INSERT INTO legal_references
       (from_canonical_id, to_canonical_id, relationship_type, source_method, confidence, explanation)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (from_canonical_id, to_canonical_id) DO UPDATE SET
       relationship_type = EXCLUDED.relationship_type,
       source_method     = EXCLUDED.source_method,
       confidence        = EXCLUDED.confidence,
       explanation       = EXCLUDED.explanation`,
    [
      payload.from_canonical_id,
      payload.target_id,
      payload.relationship_type,
      payload.source_method,
      payload.confidence ?? null,
      payload.explanation,
    ],
  )
}
