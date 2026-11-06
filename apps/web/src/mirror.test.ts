import { ASSETS, MOODS as SHARED_MOODS } from '@clippass/shared'
import { LANES, MOODS } from './mirror'

test('web mirror matches the shared catalog', () => {
  expect([...MOODS]).toEqual([...SHARED_MOODS])
  expect(LANES.map((l) => l.type).sort()).toEqual(['broll', 'exclusive', 'music', 'sfx'])
  for (const l of LANES) {
    const max = ASSETS.filter((a) => a.type === l.type).reduce((m, a) => (a.price > m ? a.price : m), 0n)
    expect(l.price, l.type).toBe(Number(max) / 1e7)
  }
})
