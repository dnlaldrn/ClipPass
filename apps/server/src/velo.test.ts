import request from 'supertest'
import { VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk'
import { createApp } from './app'
import { JobStore } from './jobs'
import { veloRouter, type VeloLike } from './velo'

const WEB = 'https://web.example'

function setup(status = 'pending') {
  const jobs = new JobStore()
  const creates: { p: any; o: any }[] = []
  let n = 0
  const velo: VeloLike = {
    checkout: {
      sessions: {
        create: async (p, o) => {
          creates.push({ p, o })
          n++
          return { checkoutUrl: `https://pay/${n}`, paymentIntentId: `pi_${n}` }
        },
      },
    },
    paymentIntents: { retrieve: async () => ({ status }) },
  }
  const paid: string[] = []
  const verify = async ({ payload, signature }: { payload: string; signature: string | null }) => {
    if (signature === 'bad') throw new VeloWebhookSignatureVerificationError('bad signature')
    return JSON.parse(payload)
  }
  const app = createApp({
    webOrigin: WEB,
    routers: [veloRouter({ velo, jobs, webOrigin: WEB, secret: 's', verify: verify as any, onPaid: (id) => paid.push(id) })],
  })
  return { app, jobs, creates, paid }
}

const succeeded = (piId: string, id = 'evt_1') =>
  JSON.stringify({ version: '1', id, type: 'payment.succeeded', paymentIntent: { id: piId, status: 'paid' } })

async function newJob(app: any) {
  const res = await request(app).post('/api/jobs').send({ topic: 'stellar fees', budget: '2.5' })
  return res
}

test('POST /api/jobs creates a session', async () => {
  const { app, creates } = setup()
  const res = await newJob(app)
  expect(res.status).toBe(200)
  expect(res.body.checkoutUrl).toBe('https://pay/1')
  const { p, o } = creates[0]
  expect(p).toMatchObject({ amount: '1.00', asset: 'native', successUrl: `${WEB}/jobs/${res.body.jobId}`, cancelUrl: `${WEB}/` })
  expect(o).toEqual({ idempotencyKey: `job:${res.body.jobId}` })
})

test('rejects bad budget', async () => {
  const { app, creates } = setup()
  for (const budget of ['abc', '-1', '0', '1.5', '1.123456789', '50']) {
    const res = await request(app).post('/api/jobs').send({ topic: 't', budget })
    expect(res.status, budget).toBe(400)
  }
  expect((await request(app).post('/api/jobs').send({ topic: '', budget: '2' })).status).toBe(400)
  expect(creates).toHaveLength(0)
})

const hook = (app: any, body: string, sig = 'good', delivery = 'd1') =>
  request(app).post('/webhooks/velo').set('content-type', 'application/json')
    .set('x-velo-signature', sig).set('x-velo-delivery', delivery).send(body)

test('bad signature returns 400', async () => {
  const { app } = setup()
  expect((await hook(app, succeeded('pi_1'), 'bad')).status).toBe(400)
})

test('paid webhook calls onPaid once', async () => {
  const { app, paid } = setup()
  const { body } = await newJob(app)
  expect((await hook(app, succeeded('pi_1'))).status).toBe(200)
  expect(paid).toEqual([body.jobId])
})

test('duplicate delivery is ignored', async () => {
  const { app, paid, jobs } = setup()
  await newJob(app)
  await hook(app, succeeded('pi_1'), 'good', 'd1')
  jobs.get(paid[0])!.status = 'awaiting_payment' // prove the dedupe, not the status guard, stops it
  expect((await hook(app, succeeded('pi_1'), 'good', 'd1')).status).toBe(200)
  expect((await hook(app, succeeded('pi_1', 'evt_1'), 'good', 'd2')).status).toBe(200)
  expect(paid).toHaveLength(1)
})

test('unknown payment intent is acknowledged', async () => {
  const { app, paid } = setup()
  expect((await hook(app, succeeded('pi_404'))).status).toBe(200)
  expect(paid).toHaveLength(0)
})

test('GET job falls back to Velo status', async () => {
  const { app, paid } = setup('paid')
  const { body } = await newJob(app)
  const res = await request(app).get(`/api/jobs/${body.jobId}`)
  expect(res.status).toBe(200)
  expect(res.body.veloStatus).toBe('paid')
  await request(app).get(`/api/jobs/${body.jobId}`)
  expect(paid).toEqual([body.jobId])
})

test('unknown job is 404', async () => {
  const { app } = setup()
  expect((await request(app).get('/api/jobs/nope')).status).toBe(404)
})
