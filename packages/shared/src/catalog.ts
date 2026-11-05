export type EndpointName = 'quote' | 'weather' | 'news' | 'report'

export const CATALOG: Record<EndpointName, { path: string; price: bigint; description: string }> = {
  quote: { path: '/api/data/quote', price: 1_000_000n, description: 'mock market quote' },
  weather: { path: '/api/data/weather', price: 500_000n, description: 'mock weather' },
  news: { path: '/api/data/news', price: 2_000_000n, description: 'mock headlines' },
  report: { path: '/api/data/report', price: 20_000_000n, description: 'deep report (above the 1 XLM cap)' },
}

/** Per-payment cap set on the agent's Noir policy: 1 XLM. */
export const POLICY_MAX = 10_000_000n
/** Flat Velo job fee. */
export const JOB_FEE = '1.00'
/** Largest job budget a user may ask for: 5 XLM. */
export const MAX_JOB_BUDGET = 50_000_000n
export const QUOTE_TTL_MS = 120_000
