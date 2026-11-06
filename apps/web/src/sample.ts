import type { Decision, JobView, License } from '@clippass/shared'
import { DEMO_REEL } from './reel/demo'
import { SLOTS, type FrameSpec } from './reel/frames'

/** README "Artist accounts". */
const ADDRESSES: Record<string, string> = {
  'Lowtide Loops': 'GBLSA47JDN23GF6TGNQQLNOAQOWU7Y43EXGHNLPZY6MALYTCNLK2BQVK',
  'Paper Lantern Films': 'GAGVLOURGZCBDHWT25URFH5J425LXMSCK5XZDW3P6UY64Z5BV4W3PC4C',
  'Kestrel Studio': 'GA6ZWR7MMMXYRXO7YVFOZP4Z7BUM4ILLZFUGLFQDJEJGRXTWZTTQR4TA',
  'Foley Fern': 'GB6VFK2RH5SKE4W4TBU5YM2UAARLUR676XOJ22LL3X5ITH4KSBVZFHLI',
}

/** Catalog tags each pick shares with the script or mood. The model tagged this run, so no price comparisons. */
const MATCHES: Record<string, string> = {
  'm-lofi': 'chill',
  'b-glass': 'rain, night',
  'b-market': 'night, market, street',
  'b-food': 'food, street, market',
  's-rain': 'rain',
  's-sizzle': 'sizzle, food',
}

/** The proof commit is dated Nov 6 and the repo began that day. The run's time of day isn't recorded. */
const AT = '2026-11-06'

const why = (f: FrameSpec) => `picked ${f.title}: matches ${MATCHES[f.key]}`

const license = (f: FrameSpec): License => ({
  assetId: f.key, assetType: f.type, title: f.title, artist: f.artist!, artistAddress: ADDRESSES[f.artist!],
  price: f.price!, hash: f.hash!, licenseId: f.hash!, terms: 'single use in one reel', decision: why(f),
})

const decision = (f: FrameSpec): Decision => {
  const at = { at: AT, assetId: f.key, assetType: f.type, title: f.title, price: f.price! }
  return f.state === 'paid' ? { ...at, action: 'paid', reason: why(f), hash: f.hash } : { ...at, action: 'refused', reason: f.note! }
}

const licenses = DEMO_REEL.filter(f => f.state === 'paid').map(license)

const SUMMARY = [
  `Licensed 6 assets from 4 artists: ${licenses.map(l => l.title).join(', ')}.`,
  'Spent 0.63 of 2.5 XLM.',
  'Refused by card: Neon Crown (exclusive rights) (exclusive, over_limit).',
].join('\n')

/** The real reel from `npm run demo` (README "Testnet proof"), as the job page would have shown it. */
export const SAMPLE_JOB: JobView = {
  jobId: 'sample',
  script: 'Rain at a night market in Manila, street food sizzle, crowd chatter',
  mood: 'chill',
  budget: '25000000',
  status: 'done',
  veloStatus: null,
  checkoutUrl: '',
  trace: [
    { at: AT, action: 'plan', reason: `budget 2.5 XLM; plan: ${SLOTS.join(', ')}` },
    ...DEMO_REEL.map(decision),
    { at: AT, action: 'done', reason: SUMMARY },
  ],
  licenses,
  summary: SUMMARY,
}
