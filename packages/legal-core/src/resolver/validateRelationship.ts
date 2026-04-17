import type { LegalRelationship } from '@statute-chain/types'

export function validateRelationship(rel: LegalRelationship): void {
  if (rel.relationship_type === 'depends_on') {
    if (rel.source_method !== 'inferred') {
      throw new Error(
        `depends_on edge to ${rel.target_id} requires source_method 'inferred', got '${rel.source_method}'`,
      )
    }
    if (!rel.explanation?.trim()) {
      throw new Error(
        `depends_on edge to ${rel.target_id} requires a non-empty explanation`,
      )
    }
  }
}
