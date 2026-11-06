import type { AssetType } from '@clippass/shared'

// Mirrors @clippass/shared so the page doesn't bundle the Stellar SDK; mirror.test.ts guards drift.
export const MOODS = ['upbeat', 'chill', 'dramatic', 'cinematic'] as const

/** Each lane's highest asset price in XLM, cheapest lane first. */
export const LANES: { type: AssetType; label: string; price: number }[] = [
  { type: 'sfx', label: 'SFX', price: 0.07 },
  { type: 'broll', label: 'B-roll', price: 0.15 },
  { type: 'music', label: 'Music', price: 0.3 },
  { type: 'exclusive', label: 'Exclusive', price: 2 },
]
