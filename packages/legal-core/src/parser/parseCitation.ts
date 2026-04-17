import type { ParsedCitation, ParseError } from '@statute-chain/types'

export type ParseResult = ParsedCitation | ParseError

export function parseCitation(_input: string): ParseResult {
  // TODO: implement full parser — see spec
  return { raw: _input, error: 'not implemented', status: 'parse_failed' }
}
