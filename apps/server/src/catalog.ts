import { Router } from 'express'
import { ARTISTS, ASSETS, POLICY_MAX, type ArtistId, type Catalog } from '@clippass/shared'

export function catalogRouter(d: { payees: Record<ArtistId, string> }): Router {
  const r = Router()
  r.get('/api/catalog', (_req, res) => {
    const catalog: Catalog = {
      cardLimit: POLICY_MAX.toString(),
      assets: ASSETS.map((a) => ({
        id: a.id, type: a.type, title: a.title, artistId: a.artist,
        artist: ARTISTS[a.artist].name, address: d.payees[a.artist], price: a.price.toString(), tags: [...a.tags],
      })),
    }
    res.json(catalog)
  })
  return r
}
