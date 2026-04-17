/**
 * Migration: rename citations → legal_references (single-source-of-truth).
 *
 * Creates a temporary read-compat bridge: VIEW citations AS SELECT * FROM legal_references.
 * Legacy reads (SELECT) continue to work transparently.
 * Legacy writes (INSERT/UPDATE/DELETE) are redirected to legal_references by Postgres
 * auto-updatable view rules — they do not fail, but they land in the right table.
 * The view is a bridge only; drop it once new code is confirmed stable.
 *
 * Run BEFORE deploying new code.
 * After deploy is confirmed stable, run _migrate-drop-compat-view.ts.
 *
 * Usage: npx tsx scripts/_migrate-rename-citations.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'
import { getDb } from '../packages/database/src/index.js'

async function main() {
  const db = getDbClient()

  // Pre-flight: citations must be a real BASE TABLE
  const [citationsCheck] = await db.query<{ table_type: string }>(
    `SELECT table_type FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'citations'`,
  )
  if (!citationsCheck) {
    console.error('citations table not found — aborting')
    process.exit(1)
  }
  if (citationsCheck.table_type !== 'BASE TABLE') {
    console.error(`citations exists but is a ${citationsCheck.table_type}, not a BASE TABLE — aborting`)
    process.exit(1)
  }

  // Pre-flight: legal_references must not exist
  const [lrCheck] = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'legal_references'
    ) AS exists`,
  )
  if (lrCheck?.exists) {
    console.log('legal_references already exists — migration may have already run. Aborting.')
    process.exit(1)
  }

  // Snapshot row count before rename
  const [countRow] = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM citations')
  const rowCount = parseInt(countRow?.count ?? '0', 10)
  console.log(`citations row count before rename: ${rowCount}`)

  // Execute rename + compat view creation atomically
  console.log('Renaming citations → legal_references and creating compat view…')
  const sql = getDb()
  await sql.begin(async (tx) => {
    await tx`ALTER TABLE citations RENAME TO legal_references`
    await tx`CREATE VIEW citations AS SELECT * FROM legal_references`
  })

  // Post-flight: verify row count
  const [newCount] = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM legal_references')
  const actualCount = parseInt(newCount?.count ?? '-1', 10)
  if (actualCount !== rowCount) {
    console.error(`Row count mismatch after rename: expected ${rowCount}, got ${actualCount}`)
    console.error('Run: npx tsx scripts/_rollback-legal-references.ts to check DB state')
    process.exit(1)
  }

  // Post-flight: verify index is present
  const plan = await db.query<{ 'QUERY PLAN': string }>(
    `EXPLAIN SELECT * FROM legal_references WHERE from_canonical_id = 'test'`,
  )
  const planText = plan.map((r) => r['QUERY PLAN']).join('\n')
  if (!planText.includes('Index') && actualCount > 100) {
    console.warn('Warning: query plan does not show index scan — verify indexes')
    console.warn(planText)
  }

  console.log(`✓ Renamed. legal_references has ${actualCount} rows.`)
  console.log('Compat view citations created (read-only bridge).')
  console.log('Deploy new code, then run _migrate-drop-compat-view.ts.')
}

main()
  .then(() => getDb().end())
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
