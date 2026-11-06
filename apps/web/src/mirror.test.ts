import { ASSETS, MOODS as SHARED_MOODS } from '@clippass/shared'
import { makePlan } from '@clippass/agent'
import { LANES, MOODS } from './mirror'
import { SLOTS } from './reel/frames'

test('reel slots follow the agent plan order', () => {
  expect(SLOTS).toEqual(makePlan('anything', 'chill').map((s) => s.type))
})

test('web mirror matches the shared catalog', () => {
  expect([...MOODS]).toEqual([...SHARED_MOODS])
  expect(LANES.map((l) => l.type).sort()).toEqual(['broll', 'exclusive', 'music', 'sfx'])
  for (const l of LANES) {
    const max = ASSETS.filter((a) => a.type === l.type).reduce((m, a) => (a.price > m ? a.price : m), 0n)
    expect(l.price, l.type).toBe(Number(max) / 1e7)
  }
})
