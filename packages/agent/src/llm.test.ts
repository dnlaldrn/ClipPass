import { toStroops } from '@noirx402/agent-sdk'
import { makePlan, ollamaPlanner } from './index'

const ollamaReply = (content: unknown) =>
  (async () => new Response(JSON.stringify({ message: { content: JSON.stringify(content) } }))) as unknown as typeof fetch

test('model re-scores quote/weather/news, keeps report, clamps to 0..5 XLM', async () => {
  const fetch = ollamaReply({ quote: { value: 9, why: 'core' }, weather: { value: 0.01, why: 'irrelevant' }, news: { value: -2, why: 'stale' } })
  const plan = await ollamaPlanner({ model: 'm', fetch })('stellar fees', makePlan('stellar fees'))
  const by = Object.fromEntries(plan.map((p) => [p.endpoint, p]))
  expect(by.report).toEqual(makePlan('stellar fees')[0])
  expect(by.quote.value).toBe(toStroops('5'))
  expect(by.weather.value).toBe(toStroops('0.01'))
  expect(by.news.value).toBe(0n)
  expect(by.quote.why).toBe('m: core')
})

test('falls back to the rule plan on bad output or a dead model', async () => {
  const rules = makePlan('stellar fees')
  expect(await ollamaPlanner({ model: 'm', fetch: ollamaReply({ quote: { value: 'lots' } }) })('stellar fees', rules)).toEqual(rules)
  const down = (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
  expect(await ollamaPlanner({ model: 'm', fetch: down })('stellar fees', rules)).toEqual(rules)
})
