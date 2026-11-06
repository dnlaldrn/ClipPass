import request from 'supertest'
import { ARTISTS, ASSETS, POLICY_MAX, type Catalog } from '@clippass/shared'
import { createApp } from './app'
import { catalogRouter } from './catalog'

test('catalog exposes every real asset, its artist account and stroop price', async () => {
  const payees = { lowtide: 'GLOW', lantern: 'GLAN', kestrel: 'GKES', fern: 'GFERN' }
  const app = createApp({ webOrigin: '*', routers: [catalogRouter({ payees })] })
  const res = await request(app).get('/api/catalog')
  expect(res.status).toBe(200)
  const catalog: Catalog = res.body
  expect(catalog.cardLimit).toBe(POLICY_MAX.toString())
  expect(catalog.assets).toHaveLength(ASSETS.length)
  for (const asset of ASSETS) {
    expect(catalog.assets.find((a) => a.id === asset.id)).toEqual({
      id: asset.id, type: asset.type, title: asset.title, artistId: asset.artist,
      artist: ARTISTS[asset.artist].name, address: payees[asset.artist], price: asset.price.toString(), tags: asset.tags,
    })
  }
})
