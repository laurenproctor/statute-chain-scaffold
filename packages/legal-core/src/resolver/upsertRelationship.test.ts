import { describe, it, expect } from 'vitest'
import { upsertRelationship } from './upsertRelationship.js'
import type { DbClient } from './resolveCitation.js'

function makeDb() {
  const calls: { sql: string; params: unknown[] }[] = []
  const db: DbClient = {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      calls.push({ sql, params: params ?? [] })
      return []
    },
  }
  return { db, calls }
}

describe('upsertRelationship', () => {
  it('calls INSERT ... ON CONFLICT DO UPDATE INTO legal_references with correct columns', async () => {
    const { db, calls } = makeDb()
    await upsertRelationship(
      {
        from_canonical_id: 'ny/penal/220.16',
        target_id: 'ny/penal/220.00',
        relationship_type: 'references',
        source_method: 'parser',
        explanation: 'Referenced directly in text',
      },
      db,
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]!.sql).toMatch(/INSERT INTO legal_references/)
    expect(calls[0]!.sql).toMatch(/ON CONFLICT.*DO UPDATE/s)
    expect(calls[0]!.params).toContain('ny/penal/220.16')
    expect(calls[0]!.params).toContain('ny/penal/220.00')
  })

  it('throws before INSERT when validateRelationship fails', async () => {
    const { db, calls } = makeDb()
    await expect(
      upsertRelationship(
        {
          from_canonical_id: 'ny/penal/220.16',
          target_id: 'ny/penal/220.00',
          relationship_type: 'depends_on',
          source_method: 'parser',
          explanation: 'some reason',
        },
        db,
      ),
    ).rejects.toThrow(/depends_on.*inferred/)
    expect(calls).toHaveLength(0)
  })
})
