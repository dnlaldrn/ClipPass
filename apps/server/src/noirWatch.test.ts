import type { NoirAgentClient, NoirEvent } from '@noirx402/agent-sdk'
import { NOIR_TESTNET_CONTRACTS } from '@clippass/shared'
import { backfillPayments, startPaymentWatch } from './noirWatch'
import { createVerifier } from './verifier'
import { QuoteStore } from './quotes'
import type { AuthorizedPayment } from './activity'

const DEVICE = 'ab'.repeat(32)
const cursor = (ledger: number) => (BigInt(ledger) << 32n).toString()
const event = (hash: string, deviceHash = DEVICE): AuthorizedPayment => ({
  id: `event-${hash}`, txHash: hash, type: 'payment.authorized', contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow,
  ledger: 4500, ledgerClosedAt: '2026-11-06T00:00:00.000Z', deviceHash, merchant: 'GLOW', amount: 1_800_000n,
})
const page = (events: NoirEvent[], ledger = 5000) => ({ events, cursor: cursor(ledger), latestLedger: 5000 })

test('backfill paginates recent SDK events and filters by device and payment type', async () => {
  const getEvents = vi.fn<NoirAgentClient['getEvents']>()
    .mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce(page([
      event('old', DEVICE.toUpperCase()), event('foreign', 'cd'.repeat(32)),
      { ...event('claim'), type: 'payment.claimed' },
    ], 4500))
    .mockResolvedValueOnce(page([event('new')]))
  const received: AuthorizedPayment[] = []
  await backfillPayments({ getEvents }, DEVICE, (payment) => received.push(payment))
  expect(received.map((e) => e.txHash)).toEqual(['old', 'new'])
  expect(getEvents.mock.calls).toEqual([
    [{ limit: 100 }], [{ startLedger: 1, limit: 100 }], [{ cursor: cursor(4500), limit: 100 }],
  ])
})

test('backfill failures log and resolve without losing events already received', async () => {
  const getEvents = vi.fn<NoirAgentClient['getEvents']>()
    .mockResolvedValueOnce(page([event('latest')]))
    .mockRejectedValueOnce(new Error('rpc unavailable'))
  const received = vi.fn()
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(backfillPayments({ getEvents }, DEVICE, received)).resolves.toBeUndefined()
    expect(received).toHaveBeenCalledExactlyOnceWith(event('latest'))
    expect(quiet).toHaveBeenCalledWith('noir activity backfill failed', expect.any(Error))
  } finally { quiet.mockRestore() }
})

test('live watch feeds verifier and callback immediately while backfill is pending or fails', async () => {
  const stop = vi.fn()
  let reject!: (error: Error) => void
  const pending = new Promise<never>((_resolve, no) => { reject = no })
  const watch = vi.fn<NoirAgentClient['watch']>().mockReturnValue(stop)
  const getEvents = vi.fn<NoirAgentClient['getEvents']>().mockReturnValue(pending)
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, deviceHash: DEVICE })
  const received = vi.fn()
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  try {
    expect(startPaymentWatch({ watch, getEvents }, verifier, DEVICE, received)).toBe(stop)
    expect(watch).toHaveBeenCalledWith(expect.objectContaining({ types: ['payment.authorized'], deviceHash: DEVICE, pollMs: 1000 }))
    const onEvent = watch.mock.calls[0][0].onEvent
    await onEvent(event('foreign', 'cd'.repeat(32)))
    expect(received).not.toHaveBeenCalled()
    const q = quotes.issue('m-lofi', 1_800_000n, 'GLOW')
    await onEvent(event('live'))
    expect(verifier.verify('live', q.quoteId, 'm-lofi')).toEqual({ ok: true })
    expect(received).toHaveBeenCalledExactlyOnceWith(event('live'))
    reject(new Error('backfill offline'))
    await vi.waitFor(() => expect(quiet).toHaveBeenCalledWith('noir activity backfill failed', expect.any(Error)))
    await onEvent(event('after-failure'))
    expect(received).toHaveBeenCalledTimes(2)
    expect(stop).not.toHaveBeenCalled()
  } finally { quiet.mockRestore(); log.mockRestore() }
})

test('backfilled payments reach activity but never the verifier, so old hashes cannot be replayed', async () => {
  const watch = vi.fn<NoirAgentClient['watch']>().mockReturnValue(vi.fn())
  const getEvents = vi.fn<NoirAgentClient['getEvents']>().mockResolvedValue(page([event('old')]))
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, deviceHash: DEVICE })
  const received = vi.fn()
  startPaymentWatch({ watch, getEvents }, verifier, DEVICE, received)
  await vi.waitFor(() => expect(received).toHaveBeenCalled())
  const q = quotes.issue('m-lofi', 1_800_000n, 'GLOW')
  expect(verifier.verify('old', q.quoteId, 'm-lofi')).toEqual({ ok: false, reason: 'not_found' })
})
