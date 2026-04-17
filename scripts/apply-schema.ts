import { readFileSync } from 'fs'
import { resolve } from 'path'
import postgres from '../packages/database/node_modules/postgres/cjs/src/index.js'

const url = process.env['DATABASE_URL']
if (!url) { console.error('DATABASE_URL not set'); process.exit(1) }

const sql = postgres(url)
const schema = readFileSync(resolve(process.cwd(), 'packages/database/schema.sql'), 'utf8')

sql.unsafe(schema)
  .then(() => { console.log('✓ schema applied'); return sql.end() })
  .catch((err: unknown) => { console.error(err); process.exit(1) })
