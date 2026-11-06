import { ASSETS, MOODS as SHARED_MOODS } from '@clippass/shared'
import { makePlan, laneTags } from '@clippass/agent'
import { BROLL_TAGS, LANES, MOODS, SFX_TAGS } from './mirror'
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

test('script tag vocabulary mirrors each agent lane in first-seen order', () => {
  expect([...BROLL_TAGS]).toEqual(laneTags('broll'))
  expect([...SFX_TAGS]).toEqual(laneTags('sfx'))
})
