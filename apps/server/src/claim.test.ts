import request from 'supertest'
import { NoirContractError, type NoirSigner } from '@noirx402/agent-sdk'
import { ARTISTS, type ArtistId } from '@clippass/shared'
import { createApp } from './app'
import { claimRouter } from './claim'

const IDS = Object.keys(ARTISTS) as ArtistId[]

function setup(pending: Record<ArtistId, bigint>, fail?: { id: ArtistId; error: Error }) {
  const claimed: string[] = []
  const artists = Object.fromEntries(IDS.map((id) => [id, { publicKey: `G-${id}`, signTransaction: async () => '' }])) as unknown as Record<ArtistId, NoirSigner>
  const noir = {
    getEscrowBalance: async () => 180_000_000n,
    getPendingBalance: async (pk: string) => pending[pk.slice(2) as ArtistId],
    claim: async ({ merchant }: { merchant: NoirSigner }) => {
      const id = merchant.publicKey.slice(2) as ArtistId
      if (fail?.id === id) throw fail.error
      claimed.push(id)
      return { hash: `c-${id}` }
    },
  }
  const app = createApp({ webOrigin: '*', routers: [claimRouter({ noir: noir as any, artists, deviceHash: 'ab'.repeat(32) })] })
  return { app, claimed }
}

test('pays out every artist with earnings and skips NothingToClaim', async () => {
  const { app, claimed } = setup(
    { lowtide: 1_800_000n, lantern: 2_200_000n, kestrel: 0n, fern: 1_200_000n },
    { id: 'fern', error: new NoirContractError('paymentEscrow', 9, 'NothingToClaim', 'claim') },
  )
  const res = await request(app).post('/api/claim')
  expect(res.status).toBe(200)
  expect(res.body.claims).toEqual([
    { artist: 'lowtide', name: 'Lowtide Loops', amount: '1800000', hash: 'c-lowtide' },
    { artist: 'lantern', name: 'Paper Lantern Films', amount: '2200000', hash: 'c-lantern' },
  ])
  expect(claimed).toEqual(['lowtide', 'lantern']) // kestrel never called: pending 0
})

test('409 when no artist has anything to claim', async () => {
  const { app } = setup({ lowtide: 0n, lantern: 0n, kestrel: 0n, fern: 0n })
  const res = await request(app).post('/api/claim')
  expect(res.status).toBe(409)
  expect(res.body).toEqual({ reason: 'NothingToClaim' })
})

test('other claim errors propagate', async () => {
  const { app } = setup({ lowtide: 1n, lantern: 0n, kestrel: 0n, fern: 0n }, { id: 'lowtide', error: new Error('rpc down') })
  expect((await request(app).post('/api/claim')).status).toBe(500)
})

test('balances list escrow and each artist', async () => {
  const { app } = setup({ lowtide: 1_800_000n, lantern: 0n, kestrel: 0n, fern: 700_000n })
  const res = await request(app).get('/api/balances')
  expect(res.body.escrow).toBe('180000000')
  expect(res.body.artists).toEqual([
    { id: 'lowtide', name: 'Lowtide Loops', address: 'G-lowtide', pending: '1800000' },
    { id: 'lantern', name: 'Paper Lantern Films', address: 'G-lantern', pending: '0' },
    { id: 'kestrel', name: 'Kestrel Studio', address: 'G-kestrel', pending: '0' },
    { id: 'fern', name: 'Foley Fern', address: 'G-fern', pending: '700000' },
  ])
})
