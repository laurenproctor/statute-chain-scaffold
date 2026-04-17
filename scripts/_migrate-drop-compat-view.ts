/**
 * Migration cleanup: drop the citations compat view.
 *
 * Run AFTER new code is deployed and confirmed stable.
 * Do NOT run until post-deploy stability is confirmed (min 1 hour clean operation).
 *
 * Usage: npx tsx scripts/_migrate-drop-compat-view.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'
import { getDb } from '../packages/database/src/index.js'

async function main() {
  const db = getDbClient()

  const [viewCheck] = await db.query<{ table_type: string }>(
    `SELECT table_type FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'citations'`,
  )
  if (!viewCheck) {
    console.log('citations view not found — nothing to do')
    process.exit(0)
  }
  if (viewCheck.table_type !== 'VIEW') {
    console.error(`citations exists as ${viewCheck.table_type}, not VIEW — refusing to drop`)
    process.exit(1)
  }

  await db.query('DROP VIEW citations')
  console.log('✓ citations compat view dropped')
}

main()
  .then(() => getDb().end())
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
