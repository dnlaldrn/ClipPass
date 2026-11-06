import type { AssetType, CatalogItem } from '@clippass/shared'
import type { Balances } from '../api'

export const LANE_LABELS: Record<AssetType, string> = {
  music: 'Music', broll: 'B-roll', sfx: 'SFX', exclusive: 'Exclusive',
}
export type LaneFilter = AssetType | 'all'
export type PriceOrder = 'asc' | 'desc'

export function comparePrices(a: CatalogItem, b: CatalogItem): number {
  const first = BigInt(a.price), second = BigInt(b.price)
  return first < second ? -1 : first > second ? 1 : 0
}

export function filterLibrary(assets: CatalogItem[], lane: LaneFilter, query: string, order: PriceOrder): CatalogItem[] {
  const search = query.trim().toLowerCase()
  return assets.filter(asset => (lane === 'all' || asset.type === lane)
    && (!search || asset.title.toLowerCase().includes(search)
      || asset.tags.some(tag => tag.toLowerCase().includes(search))))
    .sort((a, b) => (order === 'asc' ? 1 : -1) * comparePrices(a, b) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
}

export function gaugeScale(assets: CatalogItem[], cardLimit: string): bigint {
  return assets.reduce((max, asset) => BigInt(asset.price) > max ? BigInt(asset.price) : max, BigInt(cardLimit)) || 1n
}

/** Convert only a bounded display ratio to number; money comparisons stay in bigint. */
export function gaugePercent(value: string, scale: bigint): number {
  if (scale <= 0n) return 0
  const amount = BigInt(value)
  const bounded = amount < 0n ? 0n : amount > scale ? scale : amount
  return Number(bounded * 10_000n / scale) / 100
}

export type Studio = {
  id: string; name: string; address: string; pending: string | null; assets: CatalogItem[]
}

export function groupStudios(assets: CatalogItem[], balances: Balances): Studio[] {
  const studios = new Map<string, Studio>()
  for (const artist of balances.artists) {
    studios.set(artist.id, { ...artist, assets: [] })
  }
  for (const asset of assets) {
    let studio = studios.get(asset.artistId)
    if (!studio) {
      studio = { id: asset.artistId, name: asset.artist, address: asset.address, pending: null, assets: [] }
      studios.set(studio.id, studio)
    }
    studio.assets.push(asset)
  }
  return [...studios.values()].map(studio => ({ ...studio, assets: [...studio.assets].sort(comparePrices) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
