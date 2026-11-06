import type { Decision, JobView, License } from '@clippass/shared'
import { DEMO_REEL } from './reel/demo'
import type { FrameSpec } from './reel/frames'

/** README "Artist accounts". */
const ADDRESSES: Record<string, string> = {
  'Lowtide Loops': 'GBLSA47JDN23GF6TGNQQLNOAQOWU7Y43EXGHNLPZY6MALYTCNLK2BQVK',
  'Paper Lantern Films': 'GAGVLOURGZCBDHWT25URFH5J425LXMSCK5XZDW3P6UY64Z5BV4W3PC4C',
  'Kestrel Studio': 'GA6ZWR7MMMXYRXO7YVFOZP4Z7BUM4ILLZFUGLFQDJEJGRXTWZTTQR4TA',
  'Foley Fern': 'GB6VFK2RH5SKE4W4TBU5YM2UAARLUR676XOJ22LL3X5ITH4KSBVZFHLI',
}

/** The agent's own words for each pick, copied from the run's log. */
const REASONS: Record<string, string> = {
  'm-lofi': 'picked Low Tide Lo-fi over Night Drift: same match, 0.04 cheaper; 0.18 XLM within budget and card policy',
  'b-market': 'picked Night Market Lights over Street Food Close-ups: same match, 0.03 cheaper; 0.12 XLM within budget and card policy',
  's-sizzle': 'picked Wok Sizzle over Market Crowd: same match, 0.02 cheaper; 0.05 XLM within budget and card policy',
}

const PLAN = 'budget 2.5 XLM; plan: exclusive (exclusive rights to a chill track would cover the whole reel); music (mood chill); '
  + 'broll (script mentions rain, night, market, street, food); sfx (script mentions rain, sizzle, food, crowd, market)'

/** Recorded on Nov 7 (UTC+8). The log keeps no time of day. */
const AT = '2026-11-07'

const license = (f: FrameSpec): License => ({
  assetId: f.key, assetType: f.type, title: f.title, artist: f.artist!, artistAddress: ADDRESSES[f.artist!],
  price: f.price!, hash: f.hash!, licenseId: f.hash!, terms: 'single use in one reel', decision: REASONS[f.key],
})

const decision = (f: FrameSpec): Decision => {
  const at = { at: AT, assetId: f.key, assetType: f.type, title: f.title, price: f.price! }
  return f.state === 'paid' ? { ...at, action: 'paid', reason: REASONS[f.key], hash: f.hash } : { ...at, action: 'refused', reason: f.note! }
}

const licenses = DEMO_REEL.filter(f => f.state === 'paid').map(license)

const SUMMARY = [
  `Licensed 3 assets from 3 artists: ${licenses.map(l => l.title).join(', ')}.`,
  'Spent 0.35 of 2.5 XLM.',
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
    { at: AT, action: 'plan', reason: PLAN },
    ...DEMO_REEL.map(decision),
    { at: AT, action: 'done', reason: SUMMARY },
  ],
  licenses,
  summary: SUMMARY,
}
