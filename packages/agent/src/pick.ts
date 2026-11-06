import { fromStroops } from '@noirx402/agent-sdk'
import { ASSETS, type Asset } from '@clippass/shared'
import type { Slot } from './plan'

/** Best unused asset for a slot: most matching tags, then cheapest, then id. Null when the lane is used up. */
export function pick(slot: Slot, tried: ReadonlySet<string>): { asset: Asset; why: string } | null {
  const overlap = (a: Asset) => a.tags.filter((t) => slot.tags.includes(t)).length
  const ranked = ASSETS.filter((a) => a.type === slot.type)
    .sort((a, b) => overlap(b) - overlap(a) || Number(a.price - b.price) || a.id.localeCompare(b.id))
  const open = ranked.filter((a) => !tried.has(a.id))
  if (!open.length) return null
  const [best, next] = open
  let why: string
  if (tried.has(ranked[0].id)) why = `${ranked[0].title} already used in this reel; next best ${best.title}${overlap(best) ? '' : '; no tag match'}`
  else if (!overlap(best)) why = `no tag match; cheapest unused: ${best.title}`
  else if (next && overlap(next) === overlap(best)) why = `picked ${best.title} over ${next.title}: same match, ${fromStroops(next.price - best.price)} cheaper`
  else why = `picked ${best.title}: matches ${best.tags.filter((t) => slot.tags.includes(t)).join(', ')}`
  return { asset: best, why }
}
