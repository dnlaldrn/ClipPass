import { cursorLedger, type NoirAgentClient, type NoirEvent } from '@noirx402/agent-sdk'
import type { AuthorizedPayment } from './activity'
import type { Verifier } from './verifier'

/** Feeds Noir payment.authorized events from our device (to any artist) into the verifier. Returns a stop function. */
export function startPaymentWatch(
  noir: Pick<NoirAgentClient, 'watch' | 'getEvents'>,
  verifier: Verifier,
  deviceHash: string,
  onPayment?: (event: AuthorizedPayment) => void,
): () => void {
  const onEvent = (e: NoirEvent) => {
    if (e.type !== 'payment.authorized' || e.deviceHash.toLowerCase() !== deviceHash.toLowerCase()) return
    verifier.recordEvent({ txHash: e.txHash, contractId: e.contractId, merchant: e.merchant, deviceHash: e.deviceHash, amount: e.amount })
    onPayment?.(e)
    const lagS = ((Date.now() - Date.parse(e.ledgerClosedAt)) / 1000).toFixed(1)
    console.log(`noir payment.authorized ${e.txHash} ${e.amount} to ${e.merchant} (seen ${lagS}s after ledger close)`)
  }
  const stop = noir.watch({
    types: ['payment.authorized'],
    deviceHash,
    pollMs: 1000, // the agent retries its proof 3× 2 s apart; the default 5 s poll could miss that window
    onError: (e) => console.error('noir watch error', e),
    onEvent,
  })
  // Backfill feeds Activity only. Never the verifier: its used-hash set is empty after a restart, so old hashes could be replayed.
  void backfillPayments(noir, deviceHash, (event) => onPayment?.(event))
  return stop
}

/** About one day (17,280 ledgers), well inside the RPC retention window, and capped so startup stays cheap. */
const BACKFILL_LEDGERS = 17_280
const BACKFILL_PAGES = 30

export async function backfillPayments(
  noir: Pick<NoirAgentClient, 'getEvents'>,
  deviceHash: string,
  onPayment: (event: AuthorizedPayment) => void,
): Promise<void> {
  try {
    const latest = await noir.getEvents({ limit: 100 })
    const accept = (event: NoirEvent) => {
      if (event.type === 'payment.authorized' && event.deviceHash.toLowerCase() === deviceHash.toLowerCase()) onPayment(event)
    }
    latest.events.forEach(accept)
    let page = await noir.getEvents({ startLedger: Math.max(1, latest.latestLedger - BACKFILL_LEDGERS), limit: 100 })
    for (let pages = 0; pages < BACKFILL_PAGES; pages++) {
      page.events.forEach(accept)
      if (cursorLedger(page.cursor) >= latest.latestLedger && page.events.length < 100) break
      const next = await noir.getEvents({ cursor: page.cursor, limit: 100 })
      if (next.cursor === page.cursor) break
      page = next
    }
  } catch (error) {
    console.error('noir activity backfill failed', error)
  }
}
