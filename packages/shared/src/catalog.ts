export type AssetType = 'music' | 'broll' | 'sfx' | 'exclusive'
export type ArtistId = 'lowtide' | 'lantern' | 'kestrel' | 'fern'
export type Asset = { id: string; type: AssetType; title: string; artist: ArtistId; tags: string[]; price: bigint; preview: string }

export const MOODS = ['upbeat', 'chill', 'dramatic', 'cinematic'] as const
export type Mood = (typeof MOODS)[number]

/** Fictional studios; each gets its own Testnet account from npm run setup. */
export const ARTISTS: Record<ArtistId, { name: string }> = {
  lowtide: { name: 'Lowtide Loops' },
  lantern: { name: 'Paper Lantern Films' },
  kestrel: { name: 'Kestrel Studio' },
  fern: { name: 'Foley Fern' },
}

const asset = (id: string, type: AssetType, title: string, artist: ArtistId, tags: string[], price: bigint): Asset =>
  ({ id, type, title, artist, tags, price, preview: `https://clippass.example/preview/${id}` })

// Media is mocked by design; only the payment rail is real.
export const ASSETS: Asset[] = [
  asset('m-sunny', 'music', 'Sunny Side Loop', 'lowtide', ['upbeat'], 1_500_000n),
  asset('m-lofi', 'music', 'Low Tide Lo-fi', 'lowtide', ['chill'], 1_800_000n),
  asset('m-drift', 'music', 'Night Drift', 'lowtide', ['chill', 'cinematic'], 2_200_000n),
  asset('m-reveal', 'music', 'Big Reveal', 'kestrel', ['dramatic', 'cinematic'], 3_000_000n),
  asset('b-drizzle', 'broll', 'City Drizzle', 'kestrel', ['rain', 'city'], 800_000n),
  asset('b-beach', 'broll', 'Sunset Beach', 'lantern', ['beach', 'sunset'], 900_000n),
  asset('b-glass', 'broll', 'Rain on Glass', 'lantern', ['rain', 'night'], 1_000_000n),
  asset('b-market', 'broll', 'Night Market Lights', 'lantern', ['night', 'market', 'street'], 1_200_000n),
  asset('b-food', 'broll', 'Street Food Close-ups', 'kestrel', ['food', 'street', 'market'], 1_500_000n),
  asset('s-rain', 'sfx', 'Rain on Tin Roof', 'fern', ['rain'], 300_000n),
  asset('s-whoosh', 'sfx', 'Whoosh Transition', 'fern', ['whoosh'], 400_000n),
  asset('s-sizzle', 'sfx', 'Wok Sizzle', 'fern', ['sizzle', 'food'], 500_000n),
  asset('s-crowd', 'sfx', 'Market Crowd', 'fern', ['crowd', 'market'], 700_000n),
  asset('x-crown', 'exclusive', 'Neon Crown (exclusive rights)', 'kestrel', ['upbeat', 'chill', 'dramatic', 'cinematic'], 20_000_000n),
]

export const assetById = (id: string): Asset | undefined => ASSETS.find((a) => a.id === id)

export const DEMO_SCRIPT = 'Rain at a night market in Manila, street food sizzle, crowd chatter'

/** Per-payment cap set on the agent's Noir policy: 1 XLM. */
export const POLICY_MAX = 10_000_000n
/** Flat Velo job fee. */
export const JOB_FEE = '1.00'
/** Smallest job budget: the exclusive's price, so every reel reaches the over-cap policy refusal. */
export const MIN_JOB_BUDGET = 20_000_000n
/** Largest job budget a user may ask for: 5 XLM. */
export const MAX_JOB_BUDGET = 50_000_000n
export const QUOTE_TTL_MS = 120_000
