/**
 * Query a statute reference and print its linked law chain.
 *
 * Usage:
 *   npx tsx scripts/query.ts "NY Penal Law 220.16"
 *   npx tsx scripts/query.ts "26 U.S.C. § 501(c)(3)" --depth 2
 *   npx tsx scripts/query.ts "PHL 3306" --depth 1 --no-db
 */

import { parseCitation } from '../packages/parser/src/index.js'
import { buildChain } from '../packages/legal-core/src/chain/buildChain.js'
import type { DbClient } from '../packages/legal-core/src/resolver/resolveCitation.js'
import type { ChainGraph, ChainNode } from '../packages/types/src/index.js'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const citationArg = args.find((a) => !a.startsWith('--'))
const depthArg = args.find((_, i) => args[i - 1] === '--depth')
const noDB = args.includes('--no-db')

if (!citationArg) {
  console.error('Usage: npx tsx scripts/query.ts "<statute reference>" [--depth N] [--no-db]')
  process.exit(1)
}

const maxDepth = depthArg ? parseInt(depthArg, 10) : 3

// ── DB client ─────────────────────────────────────────────────────────────────

async function makeDbClient(): Promise<DbClient & { end?: () => Promise<void> }> {
  if (noDB) {
    return {
      async query<T>(): Promise<T[]> { return [] },
    }
  }
  try {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] })
    return {
      async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
        const res = await pool.query(sql, params as unknown[])
        return res.rows as T[]
      },
      end: () => pool.end(),
    }
  } catch {
    console.warn('pg not available — running without DB (parse-only mode)\n')
    return {
      async query<T>(): Promise<T[]> { return [] },
    }
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'
const DIM   = '\x1b[2m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED   = '\x1b[31m'
const CYAN  = '\x1b[36m'

function statusColor(status: ChainNode['status']): string {
  switch (status) {
    case 'ingested':       return GREEN
    case 'alias_resolved': return CYAN
    case 'not_ingested':   return YELLOW
    case 'ambiguous':      return YELLOW
    default:               return RED
  }
}

function statusLabel(node: ChainNode): string {
  const c = statusColor(node.status)
  const label = node.status === 'alias_resolved'
    ? `alias → ${node.canonical_id}`
    : node.status
  return `${c}[${label}]${RESET}`
}

function printParsed(raw: string): void {
  const p = parseCitation(raw)
  console.log(`\n${BOLD}Input:${RESET}        ${raw}`)
  console.log(`${BOLD}Format:${RESET}       ${p.format === 'structured' ? GREEN : YELLOW}${p.format}${RESET}`)
  console.log(`${BOLD}Jurisdiction:${RESET} ${p.jurisdiction}`)
  console.log(`${BOLD}Code:${RESET}         ${p.code || DIM + '(none)' + RESET}`)
  console.log(`${BOLD}Section:${RESET}      ${p.section}`)
  if (p.subsection_path.length > 0)
    console.log(`${BOLD}Subsections:${RESET}  (${p.subsection_path.join(')(')})`)
  console.log(`${BOLD}Canonical ID:${RESET} ${p.canonical_id ? CYAN + p.canonical_id + RESET : DIM + '(none — informal ref)' + RESET}`)
  console.log(`${BOLD}Confidence:${RESET}   ${(p.confidence * 100).toFixed(0)}%`)
}

function printGraph(graph: ChainGraph): void {
  const nodeCount = graph.total_nodes
  const edgeCount = graph.edges.length

  console.log(`\n${BOLD}Chain Graph${RESET}  (${nodeCount} node${nodeCount !== 1 ? 's' : ''}, ${edgeCount} edge${edgeCount !== 1 ? 's' : ''}, ${graph.query_ms}ms)`)

  if (graph.truncated) {
    console.log(`${YELLOW}⚠ Truncated: ${graph.truncation_reason} (depth reached: ${graph.depth_reached})${RESET}`)
  }

  // BFS print order — sort nodes by depth then canonical_id
  const sorted = Object.values(graph.nodes).sort(
    (a, b) => a.depth - b.depth || a.canonical_id.localeCompare(b.canonical_id),
  )

  for (const node of sorted) {
    const indent = '  '.repeat(node.depth)
    const connector = node.depth === 0 ? '◉' : '└─'
    const children = graph.edges
      .filter((e) => e.from === node.canonical_id)
      .map((e) => e.to)

    console.log(`\n${indent}${connector} ${BOLD}${node.canonical_id}${RESET}  ${statusLabel(node)}`)

    if (node.text) {
      const preview = node.text.replace(/\s+/g, ' ').slice(0, 120)
      console.log(`${indent}   ${DIM}${preview}…${RESET}`)
    }

    if (node.status === 'ambiguous' && node.candidates) {
      console.log(`${indent}   Candidates: ${node.candidates.join(', ')}`)
    }

    if (children.length > 0) {
      console.log(`${indent}   → ${children.join('  ')}`)
    }
  }

  if (graph.unresolved.length > 0) {
    console.log(`\n${YELLOW}Unresolved (not yet ingested):${RESET}`)
    for (const id of graph.unresolved) {
      console.log(`  ${DIM}${id}${RESET}`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  printParsed(citationArg)

  const parsed = parseCitation(citationArg)
  const startId = parsed.canonical_id ?? citationArg

  const db = await makeDbClient()

  try {
    console.log(`\n${DIM}Resolving chain (maxDepth=${maxDepth})…${RESET}`)
    const graph = await buildChain(startId, db, { maxDepth })
    printGraph(graph)
    console.log()
  } finally {
    await (db as { end?: () => Promise<void> }).end?.()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
