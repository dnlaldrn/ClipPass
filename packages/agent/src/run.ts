import { NoirContractError, fromStroops, type NoirAgentClient, type NoirSigner } from '@noirx402/agent-sdk'
import { ARTISTS, type Decision, type License, type Mood } from '@clippass/shared'
import { makePlan } from './plan'
import { pick } from './pick'
import { decide } from './decide'
import { paidFetch } from './paidFetch'
import type { Planner } from './llm'

export type NoirPort = {
  checkPayment: NoirAgentClient['checkPayment']
  authorizePayment: NoirAgentClient['authorizePayment']
}

/** The agent: picks each asset for the reel on its own and pays its artist through its Noir agent key. */
export async function runAgent(p: {
  script: string
  mood: Mood
  budget: bigint
  baseUrl: string
  noir: NoirPort
  agent: NoirSigner
  deviceHash: string
  log: (d: Decision) => void
  fetch?: typeof fetch
  delayMs?: number
  /** Optional model that re-tags the rule plan from the script. */
  planner?: Planner
  /** Called as each license is paid, before the reel finishes. */
  onLicense?: (l: License) => void
}): Promise<{ licenses: License[]; spent: bigint; summary: string }> {
  const log = (d: Omit<Decision, 'at'>) => p.log({ at: new Date().toISOString(), ...d })
  const rules = makePlan(p.script, p.mood)
  const slots = p.planner ? await p.planner(p.script, p.mood, rules) : rules
  const licenses: License[] = []
  const refusals: string[] = []
  const tried = new Set<string>() // paid or not, an asset is tried once per reel
  let spent = 0n

  log({ action: 'plan', reason: `budget ${fromStroops(p.budget)} XLM; plan: ${slots.map((s) => `${s.type} (${s.why})`).join('; ')}` })

  for (const slot of slots) {
    const picked = pick(slot, tried)
    if (!picked) { log({ action: 'skip', assetType: slot.type, reason: `no unused ${slot.type} left` }); continue }
    const { asset, why } = picked
    tried.add(asset.id)
    const at = { assetId: asset.id, assetType: asset.type }
    let price = 0n
    let payee = ''
    try {
      const result = await paidFetch(`${p.baseUrl}/api/assets/${asset.id}`, async (q) => {
        price = BigInt(q.price)
        payee = q.merchant
        const d = decide(asset, price, p.budget - spent)
        if (!d.pay) { log({ action: 'skip', ...at, price: q.price, reason: d.reason }); return null }
        const check = await p.noir.checkPayment({ deviceHash: p.deviceHash, agent: p.agent.publicKey, asset: q.asset, amount: price })
        if (!check.ok) {
          log({ action: 'refused', ...at, price: q.price, reason: check.reason })
          refusals.push(`${asset.title} (${asset.type}, ${check.reason})`)
          return null
        }
        const { hash } = await p.noir.authorizePayment({ agent: p.agent, deviceHash: p.deviceHash, merchant: q.merchant, asset: q.asset, amount: price })
        spent += price
        return hash
      }, { fetch: p.fetch, delayMs: p.delayMs })

      if (result.status === 'paid') {
        const decision = `${why}; ${fromStroops(price)} XLM within budget and card policy`
        const license: License = {
          assetId: asset.id, assetType: asset.type, title: asset.title, artist: ARTISTS[asset.artist].name,
          artistAddress: payee, price: price.toString(), hash: result.hash!, decision,
        }
        licenses.push(license)
        p.onLicense?.(license)
        log({ action: 'paid', ...at, price: price.toString(), reason: decision, hash: result.hash })
      } else if (result.status === 'rejected') {
        log({ action: 'failed', ...at, price: price.toString(), reason: `merchant rejected proof: ${result.reason}`, hash: result.hash })
      }
    } catch (e) {
      if (!(e instanceof NoirContractError)) throw e
      log({ action: 'failed', ...at, price: price.toString(), reason: `Noir contract error: ${e.errorName}` })
    }
  }

  const artists = new Set(licenses.map((l) => l.artistAddress)).size
  const summary = [
    `Licensed ${licenses.length} assets from ${artists} artists: ${licenses.map((l) => l.title).join(', ') || 'none'}.`,
    `Spent ${fromStroops(spent)} of ${fromStroops(p.budget)} XLM.`,
    refusals.length ? `Refused by card: ${refusals.join('; ')}.` : 'No card refusals.',
  ].join('\n')
  log({ action: 'done', reason: summary })
  return { licenses, spent, summary }
}
