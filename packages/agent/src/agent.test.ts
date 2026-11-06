import { NoirContractError, type NoirSigner } from '@noirx402/agent-sdk'
import { DEMO_SCRIPT, POLICY_MAX, assetById, type Decision, type Mood } from '@clippass/shared'
import { makePlan, pick, runAgent, paidFetch, type NoirPort, type Planner } from './index'

const signer: NoirSigner = { publicKey: 'GAGENT', signTransaction: async () => '' }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

/** Plays the stock library: 402 quote payable to the artist without proof, a license with one. */
function fakeMerchant(o: { notFound?: boolean; markup?: bigint } = {}) {
  const proofs: string[] = []
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const id = url.split('/').pop()!
    const asset = assetById(id)
    if (!asset) return json(404, { error: 'unknown asset' })
    const proof = new Headers(init?.headers).get('X-Payment')
    if (!proof) {
      const price = (asset.price + (o.markup ?? 0n)).toString()
      return json(402, { quoteId: `q-${id}`, price, asset: 'CSAC', merchant: `G-${asset.artist}`, network: 'testnet', expiresAt: '' })
    }
    proofs.push(proof)
    return o.notFound ? json(402, { reason: 'not_found' }) : json(200, { assetId: id, licenseId: proof })
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

async function run(budget: bigint, m = fakeMerchant(), n = fakeNoir(), script = DEMO_SCRIPT, mood: Mood = 'chill', planner?: Planner) {
  const log: Decision[] = []
  const result = await runAgent({
    script, mood, budget, baseUrl: 'http://merchant', noir: n.noir, agent: signer, deviceHash: 'ab'.repeat(32),
    log: (d) => log.push(d), fetch: m.fetch, delayMs: 0, planner,
  })
  return { log, result, ...n, ...m }
}

const runWith = (o: { budget: bigint; planner?: Planner }) => run(o.budget, fakeMerchant(), fakeNoir(), DEMO_SCRIPT, 'chill', o.planner)

test('plan: exclusive first, then music, 3 b-roll, 2 sfx', () => {
  expect(makePlan(DEMO_SCRIPT, 'chill').map((s) => s.type)).toEqual(['exclusive', 'music', 'broll', 'broll', 'broll', 'sfx', 'sfx'])
  expect(makePlan(DEMO_SCRIPT, 'chill')[2].tags).toEqual(['rain', 'night', 'market', 'street', 'food'])
})

test('matching ignores case, punctuation and suffixes', () => {
  expect(makePlan('RAIN!!! Night-markets… street-food', 'chill')[2].tags.sort()).toEqual(['food', 'market', 'night', 'rain', 'street'])
})

test('demo reel licenses six assets from four artists and the card refuses the exclusive', async () => {
  const { result, log, authorized } = await run(25_000_000n)
  expect(result.licenses.map((l) => l.assetId)).toEqual(['m-lofi', 'b-market', 'b-food', 'b-glass', 's-sizzle', 's-crowd'])
  expect(new Set(result.licenses.map((l) => l.artistAddress)).size).toBe(4)
  expect(result.spent).toBe(6_700_000n)
  expect(log.find((d) => d.assetId === 'x-crown')).toMatchObject({ action: 'refused', reason: 'over_limit' })
  expect(authorized.some((a) => a.amount === 20_000_000n)).toBe(false)
  expect(result.summary).toBe([
    'Licensed 6 assets from 4 artists: Low Tide Lo-fi, Night Market Lights, Street Food Close-ups, Rain on Glass, Wok Sizzle, Market Crowd.',
    'Spent 0.67 of 2.5 XLM.',
    'Refused by card: Neon Crown (exclusive rights) (exclusive, over_limit).',
  ].join('\n'))
})

test('pick reasons: cheaper of equal matches, and no duplicates', async () => {
  const { result } = await run(25_000_000n)
  const why = Object.fromEntries(result.licenses.map((l) => [l.assetId, l.decision]))
  expect(why['s-sizzle']).toMatch(/^picked Wok Sizzle over Market Crowd: same match, 0.02 cheaper/)
  expect(why['b-food']).toMatch(/^Night Market Lights already used in this reel; next best Street Food Close-ups/)
})

test('same tag on every slot still licenses distinct assets', async () => {
  const planner: Planner = async (_s, _m, slots) => slots.map((s) => (s.type === 'broll' ? { ...s, tags: ['market'] } : s))
  const { result } = await runWith({ budget: 25_000_000n, planner })
  expect(result.licenses.filter((l) => l.assetType === 'broll').map((l) => l.assetId)).toEqual(['b-market', 'b-food', 'b-drizzle'])
})

test('script with no tag words still fills every slot', async () => {
  const { result } = await run(25_000_000n, fakeMerchant(), fakeNoir(), 'hello world')
  expect(result.licenses.map((l) => l.assetType)).toEqual(['music', 'broll', 'broll', 'broll', 'sfx', 'sfx'])
  expect(result.licenses[1].decision).toMatch(/^no tag match; cheapest unused: City Drizzle/)
})

test('quote above the listed price is skipped', async () => {
  const { result, log } = await run(25_000_000n, fakeMerchant({ markup: 1n })) // every quote is listed price + 1 stroop
  expect(result.licenses).toEqual([])
  for (const d of log.filter((d) => d.assetId)) expect(d).toMatchObject({ action: 'skip', reason: expect.stringMatching(/^quote .* above listed .* XLM$/) })
})

test('over budget is skipped', async () => {
  const { log } = await runWith({ budget: 1_000_000n, planner: async (_s, _m, slots) => slots.slice(1) }) // 0.1 XLM, no exclusive
  expect(log.find((d) => d.assetId === 'm-lofi')).toMatchObject({ action: 'skip', reason: expect.stringMatching(/^over budget/) })
})

test('NoirContractError fails only that purchase', async () => {
  const { log, result } = await run(25_000_000n, fakeMerchant(), fakeNoir({ throwOnce: true }))
  expect(log.find((d) => d.action === 'failed')!.assetId).toBe('m-lofi') // first authorize; the exclusive never reaches it
  expect(result.licenses.map((l) => l.assetId)).toEqual(['b-market', 'b-food', 'b-glass', 's-sizzle', 's-crowd'])
})

test('pick returns null when a lane is used up', () => {
  expect(pick({ type: 'exclusive', tags: ['chill'], why: '' }, new Set(['x-crown']))).toBeNull()
})

test('gives up after 3 not_found retries', async () => {
  const m = fakeMerchant({ notFound: true })
  const r = await paidFetch('http://merchant/api/assets/s-sizzle', async () => 'txX', { fetch: m.fetch, delayMs: 0 })
  expect(r).toEqual({ status: 'rejected', reason: 'not_found', hash: 'txX' })
  expect(m.proofs).toHaveLength(3)
})

test('declined quote makes no proof request', async () => {
  const m = fakeMerchant()
  expect(await paidFetch('http://merchant/api/assets/s-sizzle', async () => null, { fetch: m.fetch })).toEqual({ status: 'declined' })
  expect(m.proofs).toHaveLength(0)
})
