import { fromStroops } from '@noirx402/agent-sdk'
import type { Asset } from '@clippass/shared'

/** Budget and price rules, applied to the 402 quote before the Noir policy check. */
export function decide(asset: Asset, price: bigint, remaining: bigint): { pay: true } | { pay: false; reason: string } {
  if (price > remaining) return { pay: false, reason: `over budget: price ${fromStroops(price)} > remaining ${fromStroops(remaining)} XLM` }
  // never pay more than the catalog listed when the agent chose this asset
  if (price > asset.price) return { pay: false, reason: `quote ${fromStroops(price)} above listed ${fromStroops(asset.price)} XLM` }
  return { pay: true }
}
