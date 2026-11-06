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
  return { app, claimed, noir, pending }
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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('cold concurrent balance requests share one read and cache for 10 seconds', async () => {
  const { app, noir } = setup({ lowtide: 1n, lantern: 0n, kestrel: 0n, fern: 0n })
  const gate = deferred<bigint>()
  const started = deferred<void>()
  const read = vi.spyOn(noir, 'getEscrowBalance').mockImplementationOnce(() => { started.resolve(); return gate.promise })
  const pending = vi.spyOn(noir, 'getPendingBalance')
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  try {
    const first = request(app).get('/api/balances').then((res) => res)
    const second = request(app).get('/api/balances').then((res) => res)
    await started.promise
    gate.resolve(123n)
    const [a, b] = await Promise.all([first, second])
    expect(a.body).toEqual(b.body)
    expect(a.body.escrow).toBe('123')
    expect(read).toHaveBeenCalledTimes(1)
    expect(pending).toHaveBeenCalledTimes(4)
    now.mockReturnValue(10_999)
    expect((await request(app).get('/api/balances')).body).toEqual(a.body)
    expect(read).toHaveBeenCalledTimes(1)
  } finally { now.mockRestore() }
})

test('stale balances return immediately during one refresh and survive refresh failure', async () => {
  const { app, noir } = setup({ lowtide: 1n, lantern: 0n, kestrel: 0n, fern: 0n })
  const read = vi.spyOn(noir, 'getEscrowBalance')
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const initial = await request(app).get('/api/balances')
    now.mockReturnValue(11_000)
    const gate = deferred<bigint>()
    read.mockImplementationOnce(() => gate.promise)
    // These responses must finish before the slow refresh is released.
    expect((await request(app).get('/api/balances')).body).toEqual(initial.body)
    expect((await request(app).get('/api/balances')).body).toEqual(initial.body)
    expect(read).toHaveBeenCalledTimes(2)
    gate.reject(new Error('rpc down'))
    await vi.waitFor(() => expect(quiet).toHaveBeenCalledWith('balance refresh failed', expect.any(Error)))
    const recovery = deferred<bigint>()
    read.mockImplementationOnce(() => recovery.promise)
    expect((await request(app).get('/api/balances')).body).toEqual(initial.body)
    recovery.resolve(99n)
    await vi.waitFor(async () => expect((await request(app).get('/api/balances')).body.escrow).toBe('99'))
    expect(read).toHaveBeenCalledTimes(3)
  } finally { now.mockRestore(); quiet.mockRestore() }
})

test('a cold balance failure reaches JSON middleware and can be retried', async () => {
  const { app, noir } = setup({ lowtide: 0n, lantern: 0n, kestrel: 0n, fern: 0n })
  vi.spyOn(noir, 'getEscrowBalance').mockRejectedValueOnce(new Error('rpc detail'))
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const failed = await request(app).get('/api/balances')
    expect(failed.status).toBe(500)
    expect(failed.body).toEqual({ error: 'Something went wrong on the server. Try again.' })
    expect((await request(app).get('/api/balances')).status).toBe(200)
  } finally { quiet.mockRestore() }
})

test('a claim invalidates balances and an older refresh cannot repopulate the cache', async () => {
  const { app, noir, pending } = setup({ lowtide: 5n, lantern: 0n, kestrel: 0n, fern: 0n })
  const read = vi.spyOn(noir, 'getEscrowBalance')
  const claim = noir.claim
  vi.spyOn(noir, 'claim').mockImplementation(async (p) => {
    const result = await claim(p)
    pending.lowtide = 0n
    return result
  })
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
  try {
    await request(app).get('/api/balances')
    now.mockReturnValue(11_000)
    const old = deferred<bigint>()
    read.mockImplementationOnce(() => old.promise)
    expect((await request(app).get('/api/balances')).body.artists[0].pending).toBe('5')
    expect((await request(app).post('/api/claim')).status).toBe(200)
    const fresh = await request(app).get('/api/balances')
    expect(fresh.body.artists[0].pending).toBe('0')
    old.resolve(1n)
    await new Promise((resolve) => setImmediate(resolve))
    expect((await request(app).get('/api/balances')).body).toEqual(fresh.body)
    expect(read).toHaveBeenCalledTimes(3)
  } finally { now.mockRestore() }
})

test('a successful claim still invalidates cache if a later artist claim fails', async () => {
  const { app, noir, pending } = setup(
    { lowtide: 5n, lantern: 2n, kestrel: 0n, fern: 0n },
    { id: 'lantern', error: new Error('rpc down') },
  )
  const claim = noir.claim
  vi.spyOn(noir, 'claim').mockImplementation(async (p) => {
    const result = await claim(p)
    pending.lowtide = 0n
    return result
  })
  const read = vi.spyOn(noir, 'getEscrowBalance')
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await request(app).get('/api/balances')
    expect((await request(app).post('/api/claim')).status).toBe(500)
    expect((await request(app).get('/api/balances')).body.artists[0].pending).toBe('0')
    expect(read).toHaveBeenCalledTimes(2)
  } finally { quiet.mockRestore() }
})

test('a new payment clears the balance cache so the next read is fresh', async () => {
  const pending = { lowtide: 0n, lantern: 0n, kestrel: 0n, fern: 0n }
  let clear = () => {}
  const noir = {
    getEscrowBalance: async () => 100n,
    getPendingBalance: async (g: string) => (g === 'G-fern' ? pending.fern : 0n),
  }
  const artists = Object.fromEntries(IDS.map((id) => [id, { publicKey: `G-${id}` }])) as any
  const router = claimRouter({ noir: noir as any, artists, deviceHash: 'ab'.repeat(32), exposeInvalidate: (fn) => { clear = fn } })
  const app = createApp({ webOrigin: '*', routers: [router] })
  await request(app).get('/api/balances')
  pending.fern = 500_000n
  clear()
  const res = await request(app).get('/api/balances')
  expect(res.body.artists.find((a: { id: string }) => a.id === 'fern').pending).toBe('500000')
})
