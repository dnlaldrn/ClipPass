import { randomUUID } from 'node:crypto'
import { QUOTE_TTL_MS, type EndpointName } from '@clippass/shared'

export type StoredQuote = { quoteId: string; endpoint: EndpointName; price: bigint; expiresAt: number; consumed: boolean }

/** Server-side 402 quotes: random id, single use, valid for 2 minutes. */
export class QuoteStore {
  private quotes = new Map<string, StoredQuote>()
  constructor(private now: () => number = Date.now) {}

  issue(endpoint: EndpointName, price: bigint): StoredQuote {
    const q = { quoteId: randomUUID(), endpoint, price, expiresAt: this.now() + QUOTE_TTL_MS, consumed: false }
    this.quotes.set(q.quoteId, q)
    return q
  }

  get(id: string) { return this.quotes.get(id) }
}
