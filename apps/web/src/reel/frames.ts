import type { AssetType, Decision, License } from '@clippass/shared'

export type FrameState = 'empty' | 'paid' | 'refused' | 'skip' | 'failed'

/** One frame on the reel: a slot of the agent's plan and what happened to it. */
export type FrameSpec = {
  key: string
  type: AssetType
  state: FrameState
  title: string
  artist?: string
  price?: string
  hash?: string
  note?: string
}

/** The agent's four slots, in the order it plans them (mirrors packages/agent makePlan). */
export const SLOTS: AssetType[] = ['exclusive', 'music', 'broll', 'sfx']

const STATE: Partial<Record<Decision['action'], FrameState>> = { paid: 'paid', refused: 'refused', skip: 'skip', failed: 'failed' }

/** Each slot logs exactly one decision with an asset type, in plan order; unreached slots stay unexposed. */
export function reelFrames(trace: Decision[], licenses: License[]): FrameSpec[] {
  const decided = trace.filter((d) => d.assetType && STATE[d.action])
  // a reel recorded under the earlier seven-slot plan keeps every decided frame
  const lanes = decided.length > SLOTS.length ? decided.map((d) => d.assetType!) : SLOTS
  return lanes.map((type, i): FrameSpec => {
    const d = decided[i]
    if (!d) return { key: `slot-${i}`, type, state: 'empty', title: '' }
    const state = STATE[d.action]!
    const frame: FrameSpec = { key: d.assetId ?? `slot-${i}`, type: d.assetType!, state, title: d.title ?? '' }
    if (state === 'paid') {
      frame.artist = licenses.find((l) => l.assetId === d.assetId)?.artist
      frame.price = d.price
      frame.hash = d.hash
    } else {
      if (d.price) frame.price = d.price
      frame.note = d.reason
    }
    return frame
  })
}
