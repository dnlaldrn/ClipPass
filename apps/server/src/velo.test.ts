import request from 'supertest'
import { VeloAuthError, VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk'
import { DEMO_SCRIPT } from '@clippass/shared'
import { createApp } from './app'
import { JobStore } from './jobs'
import { veloRouter, type VeloLike } from './velo'

const WEB = 'https://web.example'

function setup(status = 'pending', canStart?: () => Promise<boolean>) {
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
    routers: [veloRouter({ velo, jobs, webOrigin: WEB, secret: 's', verify: verify as any, onPaid: (id) => paid.push(id), canStart })],
  })
  return { app, jobs, creates, paid }
}

const succeeded = (piId: string, id = 'evt_1') =>
  JSON.stringify({ version: '1', id, type: 'payment.succeeded', paymentIntent: { id: piId, status: 'paid' } })

async function newJob(app: any) {
  const res = await request(app).post('/api/jobs').send({ script: DEMO_SCRIPT, mood: 'chill', budget: '2.5' })
  return res
}

test('POST /api/jobs creates a session', async () => {
  const { app, creates } = setup()
  const res = await newJob(app)
  expect(res.status).toBe(200)
  expect(res.body.checkoutUrl).toBe('https://pay/1')
  const { p, o } = creates[0]
  expect(p).toMatchObject({
    amount: '1.00', asset: 'native', description: `ClipPass reel project: ${DEMO_SCRIPT}`,
    successUrl: `${WEB}/jobs/${res.body.jobId}`, cancelUrl: `${WEB}/`,
  })
  expect(o).toEqual({ idempotencyKey: `job:${res.body.jobId}` })
})

test('low escrow returns 503 without opening checkout', async () => {
  const canStart = vi.fn(async () => false)
  const { app, creates } = setup('pending', canStart)
  const res = await newJob(app)
  expect(res.status).toBe(503)
  expect(res.body).toEqual({ error: 'The card is out of funds right now, so no checkout opened. You were not charged.' })
  expect(canStart).toHaveBeenCalledTimes(1)
  expect(creates).toEqual([])
})

test('escrow read failure returns 503 without opening checkout', async () => {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const { app, creates } = setup('pending', async () => { throw new Error('rpc detail') })
    const res = await newJob(app)
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ error: 'Stellar Testnet is not responding, so no checkout opened. You were not charged.' })
    expect(creates).toEqual([])
  } finally { quiet.mockRestore() }
})

test('escrow check runs after validation and allows funded checkout', async () => {
  const canStart = vi.fn(async () => true)
  const { app, creates } = setup('pending', canStart)
  expect((await request(app).post('/api/jobs').send({ script: '', mood: 'chill', budget: '2.5' })).status).toBe(400)
  expect(canStart).not.toHaveBeenCalled()
  expect((await newJob(app)).status).toBe(200)
  expect(canStart).toHaveBeenCalledTimes(1)
  expect(creates).toHaveLength(1)
})

test('a failed Velo checkout is a plain 502, never Velo’s status or a stack trace', async () => {
  const failing = (error: Error) => {
    const velo: VeloLike = {
      checkout: { sessions: { create: async () => { throw error } } },
      paymentIntents: { retrieve: async () => ({ status: 'pending' }) },
    }
    const jobs = new JobStore()
    const app = createApp({ webOrigin: WEB, routers: [veloRouter({ velo, jobs, webOrigin: WEB, secret: 's', onPaid: () => {} })] })
    return newJob(app)
  }
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})

  const auth = await failing(new VeloAuthError('Missing or invalid API key.', { status: 401 }))
  expect(auth.status).toBe(502)
  expect(auth.body.error).toMatch(/API key/)
  expect(auth.body.error).toMatch(/not charged/)

  const other = await failing(new Error('secret internal detail'))
  expect(other.status).toBe(502)
  expect(other.body.error).toMatch(/not charged/)
  expect(JSON.stringify(other.body)).not.toContain('secret internal detail')
  quiet.mockRestore()
})

test('rejects bad budget', async () => {
  const { app, creates } = setup()
  for (const budget of ['abc', '-1', '0', '1.5', '1.123456789', '50']) {
    const res = await request(app).post('/api/jobs').send({ script: DEMO_SCRIPT, mood: 'chill', budget })
    expect(res.status, budget).toBe(400)
  }
  expect(creates).toHaveLength(0)
})

test('rejects bad script or mood', async () => {
  const { app, creates } = setup()
  const post = (body: object) => request(app).post('/api/jobs').send({ script: DEMO_SCRIPT, mood: 'chill', budget: '2.5', ...body })
  for (const script of ['', '   ', 'x'.repeat(501), 42]) expect((await post({ script })).status, String(script)).toBe(400)
  for (const mood of ['Chill', 'sad', undefined]) expect((await post({ mood })).status, String(mood)).toBe(400)
  expect(creates).toHaveLength(0)
  expect((await post({ script: 'x'.repeat(500) })).status).toBe(200)
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
