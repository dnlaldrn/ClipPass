import { Router } from 'express'
import { CATALOG, XLM_SAC, type EndpointName, type Quote402 } from '@clippass/shared'
import type { QuoteStore } from './quotes'
import type { Verifier } from './verifier'
import { mockData } from './mockData'

const isEndpoint = (s: string): s is EndpointName => Object.hasOwn(CATALOG, s)

/** The paid data API: 402 with a quote, then data once an X-Payment proof verifies. */
export function merchantRouter(d: { quotes: QuoteStore; verifier: Verifier; merchant: string; proofWaitMs?: number }): Router {
  const r = Router()
  // RPC can index an event a few seconds after the tx confirms; hold the request briefly rather than fail it.
  const proofWaitMs = d.proofWaitMs ?? 3000
  r.get('/api/data/:name', async (req, res) => {
    const name = req.params.name
    if (!isEndpoint(name)) return res.status(404).json({ error: 'unknown endpoint' })

    const proof = req.get('X-Payment')
    if (!proof) {
      const q = d.quotes.issue(name, CATALOG[name].price)
      const body: Quote402 = {
        quoteId: q.quoteId, price: q.price.toString(), asset: XLM_SAC, merchant: d.merchant,
        network: 'testnet', expiresAt: new Date(q.expiresAt).toISOString(),
      }
      return res.status(402).json(body)
    }

    const quoteId = req.get('X-Quote-Id') ?? ''
    const deadline = Date.now() + proofWaitMs
    let result = d.verifier.verify(proof, quoteId, name)
    while (!result.ok && result.reason === 'not_found' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250))
      result = d.verifier.verify(proof, quoteId, name)
    }
    if (!result.ok) return res.status(402).json({ reason: result.reason })
    res.json({ endpoint: name, data: mockData(name) })
  })
  return r
}
