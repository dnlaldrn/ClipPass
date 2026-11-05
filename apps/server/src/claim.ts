import { Router } from 'express'
import { NoirContractError, type NoirAgentClient, type NoirSigner } from '@noirx402/agent-sdk'
import { XLM_SAC } from '@tollbooth/shared'

/** Escrow and merchant balances, and the merchant's "Claim earnings" (merchant collects; not an agent payment). */
export function claimRouter(d: { noir: NoirAgentClient; merchant: NoirSigner; deviceHash: string }): Router {
  const r = Router()
  r.get('/api/balances', async (_req, res) => {
    const [escrow, pending] = await Promise.all([
      d.noir.getEscrowBalance(d.deviceHash),
      d.noir.getPendingBalance(d.merchant.publicKey),
    ])
    res.json({ escrow: escrow.toString(), pending: pending.toString() })
  })
  r.post('/api/claim', async (_req, res) => {
    const before = await d.noir.getPendingBalance(d.merchant.publicKey)
    try {
      const { hash } = await d.noir.claim({ merchant: d.merchant, token: XLM_SAC })
      const after = await d.noir.getPendingBalance(d.merchant.publicKey)
      res.json({ hash, before: before.toString(), after: after.toString() })
    } catch (e) {
      if (e instanceof NoirContractError && e.errorName === 'NothingToClaim') return res.status(409).json({ reason: 'NothingToClaim' })
      throw e
    }
  })
  return r
}
