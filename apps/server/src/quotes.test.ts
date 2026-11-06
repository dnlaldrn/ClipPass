import { QuoteStore } from './quotes'

const PAYEE = 'GFERN'

test('issued quote expires after 2 minutes', () => {
  let t = 1_000_000
  const s = new QuoteStore(() => t)
  const q = s.issue('s-sizzle', 1_000_000n, PAYEE)
  t += 119_999
  expect(s.get(q.quoteId)!.expiresAt > t).toBe(true)
  t += 2
  expect(s.get(q.quoteId)!.expiresAt < t).toBe(true)
})

test('quote ids are unique and start unconsumed', () => {
  const s = new QuoteStore()
  const a = s.issue('s-sizzle', 1n, PAYEE), b = s.issue('s-sizzle', 1n, PAYEE)
  expect(a.quoteId).not.toBe(b.quoteId)
  expect(a.consumed).toBe(false)
})
