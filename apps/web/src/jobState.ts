import type { JobView } from '@clippass/shared'

/** Consecutive failed polls before polling stops and the page offers Retry. */
export const MAX_FAILED_POLLS = 3

const TERMINAL_VELO = new Set(['failed', 'expired', 'cancelled'])

export const isTerminalVelo = (status: string | null) => status !== null && TERMINAL_VELO.has(status)

/** The server stops refreshing `veloStatus` once a job is paid, so only an unpaid job can end this way. */
export const checkoutEnded = (job: JobView) => job.status === 'awaiting_payment' && isTerminalVelo(job.veloStatus)

export const pollingEnded = (job: JobView) => job.status === 'done' || job.status === 'failed' || checkoutEnded(job)

/** Polling stops at the limit. With nothing on screen yet, the first failure already shows Retry. */
export const showServerDown = (failures: number, hasJob: boolean) =>
  failures >= MAX_FAILED_POLLS || (!hasJob && failures > 0)
