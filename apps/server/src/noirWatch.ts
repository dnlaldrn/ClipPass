import type { NoirAgentClient } from '@noirx402/agent-sdk'
import type { Verifier } from './verifier'

/** Feeds Noir payment.authorized events from our device (to any artist) into the verifier. Returns a stop function. */
export function startPaymentWatch(noir: NoirAgentClient, verifier: Verifier, deviceHash: string): () => void {
  return noir.watch({
    types: ['payment.authorized'],
    deviceHash,
    pollMs: 1000, // the agent retries its proof 3× 2 s apart; the default 5 s poll could miss that window
    onError: (e) => console.error('noir watch error', e),
    onEvent: (e) => {
      if (e.type !== 'payment.authorized') return
      verifier.recordEvent({ txHash: e.txHash, contractId: e.contractId, merchant: e.merchant, deviceHash: e.deviceHash, amount: e.amount })
      const lagS = ((Date.now() - Date.parse(e.ledgerClosedAt)) / 1000).toFixed(1)
      console.log(`noir payment.authorized ${e.txHash} ${e.amount} to ${e.merchant} (seen ${lagS}s after ledger close)`)
    },
  })
}
