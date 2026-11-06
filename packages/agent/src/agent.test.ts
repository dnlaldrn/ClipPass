import { NoirContractError, type NoirSigner } from '@noirx402/agent-sdk'
import { CATALOG, POLICY_MAX, type Decision, type EndpointName } from '@clippass/shared'
import { makePlan, runAgent, paidFetch, type NoirPort } from './index'

const signer: NoirSigner = { publicKey: 'GAGENT', signTransaction: async () => '' }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

/** Plays the merchant: 402 quote without proof, data with one (or not_found forever). */
function fakeMerchant(o: { notFound?: boolean } = {}) {
  const proofs: string[] = []
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const name = url.split('/').pop() as EndpointName
    const proof = new Headers(init?.headers).get('X-Payment')
    if (!proof) {
      return json(402, { quoteId: `q-${name}`, price: CATALOG[name].price.toString(), asset: 'CSAC', merchant: 'GMERCH', network: 'testnet', expiresAt: '' })
    }
    proofs.push(proof)
    return o.notFound ? json(402, { reason: 'not_found' }) : json(200, { endpoint: name, data: { name } })
  }) as typeof globalThis.fetch
  return { fetch: fakeFetch, proofs }
}

/** Mirrors the on-chain policy: refuses anything over the 1 XLM cap. */
function fakeNoir(o: { throwOnce?: boolean } = {}) {
  const authorized: { amount: bigint; merchant: string }[] = []
  let thrown = false
  const noir: NoirPort = {
    checkPayment: async (p) => (p.amount > POLICY_MAX ? { ok: false, reason: 'over_limit' } : { ok: true }),
    authorizePayment: async (p) => {
      if (o.throwOnce && !thrown) { thrown = true; throw new NoirContractError('paymentEscrow', 7, 'DuplicateAuth', 'authorize') }
      authorized.push({ amount: p.amount, merchant: p.merchant })
      return { hash: `tx${authorized.length}`, nonce: 0n }
    },
  }
  return { noir, authorized }
}

async function run(budget: bigint, m = fakeMerchant(), n = fakeNoir(), topic = 'stellar fees') {
  const log: Decision[] = []
  const result = await runAgent({
    topic, budget, baseUrl: 'http://merchant', noir: n.noir, agent: signer, deviceHash: 'ab'.repeat(32),
    log: (d) => log.push(d), fetch: m.fetch, delayMs: 0,
  })
  return { log, result, ...n, ...m }
}

test('makePlan always includes report, first', () => {
  expect(makePlan('anything')[0].endpoint).toBe('report')
  expect(makePlan('weather in Manila').map((i) => i.endpoint)).toContain('report')
})

test('non-weather topic gives weather low value', () => {
  const w = makePlan('stellar fees').find((i) => i.endpoint === 'weather')!
  expect(w.value < CATALOG.weather.price).toBe(true)
  expect(makePlan('travel weather').find((i) => i.endpoint === 'weather')!.value >= CATALOG.weather.price).toBe(true)
})

test('budget skip', async () => {
  const { log, result } = await run(1_500_000n) // 0.15 XLM
  expect(result.payments.map((p) => p.endpoint)).toEqual(['quote'])
  const news = log.find((d) => d.endpoint === 'news')!
  expect(news.action).toBe('skip')
  expect(news.reason).toMatch(/^over budget/)
  expect(log.find((d) => d.endpoint === 'weather')!.reason).toMatch(/^low value/)
})

test('policy refusal is logged and not paid', async () => {
  const { log, authorized } = await run(50_000_000n)
  const report = log.find((d) => d.endpoint === 'report')!
  expect(report).toMatchObject({ action: 'refused', reason: 'over_limit' })
  expect(authorized.some((a) => a.amount === CATALOG.report.price)).toBe(false)
})

test('success records payment', async () => {
  const { result, log } = await run(50_000_000n)
  expect(result.payments[0]).toMatchObject({ endpoint: 'quote', price: '1000000', hash: 'tx1' })
  expect(result.spent).toBe(3_000_000n) // quote 0.1 + news 0.2
  expect(log.at(-1)!.action).toBe('done')
  expect(result.summary).toMatch(/over_limit/)
})

test('NoirContractError fails only that purchase', async () => {
  const { log, result } = await run(50_000_000n, fakeMerchant(), fakeNoir({ throwOnce: true }))
  const failed = log.find((d) => d.action === 'failed')!
  expect(failed.endpoint).toBe('quote')
  expect(failed.reason).toMatch(/DuplicateAuth/)
  expect(result.payments.map((p) => p.endpoint)).toEqual(['news'])
})

test('gives up after 3 not_found retries', async () => {
  const m = fakeMerchant({ notFound: true })
  const r = await paidFetch('http://merchant/api/data/quote', async () => 'txX', { fetch: m.fetch, delayMs: 0 })
  expect(r).toEqual({ status: 'rejected', reason: 'not_found', hash: 'txX' })
  expect(m.proofs).toHaveLength(3)
})

test('declined quote makes no proof request', async () => {
  const m = fakeMerchant()
  expect(await paidFetch('http://merchant/api/data/quote', async () => null, { fetch: m.fetch })).toEqual({ status: 'declined' })
  expect(m.proofs).toHaveLength(0)
})

test('planner values drive decisions', async () => {
  const log: Decision[] = []
  const m = fakeMerchant(), n = fakeNoir()
  await runAgent({
    topic: 'stellar fees', budget: 50_000_000n, baseUrl: 'http://merchant', noir: n.noir, agent: signer, deviceHash: 'ab'.repeat(32),
    log: (d) => log.push(d), fetch: m.fetch, delayMs: 0,
    planner: async (_t, plan) => plan.map((p) => (p.endpoint === 'weather' ? { ...p, value: 10_000_000n } : p)),
  })
  expect(log.find((d) => d.endpoint === 'weather')!.action).toBe('paid')
})
