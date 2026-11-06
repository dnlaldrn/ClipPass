import type { Decision, License } from '@clippass/shared'
import { reelFrames, SLOTS } from './frames'

const d = (o: Partial<Decision>): Decision => ({ at: '', action: 'plan', reason: '', ...o })

test('one frame per slot, in plan order, padded with unexposed frames', () => {
  const trace = [
    d({ action: 'plan', reason: 'budget 2.5 XLM; plan: ...' }),
    d({ action: 'refused', assetId: 'x-crown', assetType: 'exclusive', title: 'Neon Crown (exclusive rights)', price: '20000000', reason: 'over_limit' }),
    d({ action: 'paid', assetId: 'm-lofi', assetType: 'music', title: 'Low Tide Lo-fi', price: '1800000', reason: 'picked …', hash: 'tx1' }),
    d({ action: 'skip', assetType: 'broll', reason: 'no unused broll left' }),
    d({ action: 'failed', reason: 'agent crashed: rpc down' }), // no slot: never becomes a frame
  ]
  const licenses = [{ assetId: 'm-lofi', artist: 'Lowtide Loops' }] as License[]
  const frames = reelFrames(trace, licenses)
  expect(frames).toHaveLength(SLOTS.length)
  expect(frames.slice(0, 3)).toEqual([
    { key: 'x-crown', type: 'exclusive', state: 'refused', title: 'Neon Crown (exclusive rights)', price: '20000000', note: 'over_limit' },
    { key: 'm-lofi', type: 'music', state: 'paid', title: 'Low Tide Lo-fi', artist: 'Lowtide Loops', price: '1800000', hash: 'tx1' },
    { key: 'slot-2', type: 'broll', state: 'skip', title: '', note: 'no unused broll left' },
  ])
  expect(frames.slice(3).map((f) => [f.type, f.state])).toEqual([['broll', 'empty'], ['broll', 'empty'], ['sfx', 'empty'], ['sfx', 'empty']])
})
