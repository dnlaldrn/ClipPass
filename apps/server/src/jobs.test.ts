import { JobStore } from './jobs'

const job = (s: JobStore) =>
  s.create({ jobId: 'j1', script: 's', mood: 'chill', budget: 15_000_000n, paymentIntentId: 'pi_1', checkoutUrl: 'https://c' })

test('markPaid is a one-shot transition', () => {
  const s = new JobStore()
  job(s)
  expect(s.markPaid('j1')).toBe(true)
  expect(s.markPaid('j1')).toBe(false)
  expect(s.get('j1')!.status).toBe('paid')
})

test('view serialises budget as stroop string and finds by payment intent', () => {
  const s = new JobStore()
  job(s)
  expect(s.view('j1')!.budget).toBe('15000000')
  expect(s.view('j1')).toMatchObject({ script: 's', mood: 'chill', licenses: [] })
  expect(s.byPaymentIntent('pi_1')!.jobId).toBe('j1')
  expect(s.view('nope')).toBeUndefined()
})
