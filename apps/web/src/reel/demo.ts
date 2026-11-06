import type { FrameSpec } from './frames'

/** The real Testnet reel from `npm run demo` (README "Testnet proof"), replayed on the start page. */
export const DEMO_REEL: FrameSpec[] = [
  { key: 'x-crown', type: 'exclusive', state: 'refused', title: 'Neon Crown (exclusive rights)', price: '20000000', note: 'over_limit' },
  { key: 'm-lofi', type: 'music', state: 'paid', title: 'Low Tide Lo-fi', artist: 'Lowtide Loops', price: '1800000', hash: '70bbd5046ad853e82ec58cfec9d9eb739caa67e30244c3f1c82af9ec73823b29' },
  { key: 'b-market', type: 'broll', state: 'paid', title: 'Night Market Lights', artist: 'Paper Lantern Films', price: '1200000', hash: 'c447ac39ac2554ea62965895dbe3f93e000aee6e94b7e7a8abd2539364ed8da5' },
  { key: 's-sizzle', type: 'sfx', state: 'paid', title: 'Wok Sizzle', artist: 'Foley Fern', price: '500000', hash: 'ebe9a228a72ac51437f3f60957b3536b6d8f7bcabf6ba8d6b80b75e1c6a119ba' },
]
