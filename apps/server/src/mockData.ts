import type { EndpointName } from '@clippass/shared'

// Data is mocked by design (spec); only the payment rail is real.
const DATA: Record<EndpointName, unknown> = {
  quote: { symbol: 'XLM', usd: '0.12', change24h: '+1.8%', volume24hUsd: '84200000' },
  weather: { city: 'Manila', tempC: 31, conditions: 'humid, scattered storms', windKph: 14 },
  news: {
    headlines: [
      'Stellar Testnet sees record Soroban contract calls',
      'Agent payments: pay-per-call APIs gain traction',
      'Card-linked escrow wallets enter pilot programs',
    ],
  },
  report: { title: 'Deep market report', pages: 42, summary: 'Full sector analysis with forecasts.' },
}

export const mockData = (name: EndpointName): unknown => DATA[name]
