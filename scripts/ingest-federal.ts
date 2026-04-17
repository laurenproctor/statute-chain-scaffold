import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ingestFederalProvisions, type FederalFixtureRow } from '../packages/legal-core/src/ingest/federal.js'
import { getDbClient } from '../apps/web/lib/db.js'

function loadFixture(name: string): FederalFixtureRow {
  const p = resolve(__dirname, '../data/federal/fixtures', name)
  return JSON.parse(readFileSync(p, 'utf-8')) as FederalFixtureRow
}

const fixtures = [
  loadFixture('usc-21-802.json'),
  loadFixture('usc-21-812.json'),
]

const db = getDbClient()
ingestFederalProvisions(fixtures, db).then((result) => {
  console.log(`provisions: ${result.provisions}`)
  console.log(`citations:  ${result.citations}`)
  if (result.errors.length > 0) {
    console.error('errors:')
    result.errors.forEach((e) => console.error(' ', e))
    process.exit(1)
  }
}).catch((err) => {
  console.error(err)
  process.exit(1)
})
