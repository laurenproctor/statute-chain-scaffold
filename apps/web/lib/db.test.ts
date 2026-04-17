import { describe, it, expect, beforeEach, vi } from 'vitest'

// Reset singleton between tests
beforeEach(async () => {
  vi.unstubAllEnvs()
  const { resetDbClient } = await import('./db')
  resetDbClient()
})

describe('getDbClient', () => {
  it('throws when DATABASE_URL is missing and not in test/mock mode', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_DB', '')
    // Re-import after env change — module cache means we use resetDbClient above
    const { getDbClient } = await import('./db')
    expect(() => getDbClient()).toThrow('DATABASE_URL is not set')
  })

  it('returns stub when NODE_ENV=test and DATABASE_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('NODE_ENV', 'test')
    const { getDbClient } = await import('./db')
    const db = getDbClient()
    const rows = await db.query('SELECT 1')
    expect(rows).toEqual([])
  })

  it('returns stub when MOCK_DB=true and DATABASE_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_DB', 'true')
    const { getDbClient } = await import('./db')
    const db = getDbClient()
    const rows = await db.query('SELECT 1')
    expect(rows).toEqual([])
  })

  it('error message mentions MOCK_DB', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_DB', '')
    const { getDbClient } = await import('./db')
    expect(() => getDbClient()).toThrow('MOCK_DB=true')
  })
})
