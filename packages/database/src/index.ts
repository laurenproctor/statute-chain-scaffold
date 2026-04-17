import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

export function getDb(): ReturnType<typeof postgres> {
  if (!_sql) {
    const url = process.env['DATABASE_URL']
    if (!url) throw new Error('DATABASE_URL is not set')
    _sql = postgres(url)
  }
  return _sql
}

export type { Sql } from 'postgres'
