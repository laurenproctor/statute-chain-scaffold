import { describe, it, expect } from 'vitest'
import { validateRelationship } from './validateRelationship.js'
import type { LegalRelationship } from '@statute-chain/types'

function rel(overrides: Partial<LegalRelationship>): LegalRelationship {
  return {
    target_id: 'ny/penal/220.00',
    relationship_type: 'references',
    source_method: 'parser',
    explanation: 'Referenced directly in text',
    ...overrides,
  }
}

describe('validateRelationship', () => {
  it('passes for a normal references edge', () => {
    expect(() => validateRelationship(rel({}))).not.toThrow()
  })

  it('passes for depends_on with inferred source and explanation', () => {
    expect(() =>
      validateRelationship(
        rel({
          relationship_type: 'depends_on',
          source_method: 'inferred',
          explanation: 'Definition required for interpretation',
        }),
      ),
    ).not.toThrow()
  })

  it('throws for depends_on with non-inferred source_method', () => {
    expect(() =>
      validateRelationship(
        rel({
          relationship_type: 'depends_on',
          source_method: 'parser',
          explanation: 'some explanation',
        }),
      ),
    ).toThrow(/depends_on.*inferred/)
  })

  it('throws for depends_on with missing explanation', () => {
    expect(() =>
      validateRelationship(
        rel({ relationship_type: 'depends_on', source_method: 'inferred', explanation: '' }),
      ),
    ).toThrow(/explanation/)
  })

  it('throws for depends_on with whitespace-only explanation', () => {
    expect(() =>
      validateRelationship(
        rel({ relationship_type: 'depends_on', source_method: 'inferred', explanation: '   ' }),
      ),
    ).toThrow(/explanation/)
  })
})
