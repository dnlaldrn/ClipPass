import type { FrameSpec } from './frames'

/** The real Testnet reel from `npm run demo` (README "Testnet proof"), replayed on the start page. */
export const DEMO_REEL: FrameSpec[] = [
  { key: 'x-crown', type: 'exclusive', state: 'refused', title: 'Neon Crown (exclusive rights)', price: '20000000', note: 'over_limit' },
  { key: 'm-lofi', type: 'music', state: 'paid', title: 'Low Tide Lo-fi', artist: 'Lowtide Loops', price: '1800000', hash: '30f927544cf0d4bab369d1ad8f6210e9a24da0ccda39d297bc47acb48dfda5b1' },
  { key: 'b-glass', type: 'broll', state: 'paid', title: 'Rain on Glass', artist: 'Paper Lantern Films', price: '1000000', hash: 'ef7c8d3ac60d234297f5787a0bb82da4021afa7dc3cba5642fa60a25ac201836' },
  { key: 'b-market', type: 'broll', state: 'paid', title: 'Night Market Lights', artist: 'Paper Lantern Films', price: '1200000', hash: '5e22b03d5f1f8d8a6e0ad266df82f515805e96691fadce44758c3738a95781a1' },
  { key: 'b-food', type: 'broll', state: 'paid', title: 'Street Food Close-ups', artist: 'Kestrel Studio', price: '1500000', hash: 'a00a7b5b2cdbe3116fda8d9beaa85f7ab5cd40f571b769033c038690a3b2de32' },
  { key: 's-rain', type: 'sfx', state: 'paid', title: 'Rain on Tin Roof', artist: 'Foley Fern', price: '300000', hash: '99d4995a8624cdf9218690aaa58e981dc7dba2bbcd98fcdb517bcf81b3f6aaa2' },
  { key: 's-sizzle', type: 'sfx', state: 'paid', title: 'Wok Sizzle', artist: 'Foley Fern', price: '500000', hash: '950dbd8cad6f4414129bde098a45be971fb45675ce09e07efaa2bdea90aa7e58' },
]
