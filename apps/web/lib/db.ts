import type { DbClient } from '@statute-chain/legal-core'

// Lazy singleton — only connects when first query is made.
// Falls back gracefully if DATABASE_URL is unset (parse-only mode).
let client: DbClient | null = null

export function getDbClient(): DbClient {
  if (client) return client

  const url = process.env['DATABASE_URL']
  if (!url) {
    client = { query: async () => [] }
    return client
  }

  // Dynamic import keeps `postgres` out of the client bundle.
  // Next.js ensures this module only runs server-side.
  const { getDb } = require('@statute-chain/database') as {
    getDb: () => { unsafe: (sql: string, params?: unknown[]) => Promise<unknown[]> }
  }

  const sql = getDb()

  client = {
    async query<T>(rawSql: string, params?: unknown[]): Promise<T[]> {
      const rows = await sql.unsafe(rawSql, (params ?? []) as never[])
      return rows as T[]
    },
  }

  return client
}
