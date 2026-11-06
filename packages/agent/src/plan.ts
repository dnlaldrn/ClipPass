import { ASSETS, type AssetType, type Mood } from '@clippass/shared'

export type Slot = { type: AssetType; tags: string[]; why: string }

/** A lane's tag vocabulary: every tag its assets carry, in first-seen order. */
export const laneTags = (type: AssetType): string[] =>
  [...new Set(ASSETS.filter((a) => a.type === type).flatMap((a) => a.tags))]

/**
 * Deterministic plan for one reel: exclusive, music, b-roll, sfx. Three paid slots keep a reel to three on-chain payments.
 * The exclusive goes first so the card refusal is reached before any budget is spent.
 */
export function makePlan(script: string, mood: Mood): Slot[] {
  const words = script.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  // a tag matches a word that starts with it: rainy → rain, markets → market
  const lane = (type: 'broll' | 'sfx'): Slot => {
    const tags = laneTags(type).filter((t) => words.some((w) => w.startsWith(t)))
    return tags.length
      ? { type, tags, why: `script mentions ${tags.join(', ')}` }
      : { type, tags: [mood], why: `no ${type} tags in the script; using mood ${mood}` }
  }
  return [
    { type: 'exclusive', tags: [mood], why: `exclusive rights to a ${mood} track would cover the whole reel` },
    { type: 'music', tags: [mood], why: `mood ${mood}` },
    lane('broll'),
    lane('sfx'),
  ]
}
