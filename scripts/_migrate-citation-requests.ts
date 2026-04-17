/**
 * One-time migration: create citation_requests table on Neon.
 * Run: npx tsx scripts/_migrate-citation-requests.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'

async function main() {
  const db = getDbClient()
  await db.query(`
    CREATE TABLE IF NOT EXISTS citation_requests (
      canonical_id     text primary key,
      latest_raw_input text not null,
      requested_at     timestamptz not null default now(),
      request_count    int not null default 1,
      status           text not null default 'requested'
    )
  `)
  console.log('citation_requests table ready')
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
