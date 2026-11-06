import { randomUUID } from 'node:crypto'
import { QUOTE_TTL_MS } from '@clippass/shared'

export type StoredQuote = { quoteId: string; assetId: string; price: bigint; payee: string; expiresAt: number; consumed: boolean }

/** Server-side 402 quotes: random id, single use, valid for 2 minutes, payable to one artist. */
export class QuoteStore {
  private quotes = new Map<string, StoredQuote>()
  constructor(private now: () => number = Date.now) {}

  issue(assetId: string, price: bigint, payee: string): StoredQuote {
    const q = { quoteId: randomUUID(), assetId, price, payee, expiresAt: this.now() + QUOTE_TTL_MS, consumed: false }
    this.quotes.set(q.quoteId, q)
    return q
  }

  get(id: string) { return this.quotes.get(id) }
}
