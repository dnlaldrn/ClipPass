import { NOIR_TESTNET_CONTRACTS, type EndpointName, type ProofReason } from '@tollbooth/shared'
import type { QuoteStore } from './quotes'

export type PaymentEvent = { txHash: string; contractId: string; merchant: string; deviceHash: string; amount: bigint }
export type Verifier = ReturnType<typeof createVerifier>

/**
 * Checks an X-Payment proof against Noir payment.authorized events (fed in by noirWatch).
 * The event has no asset field; the escrow's XLM binding is asserted once at server startup.
 */
export function createVerifier(d: { quotes: QuoteStore; merchant: string; deviceHash: string; now?: () => number }) {
  const now = d.now ?? Date.now
  const events = new Map<string, PaymentEvent>()
  const used = new Set<string>()
  const device = d.deviceHash.toLowerCase()

  return {
    recordEvent(e: PaymentEvent): void {
      events.set(e.txHash, e)
    },

    verify(txHash: string, quoteId: string, endpoint: EndpointName): { ok: true } | { ok: false; reason: ProofReason } {
      const fail = (reason: ProofReason) => ({ ok: false as const, reason })
      const q = d.quotes.get(quoteId)
      if (!q || q.endpoint !== endpoint) return fail('unknown_quote')
      if (q.consumed) return fail('consumed_quote')
      if (now() > q.expiresAt) return fail('expired_quote')
      if (used.has(txHash)) return fail('reused')
      const e = events.get(txHash)
      if (!e) return fail('not_found') // not indexed yet; quote stays open for the retry
      if (e.contractId !== NOIR_TESTNET_CONTRACTS.paymentEscrow) return fail('wrong_contract')
      if (e.merchant !== d.merchant) return fail('wrong_merchant')
      if (e.deviceHash.toLowerCase() !== device) return fail('wrong_device')
      if (e.amount < q.price) return fail('low_amount')
      q.consumed = true
      used.add(txHash)
      return { ok: true }
    },
  }
}
