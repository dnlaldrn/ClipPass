import request from 'supertest'
import { NOIR_TESTNET_CONTRACTS, XLM_SAC } from '@tollbooth/shared'
import { createApp } from './app'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'

const MERCHANT = 'GMERCHANT'
const DEVICE = 'ab'.repeat(32)

function setup() {
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, merchant: MERCHANT, deviceHash: DEVICE })
  const app = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, merchant: MERCHANT })] })
  const pay = (txHash: string, amount: bigint, merchant = MERCHANT) =>
    verifier.recordEvent({ txHash, contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow, merchant, deviceHash: DEVICE, amount })
  return { app, pay }
}

test('no proof returns 402 quote', async () => {
  const { app } = setup()
  const res = await request(app).get('/api/data/quote')
  expect(res.status).toBe(402)
  expect(res.body).toMatchObject({ price: '1000000', asset: XLM_SAC, merchant: MERCHANT, network: 'testnet' })
  expect(res.body.quoteId).toMatch(/^[0-9a-f-]{36}$/)
  expect(Date.parse(res.body.expiresAt)).toBeGreaterThan(Date.now())
})

test('valid proof returns data', async () => {
  const { app, pay } = setup()
  const { body: q } = await request(app).get('/api/data/quote')
  pay('h1', 1_000_000n)
  const res = await request(app).get('/api/data/quote').set('X-Payment', 'h1').set('X-Quote-Id', q.quoteId)
  expect(res.status).toBe(200)
  expect(res.body.endpoint).toBe('quote')
  expect(res.body.data).toBeTruthy()
})

test('bad proof returns 402 with reason', async () => {
  const { app, pay } = setup()
  const { body: q } = await request(app).get('/api/data/quote')
  pay('h1', 1_000_000n, 'GOTHER')
  const res = await request(app).get('/api/data/quote').set('X-Payment', 'h1').set('X-Quote-Id', q.quoteId)
  expect(res.status).toBe(402)
  expect(res.body).toEqual({ reason: 'wrong_merchant' })
})

test('unknown endpoint is 404', async () => {
  const { app } = setup()
  expect((await request(app).get('/api/data/nope')).status).toBe(404)
})

test('report quote is 20000000', async () => {
  const { app } = setup()
  expect((await request(app).get('/api/data/report')).body.price).toBe('20000000')
})
