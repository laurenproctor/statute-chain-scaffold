/**
 * Rollback state checker for the legal_references rename.
 *
 * This script reports current DB state and rollback window status.
 * Actual rollback is performed via Neon branch restore — NOT via this script.
 *
 * States handled:
 *   - citations BASE TABLE present → pre-migration, nothing to roll back
 *   - legal_references + citations VIEW → rollback window OPEN, restore from Neon snapshot
 *   - legal_references only (no citations) → rollback window CLOSED
 *   - neither → unexpected state
 *
 * Usage: npx tsx scripts/_rollback-legal-references.ts
 */
import { getDbClient } from '../apps/web/lib/db.js'
import { getDb } from '../packages/database/src/index.js'

async function main() {
  const db = getDbClient()

  const tableType = async (name: string): Promise<string | null> => {
    const [row] = await db.query<{ table_type: string }>(
      `SELECT table_type FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [name],
    )
    return row?.table_type ?? null
  }

  const lrType = await tableType('legal_references')
  const cType = await tableType('citations')

  console.log('Current state:')
  console.log(`  legal_references: ${lrType ?? '✗ absent'}`)
  console.log(`  citations:        ${cType ?? '✗ absent'}`)

  if (cType === 'BASE TABLE') {
    console.log('\nPre-migration state — migration has not run yet. Nothing to roll back.')
    return
  }

  if (lrType === 'BASE TABLE' && cType === 'VIEW') {
    console.log('\nRollback window is OPEN.')
    console.log('To roll back: restore the Neon branch snapshot taken before migration.')
    console.log('Do NOT attempt a manual rename — snapshot restore is the safe path.')
    return
  }

  if (lrType === 'BASE TABLE' && cType === null) {
    console.log('\nRollback window is CLOSED (compat view already dropped).')
    console.log('Rollback requires a full restore from the pre-migration Neon snapshot.')
    return
  }

  console.error('\nUnexpected state — investigate manually.')
  process.exit(1)
}

main()
  .then(() => getDb().end())
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
