import { NOIR_TESTNET_CONTRACTS } from '@clippass/shared'
import { QuoteStore } from './quotes'
import { createVerifier, type PaymentEvent } from './verifier'

const PAYEE = 'GFERN'
const DEVICE = 'ab'.repeat(32)

function setup() {
  let t = 0
  const quotes = new QuoteStore(() => t)
  const v = createVerifier({ quotes, deviceHash: DEVICE, now: () => t })
  const q = quotes.issue('s-sizzle', 1_000_000n, PAYEE)
  const ev = (over: Partial<PaymentEvent> = {}): PaymentEvent => ({
    txHash: 'h1', contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow, merchant: PAYEE,
    deviceHash: DEVICE, amount: 1_000_000n, ...over,
  })
  return { quotes, v, q, ev, tick: (ms: number) => { t += ms } }
}

test('valid proof is accepted and consumes the quote', () => {
  const { v, q, ev, quotes } = setup()
  v.recordEvent(ev())
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: true })
  expect(quotes.get(q.quoteId)!.consumed).toBe(true)
})

test('second use of the same quote is consumed_quote', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev()); v.recordEvent(ev({ txHash: 'h2' }))
  v.verify('h1', q.quoteId, 's-sizzle')
  expect(v.verify('h2', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'consumed_quote' })
})

test('same hash on a new quote is reused', () => {
  const { v, q, ev, quotes } = setup()
  v.recordEvent(ev())
  v.verify('h1', q.quoteId, 's-sizzle')
  const q2 = quotes.issue('s-sizzle', 1_000_000n, PAYEE)
  expect(v.verify('h1', q2.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'reused' })
})

test('paid a different artist than the quote names is wrong_merchant', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev({ merchant: 'GOTHERARTIST' }))
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'wrong_merchant' })
})

test('low amount', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev({ amount: 999_999n }))
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'low_amount' })
})

test('expired quote', () => {
  const { v, q, ev, tick } = setup()
  v.recordEvent(ev())
  tick(120_001)
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'expired_quote' })
})

test('not yet indexed is not_found and keeps the quote open', () => {
  const { v, q, ev, quotes } = setup()
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'not_found' })
  expect(quotes.get(q.quoteId)!.consumed).toBe(false)
  v.recordEvent(ev())
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: true })
})

test('wrong device (compared case-insensitively)', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev({ deviceHash: 'cd'.repeat(32) }))
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'wrong_device' })
  v.recordEvent(ev({ txHash: 'h3', deviceHash: DEVICE.toUpperCase() }))
  expect(v.verify('h3', q.quoteId, 's-sizzle')).toEqual({ ok: true })
})

test('wrong contract', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev({ contractId: 'CFAKE' }))
  expect(v.verify('h1', q.quoteId, 's-sizzle')).toEqual({ ok: false, reason: 'wrong_contract' })
})

test('quote for another asset is unknown_quote', () => {
  const { v, q, ev } = setup()
  v.recordEvent(ev())
  expect(v.verify('h1', q.quoteId, 's-crowd')).toEqual({ ok: false, reason: 'unknown_quote' })
  expect(v.verify('h1', 'nope', 's-sizzle')).toEqual({ ok: false, reason: 'unknown_quote' })
})
