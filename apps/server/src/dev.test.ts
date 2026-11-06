import request from 'supertest'
import { devRouter, devRoutesEnabled } from './dev'
import { createApp } from './app'
import { JobStore } from './jobs'

test('dev routes are off unless DEV_ROUTES=1, even when NODE_ENV is unset', () => {
  expect(devRoutesEnabled({})).toBe(false)
  expect(devRoutesEnabled({ NODE_ENV: 'development' })).toBe(false)
  expect(devRoutesEnabled({ DEV_ROUTES: 'true' })).toBe(false)
  expect(devRoutesEnabled({ DEV_ROUTES: '1' })).toBe(true)
})

test('dev jobs use the funding guard before creating or starting a job', async () => {
  const jobs = new JobStore()
  const onPaid = vi.fn()
  const canStart = vi.fn(async () => false)
  const app = createApp({ webOrigin: '*', routers: [devRouter({ jobs, onPaid, canStart })] })
  expect((await request(app).post('/api/dev/jobs').send({ budget: 'no' })).status).toBe(400)
  expect(canStart).not.toHaveBeenCalled()
  const low = await request(app).post('/api/dev/jobs').send({})
  expect(low.status).toBe(503)
  expect(low.body.error).toBe('The card is out of funds right now, so no checkout opened. You were not charged.')
  expect(onPaid).not.toHaveBeenCalled()
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    canStart.mockRejectedValueOnce(new Error('rpc down'))
    const failed = await request(app).post('/api/dev/jobs').send({})
    expect(failed.status).toBe(503)
    expect(failed.body.error).toBe('Stellar Testnet is not responding, so no checkout opened. You were not charged.')
    expect(onPaid).not.toHaveBeenCalled()
  } finally { quiet.mockRestore() }
  canStart.mockResolvedValueOnce(true)
  const ok = await request(app).post('/api/dev/jobs').send({})
  expect(ok.status).toBe(200)
  expect(jobs.get(ok.body.jobId)).toMatchObject({ status: 'paid', mood: 'chill', budget: 25_000_000n })
  expect(onPaid).toHaveBeenCalledExactlyOnceWith(ok.body.jobId)
})
