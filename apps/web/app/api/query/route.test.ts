import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock dependencies ─────────────────────────────────────────────────────────

vi.mock('@statute-chain/parser', async (importActual) => {
  const actual = await importActual<typeof import('@statute-chain/parser')>()
  return { ...actual, parseCitation: vi.fn() }
})

vi.mock('@statute-chain/legal-core', () => ({
  resolveCitation: vi.fn(),
  buildChain: vi.fn(),
  logMissingNodes: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../lib/db', () => ({
  getDbClient: vi.fn(() => ({ query: async () => [] })),
}))

import { parseCitation } from '@statute-chain/parser'
import { resolveCitation, buildChain, logMissingNodes } from '@statute-chain/legal-core'
import type { ParsedCitation, ResolvedProvision, ChainGraph } from '@statute-chain/types'

const mockParsed: ParsedCitation = {
  raw: '26 U.S.C. § 501',
  format: 'structured',
  confidence: 0.97,
  jurisdiction: 'federal',
  code: 'usc',
  section: '501',
  subsection_path: [],
  canonical_id: 'federal/usc/26/501',
}

const mockResolved: ResolvedProvision = {
  canonical_id: 'federal/usc/26/501',
  status: 'ingested',
  confidence: 0.97,
  text: 'Exemption from tax on corporations…',
  legal_relationships: [],
  provenance: { source: 'test' },
}

const mockChain: ChainGraph = {
  root: 'federal/usc/26/501',
  nodes: { 'federal/usc/26/501': { ...mockResolved, depth: 0 } },
  edges: [],
  unresolved: [],
  truncated: false,
  depth_reached: 0,
  total_nodes: 1,
  query_ms: 5,
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/query', () => {
  beforeEach(() => {
    vi.mocked(parseCitation).mockReturnValue(mockParsed)
    vi.mocked(resolveCitation).mockResolvedValue(mockResolved)
    vi.mocked(buildChain).mockResolvedValue(mockChain)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when query field is missing', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/query/)
  })

  it('returns 400 when query is empty string', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ query: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns parsed, resolved, and chain on success', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ query: '26 U.S.C. § 501' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('parsed')
    expect(body).toHaveProperty('resolved')
    expect(body).toHaveProperty('chain')
    expect(body.parsed.canonical_id).toBe('federal/usc/26/501')
    expect(body.resolved.status).toBe('ingested')
    expect(body.chain.total_nodes).toBe(1)
    expect(logMissingNodes).not.toHaveBeenCalled()
  })

  it('calls parseCitation with the trimmed query', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ query: '  26 U.S.C. § 501  ' }))
    expect(parseCitation).toHaveBeenCalledWith('26 U.S.C. § 501')
  })

  it('calls resolveCitation with the parsed result', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ query: '26 U.S.C. § 501' }))
    expect(resolveCitation).toHaveBeenCalledWith(mockParsed, expect.anything())
  })

  it('calls buildChain starting from resolved canonical_id', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest({ query: '26 U.S.C. § 501' }))
    expect(buildChain).toHaveBeenCalledWith(
      'federal/usc/26/501',
      expect.anything(),
      expect.any(Object),
    )
  })

  it('falls back to raw query string as startId when no canonical_id is available', async () => {
    const rawQuery = 'some informal ref'
    vi.mocked(parseCitation).mockReturnValueOnce({
      ...mockParsed,
      canonical_id: undefined as unknown as string,
      raw: rawQuery,
    })
    vi.mocked(resolveCitation).mockResolvedValueOnce({
      ...mockResolved,
      canonical_id: rawQuery,
    })
    const { POST } = await import('./route')
    await POST(makeRequest({ query: rawQuery }))
    expect(buildChain).toHaveBeenCalledWith(rawQuery, expect.anything(), expect.any(Object))
  })

  it('returns 500 when buildChain throws', async () => {
    vi.mocked(buildChain).mockRejectedValueOnce(new Error('DB timeout'))
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ query: '26 U.S.C. § 501' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
