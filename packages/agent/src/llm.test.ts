import { DEMO_SCRIPT } from '@clippass/shared'
import { laneTags, makePlan, ollamaPlanner } from './index'

const VALID = {
  music: { tag: 'chill', why: 'calm' }, broll1: { tag: 'beach', why: 'sunny' }, sfx1: { tag: 'crowd', why: 'busy' },
}
const ollamaReply = (content: unknown, seen: unknown[] = []) =>
  (async (_url: string, init?: RequestInit) => {
    seen.push(JSON.parse(String(init?.body)))
    return new Response(JSON.stringify({ message: { content: JSON.stringify(content) } }))
  }) as unknown as typeof fetch
const rules = () => makePlan(DEMO_SCRIPT, 'chill')

test('model tags each slot; exclusive untouched', async () => {
  const seen: any[] = []
  const slots = await ollamaPlanner({ model: 'm', fetch: ollamaReply(VALID, seen) })(DEMO_SCRIPT, 'chill', rules())
  expect(slots[0]).toEqual(rules()[0])
  expect(slots[2]).toMatchObject({ type: 'broll', tags: ['beach'], why: 'm: sunny' })
  expect(slots[3]).toMatchObject({ type: 'sfx', tags: ['crowd'], why: 'm: busy' })
  const props = seen[0].format.properties
  expect(Object.keys(props)).toEqual(['broll1', 'sfx1'])
  expect(props.broll1.properties.tag.enum).toEqual(laneTags('broll'))
})

test('the creator’s mood is never overridden for music', async () => {
  const fetch = ollamaReply({ ...VALID, music: { tag: 'upbeat', why: 'energy' } })
  const slots = await ollamaPlanner({ model: 'm', fetch })(DEMO_SCRIPT, 'chill', rules())
  expect(slots[1]).toEqual(rules()[1])
})

test('a tag outside the lane vocabulary keeps that slot rule-tagged', async () => {
  const fetch = ollamaReply({ ...VALID, sfx1: { tag: 'explosion', why: 'x' } })
  const slots = await ollamaPlanner({ model: 'm', fetch })(DEMO_SCRIPT, 'chill', rules())
  expect(slots[3]).toEqual(rules()[3])
  expect(slots[2].tags).toEqual(['beach'])
})

test('falls back to the rule plan on bad output or a dead model', async () => {
  expect(await ollamaPlanner({ model: 'm', fetch: ollamaReply('not json at all') })(DEMO_SCRIPT, 'chill', rules())).toEqual(rules())
  const down = (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
  expect(await ollamaPlanner({ model: 'm', fetch: down })(DEMO_SCRIPT, 'chill', rules())).toEqual(rules())
})
