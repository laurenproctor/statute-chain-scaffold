import { getDbClient } from '../apps/web/lib/db.js'

async function main() {
  const db = getDbClient()
  await db.query(`ALTER TABLE citation_requests ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'manual'`)
  await db.query(`ALTER TABLE citation_requests ADD COLUMN IF NOT EXISTS last_error text`)
  console.log('citation_requests v2 migration complete')
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
