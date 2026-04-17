import { describe, it, expect, vi } from 'vitest'
import { logMissingNodes, scoreMissingNode, getTopMissing } from './missing.js'
import type { DbClient } from '../resolver/resolveCitation.js'

function makeDb(rows: unknown[][] = []): DbClient & { calls: { sql: string; params: unknown[] }[] } {
  const calls: { sql: string; params: unknown[] }[] = []
  return {
    calls,
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      calls.push({ sql, params: params ?? [] })
      return (rows.shift() ?? []) as T[]
    },
  }
}

describe('scoreMissingNode', () => {
  it('scores federal nodes higher than ny nodes', () => {
    const federal = scoreMissingNode('federal/usc/21/812', 1)
    const ny = scoreMissingNode('ny/penal/220.16', 1)
    expect(federal).toBeGreaterThan(ny)
  })

  it('scales with inbound_count', () => {
    const one = scoreMissingNode('ny/penal/220.16', 1)
    const three = scoreMissingNode('ny/penal/220.16', 3)
    expect(three).toBe(one * 3)
  })

  it('uses federal weight 2.0', () => {
    expect(scoreMissingNode('federal/usc/21/812', 1)).toBe(2.0)
  })

  it('uses ny weight 1.0', () => {
    expect(scoreMissingNode('ny/phl/3302', 1)).toBe(1.0)
  })

  it('uses other weight 0.5 for unknown jurisdiction', () => {
    expect(scoreMissingNode('unknown/foo/bar', 1)).toBe(0.5)
  })
})

describe('logMissingNodes', () => {
  it('upserts each missing id with inbound count increment and priority score', async () => {
    const db = makeDb()
    await logMissingNodes('ny/penal/220.16', ['federal/usc/21/812', 'ny/phl/3302'], db)

    expect(db.calls).toHaveLength(2)
    for (const call of db.calls) {
      expect(call.sql).toMatch(/insert into missing_nodes/i)
      expect(call.sql).toMatch(/on conflict/i)
    }
  })

  it('does nothing when missingIds is empty', async () => {
    const db = makeDb()
    await logMissingNodes('ny/penal/220.16', [], db)
    expect(db.calls).toHaveLength(0)
  })

  it('passes correct canonical_id for each missing node', async () => {
    const db = makeDb()
    await logMissingNodes('any/from/id', ['federal/usc/21/802'], db)
    expect(db.calls[0]!.params[0]).toBe('federal/usc/21/802')
  })

  it('passes priority_score as second param', async () => {
    const db = makeDb()
    await logMissingNodes('any/from/id', ['federal/usc/21/802'], db)
    expect(db.calls[0]!.params[1]).toBe(scoreMissingNode('federal/usc/21/802', 1))
  })
})

describe('getTopMissing', () => {
  it('queries missing_nodes ordered by priority_score desc', async () => {
    const rows = [{ canonical_id: 'federal/usc/21/812', inbound_count: 3, priority_score: 6 }]
    const db = makeDb([rows])
    const result = await getTopMissing(5, db)
    expect(db.calls[0]!.sql).toMatch(/order by priority_score desc/i)
    expect(db.calls[0]!.params[0]).toBe(5)
    expect(result[0]!.canonical_id).toBe('federal/usc/21/812')
  })

  it('returns empty array when no missing nodes', async () => {
    const db = makeDb([[]])
    const result = await getTopMissing(10, db)
    expect(result).toEqual([])
  })
})
