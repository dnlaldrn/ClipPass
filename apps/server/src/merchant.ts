import { Router } from 'express'
import { ARTISTS, XLM_SAC, assetById, type ArtistId, type Quote402 } from '@clippass/shared'
import type { QuoteStore } from './quotes'
import type { Verifier } from './verifier'

/** The stock library: 402 with the asset's price payable to its artist, then a license once an X-Payment proof verifies. */
export function merchantRouter(d: { quotes: QuoteStore; verifier: Verifier; payees: Record<ArtistId, string>; proofWaitMs?: number }): Router {
  const r = Router()
  // RPC can index an event a few seconds after the tx confirms; hold the request briefly rather than fail it.
  const proofWaitMs = d.proofWaitMs ?? 3000
  r.get('/api/assets/:id', async (req, res) => {
    const asset = assetById(req.params.id)
    if (!asset) return res.status(404).json({ error: 'unknown asset' })

    const proof = req.get('X-Payment')
    if (!proof) {
      const q = d.quotes.issue(asset.id, asset.price, d.payees[asset.artist])
      const body: Quote402 = {
        quoteId: q.quoteId, price: q.price.toString(), asset: XLM_SAC, merchant: q.payee,
        network: 'testnet', expiresAt: new Date(q.expiresAt).toISOString(),
      }
      return res.status(402).json(body)
    }

    const quoteId = req.get('X-Quote-Id') ?? ''
    const deadline = Date.now() + proofWaitMs
    let result = d.verifier.verify(proof, quoteId, asset.id)
    while (!result.ok && result.reason === 'not_found' && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 250))
      result = d.verifier.verify(proof, quoteId, asset.id)
    }
    if (!result.ok) return res.status(402).json({ reason: result.reason })
    // Media is mocked by design; the license and its tx are the real part.
    res.json({
      assetId: asset.id, title: asset.title, artist: ARTISTS[asset.artist].name, licenseId: proof,
      download: `https://clippass.example/download/${asset.id}?tx=${proof}`, terms: 'single use in one reel',
    })
  })
  return r
}
