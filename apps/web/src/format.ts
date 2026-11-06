import { BROLL_TAGS, SFX_TAGS } from './mirror'
import type { AssetType, Decision, DecisionAction } from '@clippass/shared'

/** Stroop string → exact XLM string (7 decimals, trailing zeros trimmed). Kept local so the page doesn't bundle the Stellar SDK. */
export function xlm(stroops: string): string {
  const s = BigInt(stroops)
  const whole = s / 10_000_000n
  const frac = (s % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}

export const txLink = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
export const accountLink = (address: string) => `https://stellar.expert/explorer/testnet/account/${address}`

export type LaneState = { action: DecisionAction; count: number }

/** Per lane: how many assets were paid, else the lane's last decision (skip, refused, failed). */
export function laneStates(trace: Decision[]): Partial<Record<AssetType, LaneState>> {
  const out: Partial<Record<AssetType, LaneState>> = {}
  for (const d of trace) {
    if (!d.assetType) continue
    const cur = out[d.assetType]
    if (d.action === 'paid') out[d.assetType] = { action: 'paid', count: cur?.action === 'paid' ? cur.count + 1 : 1 }
    else if (cur?.action !== 'paid') out[d.assetType] = { action: d.action, count: 0 }
  }
  return out
}

/** Same prefix match and vocabulary order as the rule planner, without its server imports. */
export function matchTags(script: string): string[] {
  const words = script.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  return [...new Set([...BROLL_TAGS, ...SFX_TAGS])].filter(tag => words.some(word => word.startsWith(tag)))
}
