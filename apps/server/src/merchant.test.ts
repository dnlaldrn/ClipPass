import request from 'supertest'
import { NOIR_TESTNET_CONTRACTS, XLM_SAC } from '@clippass/shared'
import { createApp } from './app'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'

const PAYEES = { lowtide: 'GLOW', lantern: 'GLAN', kestrel: 'GKES', fern: 'GFERN' }
const DEVICE = 'ab'.repeat(32)

function setup(proofWaitMs?: number) {
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, deviceHash: DEVICE })
  const app = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, payees: PAYEES, proofWaitMs })] })
  const pay = (txHash: string, amount: bigint, merchant: string) =>
    verifier.recordEvent({ txHash, contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow, merchant, deviceHash: DEVICE, amount })
  return { app, pay }
}

test('no proof returns 402 with the asset price payable to its artist', async () => {
  const res = await request(setup().app).get('/api/assets/b-food')
  expect(res.status).toBe(402)
  expect(res.body).toMatchObject({ price: '1500000', asset: XLM_SAC, merchant: 'GKES', network: 'testnet' })
  expect(res.body.quoteId).toMatch(/^[0-9a-f-]{36}$/)
  expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now())
})

test('valid proof returns the license', async () => {
  const { app, pay } = setup()
  const { body: q } = await request(app).get('/api/assets/s-sizzle')
  pay('h1', 500_000n, 'GFERN')
  const res = await request(app).get('/api/assets/s-sizzle').set('X-Payment', 'h1').set('X-Quote-Id', q.quoteId)
  expect(res.status).toBe(200)
  expect(res.body).toEqual({
    assetId: 's-sizzle', title: 'Wok Sizzle', artist: 'Foley Fern', licenseId: 'h1',
    download: 'https://clippass.example/download/s-sizzle?tx=h1', terms: 'single use in one reel',
  })
})

test('bad proof returns 402 with reason', async () => {
  const { app, pay } = setup()
  const { body: q } = await request(app).get('/api/assets/s-sizzle')
  pay('h1', 500_000n, 'GOTHER')
  const res = await request(app).get('/api/assets/s-sizzle').set('X-Payment', 'h1').set('X-Quote-Id', q.quoteId)
  expect(res.status).toBe(402)
  expect(res.body).toEqual({ reason: 'wrong_merchant' })
})

test('unknown asset is 404', async () => {
  const res = await request(setup().app).get('/api/assets/nope')
  expect(res.status).toBe(404)
  expect(res.body).toEqual({ error: 'unknown asset' })
})

test('exclusive quote is 20000000', async () => {
  expect((await request(setup().app).get('/api/assets/x-crown')).body.price).toBe('20000000')
})

test('proof whose event lands while the request waits is accepted', async () => {
  const { app, pay } = setup(2000)
  const { body: q } = await request(app).get('/api/assets/s-sizzle')
  setTimeout(() => pay('late', 500_000n, 'GFERN'), 300)
  const res = await request(app).get('/api/assets/s-sizzle').set('X-Payment', 'late').set('X-Quote-Id', q.quoteId)
  expect(res.status).toBe(200)
})

test('still not_found after the wait', async () => {
  const { app } = setup(100)
  const { body: q } = await request(app).get('/api/assets/s-sizzle')
  const res = await request(app).get('/api/assets/s-sizzle').set('X-Payment', 'never').set('X-Quote-Id', q.quoteId)
  expect(res.body).toEqual({ reason: 'not_found' })
})
