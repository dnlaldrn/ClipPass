import { fromStroops } from '@noirx402/agent-sdk'
import type { PlanItem } from './plan'

/** Budget and value rules, applied before the Noir policy check. */
export function decide(item: PlanItem, price: bigint, remaining: bigint): { pay: true } | { pay: false; reason: string } {
  if (price > remaining) return { pay: false, reason: `over budget: price ${fromStroops(price)} > remaining ${fromStroops(remaining)} XLM` }
  if (item.value < price) return { pay: false, reason: `low value: worth ${fromStroops(item.value)} < price ${fromStroops(price)} XLM` }
  return { pay: true }
}
