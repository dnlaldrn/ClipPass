import type { Quote402 } from '@tollbooth/shared'

export type PaidFetchResult =
  | { status: 'free' | 'paid'; data: unknown; hash?: string }
  | { status: 'declined' }
  | { status: 'rejected'; reason: string; hash?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * x402-style fetch: request, get a 402 quote, let `pay` decide and pay (returns a tx hash or null),
 * then retry with X-Payment. Retries the proof only while the server has not indexed the payment yet.
 */
export async function paidFetch(
  url: string,
  pay: (q: Quote402) => Promise<string | null>,
  o: { fetch?: typeof fetch; retries?: number; delayMs?: number } = {},
): Promise<PaidFetchResult> {
  const f = o.fetch ?? fetch
  const retries = o.retries ?? 3
  const delayMs = o.delayMs ?? 2000

  const first = await f(url)
  if (first.ok) return { status: 'free', data: await first.json() }
  if (first.status !== 402) return { status: 'rejected', reason: `http_${first.status}` }

  const quote = (await first.json()) as Quote402
  const hash = await pay(quote)
  if (!hash) return { status: 'declined' }

  let reason = 'not_found'
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await f(url, { headers: { 'X-Payment': hash, 'X-Quote-Id': quote.quoteId } })
    if (res.ok) return { status: 'paid', data: await res.json(), hash }
    reason = res.status === 402 ? (((await res.json()) as { reason?: string }).reason ?? 'unknown') : `http_${res.status}`
    if (reason !== 'not_found') break
    if (attempt < retries) await sleep(delayMs)
  }
  return { status: 'rejected', reason, hash }
}
