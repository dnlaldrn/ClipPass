import type { JobStatus, JobView } from '@clippass/shared'
import { checkoutEnded, isTerminalVelo, MAX_FAILED_POLLS, pollingEnded, showServerDown } from './jobState'

const job = (status: JobStatus, veloStatus: string | null) => ({ status, veloStatus }) as JobView

test('failed, expired and cancelled are the terminal Velo statuses', () => {
  for (const s of ['failed', 'expired', 'cancelled']) expect(isTerminalVelo(s)).toBe(true)
  for (const s of ['awaiting_route', 'created', 'pending', 'paid', null]) expect(isTerminalVelo(s)).toBe(false)
})

test('polling ends on a finished reel or a dead checkout, and not before', () => {
  for (const s of ['failed', 'expired', 'cancelled']) expect(pollingEnded(job('awaiting_payment', s))).toBe(true)
  expect(pollingEnded(job('done', 'paid'))).toBe(true)
  expect(pollingEnded(job('failed', null))).toBe(true)
  expect(pollingEnded(job('awaiting_payment', 'pending'))).toBe(false)
  expect(pollingEnded(job('awaiting_payment', null))).toBe(false)
  expect(pollingEnded(job('paid', 'paid'))).toBe(false)
  expect(pollingEnded(job('running', 'paid'))).toBe(false)
})

test('a paid reel is never treated as an ended checkout', () => {
  expect(checkoutEnded(job('running', 'failed'))).toBe(false)
})

test('Retry shows from the first failure on an empty page, and at the limit once a reel is showing', () => {
  expect(MAX_FAILED_POLLS).toBe(3)
  expect(showServerDown(0, false)).toBe(false)
  expect(showServerDown(1, false)).toBe(true)
  expect(showServerDown(2, true)).toBe(false)
  expect(showServerDown(3, true)).toBe(true)
})
