import { NoirContractError, fromStroops, type NoirAgentClient, type NoirSigner } from '@noirx402/agent-sdk'
import { CATALOG, type Decision, type PaymentRecord } from '@clippass/shared'
import { makePlan } from './plan'
import { decide } from './decide'
import { paidFetch } from './paidFetch'
import type { Planner } from './llm'

export type NoirPort = {
  checkPayment: NoirAgentClient['checkPayment']
  authorizePayment: NoirAgentClient['authorizePayment']
}

/** The agent: decides on its own what to buy and pays each call through its Noir agent key. */
export async function runAgent(p: {
  topic: string
  budget: bigint
  baseUrl: string
  noir: NoirPort
  agent: NoirSigner
  deviceHash: string
  log: (d: Decision) => void
  fetch?: typeof fetch
  delayMs?: number
  /** Optional model that re-scores the rule plan for this topic. */
  planner?: Planner
}): Promise<{ payments: PaymentRecord[]; spent: bigint; summary: string }> {
  const log = (d: Omit<Decision, 'at'>) => p.log({ at: new Date().toISOString(), ...d })
  const plan = p.planner ? await p.planner(p.topic, makePlan(p.topic)) : makePlan(p.topic)
  const payments: PaymentRecord[] = []
  const refusals: string[] = []
  let spent = 0n

  log({ action: 'plan', reason: `budget ${fromStroops(p.budget)} XLM; plan: ${plan.map((i) => `${i.endpoint} (${i.why})`).join('; ')}` })

  for (const item of plan) {
    const endpoint = item.endpoint
    let price = 0n
    try {
      const result = await paidFetch(`${p.baseUrl}${CATALOG[endpoint].path}`, async (q) => {
        price = BigInt(q.price)
        const shown = q.price
        const d = decide(item, price, p.budget - spent)
        if (!d.pay) { log({ action: 'skip', endpoint, price: shown, reason: d.reason }); return null }
        const check = await p.noir.checkPayment({ deviceHash: p.deviceHash, agent: p.agent.publicKey, asset: q.asset, amount: price })
        if (!check.ok) {
          log({ action: 'refused', endpoint, price: shown, reason: check.reason })
          refusals.push(`${endpoint}: ${check.reason}`)
          return null
        }
        const { hash } = await p.noir.authorizePayment({ agent: p.agent, deviceHash: p.deviceHash, merchant: q.merchant, asset: q.asset, amount: price })
        spent += price
        return hash
      }, { fetch: p.fetch, delayMs: p.delayMs })

      if (result.status === 'paid') {
        const decision = `worth ${fromStroops(item.value)} ≥ price ${fromStroops(price)} XLM, within budget and policy`
        payments.push({ endpoint, price: price.toString(), hash: result.hash!, decision })
        log({ action: 'paid', endpoint, price: price.toString(), reason: decision, hash: result.hash })
      } else if (result.status === 'rejected') {
        log({ action: 'failed', endpoint, price: price.toString(), reason: `merchant rejected proof: ${result.reason}`, hash: result.hash })
      }
    } catch (e) {
      if (!(e instanceof NoirContractError)) throw e
      log({ action: 'failed', endpoint, price: price.toString(), reason: `Noir contract error: ${e.errorName}` })
    }
  }

  const summary = [
    `Bought ${payments.length} data call(s): ${payments.map((x) => x.endpoint).join(', ') || 'none'}.`,
    `Spent ${fromStroops(spent)} of ${fromStroops(p.budget)} XLM.`,
    refusals.length ? `Refused by Noir policy: ${refusals.join('; ')}.` : 'No policy refusals.',
  ].join('\n')
  log({ action: 'done', reason: summary })
  return { payments, spent, summary }
}
