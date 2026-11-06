import type { AddressInfo } from 'node:net'
import type { NoirSigner } from '@noirx402/agent-sdk'
import { DEMO_SCRIPT, NOIR_TESTNET_CONTRACTS, POLICY_MAX } from '@clippass/shared'
import type { NoirPort } from '@clippass/agent'
import { createApp } from './app'
import { JobStore } from './jobs'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'
import { runJob, createJobQueue } from './runner'
import { ActivityLog } from './activity'

const PAYEES = { lowtide: 'GLOW', lantern: 'GLAN', kestrel: 'GKES', fern: 'GFERN' }
const DEVICE = 'ab'.repeat(32)
const agent: NoirSigner = { publicKey: 'GAGENT', signTransaction: async () => '' }

async function setup(noirOverride?: Partial<NoirPort>) {
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, deviceHash: DEVICE })
  const activity = new ActivityLog()
  const server = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, payees: PAYEES })] }).listen(0)
  await new Promise((r) => server.once('listening', r))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  let n = 0
  const noir: NoirPort = {
    checkPayment: async (p) => (p.amount > POLICY_MAX ? { ok: false, reason: 'over_limit' } : { ok: true }),
    authorizePayment: async (p) => {
      const hash = `tx${++n}`
      // stands in for noir.watch delivering the on-chain event
      verifier.recordEvent({ txHash: hash, contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow, merchant: p.merchant, deviceHash: p.deviceHash, amount: p.amount })
      activity.recordPayment({
        id: `e-${hash}`, type: 'payment.authorized', txHash: hash, contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow,
        merchant: p.merchant, deviceHash: p.deviceHash, amount: p.amount, ledger: n, ledgerClosedAt: new Date().toISOString(),
      }, PAYEES)
      return { hash, nonce: 0n }
    },
    ...noirOverride,
  }
  const jobs = new JobStore()
  jobs.create({ jobId: 'j1', script: DEMO_SCRIPT, mood: 'chill', budget: 25_000_000n, paymentIntentId: 'pi', checkoutUrl: 'c' })
  jobs.markPaid('j1')
  return { jobs, noir, baseUrl, activity, close: () => server.close() }
}

test('runJob records refusals and enriches paid activity as licenses arrive', async () => {
  const s = await setup()
  try {
    await runJob('j1', { ...s, agent, deviceHash: DEVICE, delayMs: 0 })
    const items = s.activity.list()
    const paid = items.filter((item) => item.kind === 'paid')
    expect(paid).toHaveLength(6)
    for (const license of s.jobs.get('j1')!.licenses) {
      expect(paid.find((item) => item.id === license.hash)).toMatchObject({
        title: license.title, artist: license.artist, address: license.artistAddress, amount: license.price, hash: license.hash,
      })
    }
    expect(items.filter((item) => item.kind === 'refused')).toEqual([expect.objectContaining({
      id: expect.stringMatching(/^j1:refused:/), title: 'Neon Crown (exclusive rights)',
      amount: '20000000', reason: 'over_limit', artist: 'Kestrel Studio',
    })])
    expect(items.find((item) => item.kind === 'refused')!.hash).toBeUndefined()
  } finally { s.close() }
})

test('runJob marks done and stores trace', async () => {
  const s = await setup()
  await runJob('j1', { jobs: s.jobs, noir: s.noir, agent, deviceHash: DEVICE, baseUrl: s.baseUrl, delayMs: 0 })
  s.close()
  const job = s.jobs.get('j1')!
  expect(job.status).toBe('done')
  expect(job.licenses.map((l) => l.assetId)).toEqual(['m-lofi', 'b-market', 'b-food', 'b-glass', 's-sizzle', 's-crowd'])
  expect(job.trace.find((d) => d.assetId === 'x-crown')!.action).toBe('refused')
  expect(job.summary).toMatch(/^Licensed 6 assets from 4 artists/)
})

test('licenses show up as they are paid and survive a crash mid-reel', async () => {
  const s = await setup()
  const authorize = s.noir.authorizePayment
  let calls = 0
  s.noir.authorizePayment = async (p) => {
    if (++calls === 3) throw new Error('rpc timeout') // not a NoirContractError: aborts the reel
    return authorize(p)
  }
  await runJob('j1', { jobs: s.jobs, noir: s.noir, agent, deviceHash: DEVICE, baseUrl: s.baseUrl, delayMs: 0 })
  s.close()
  const job = s.jobs.get('j1')!
  expect(job.status).toBe('failed')
  expect(job.licenses.map((l) => l.assetId)).toEqual(['m-lofi', 'b-market']) // the two paid before the crash
})

test('runJob marks failed on crash', async () => {
  const s = await setup({ checkPayment: async () => { throw new Error('rpc down') } })
  await expect(runJob('j1', { jobs: s.jobs, noir: s.noir, agent, deviceHash: DEVICE, baseUrl: s.baseUrl, delayMs: 0 })).resolves.toBeUndefined()
  s.close()
  const job = s.jobs.get('j1')!
  expect(job.status).toBe('failed')
  expect(job.trace.at(-1)!.reason).toMatch(/rpc down/)
})

test('queued jobs never pay concurrently (one agent key = one sequence number)', async () => {
  const s = await setup()
  s.jobs.create({ jobId: 'j2', script: DEMO_SCRIPT, mood: 'chill', budget: 25_000_000n, paymentIntentId: 'pi2', checkoutUrl: 'c' })
  s.jobs.markPaid('j2')
  let inFlight = 0
  const authorize = s.noir.authorizePayment
  s.noir.authorizePayment = async (p) => {
    if (++inFlight > 1) throw new Error('tx_bad_seq')
    await new Promise((r) => setTimeout(r, 20))
    try { return await authorize(p) } finally { inFlight-- }
  }
  const enqueue = createJobQueue((id) => runJob(id, { jobs: s.jobs, noir: s.noir, agent, deviceHash: DEVICE, baseUrl: s.baseUrl, delayMs: 0 }))
  await Promise.all([enqueue('j1'), enqueue('j2')])
  s.close()
  expect(s.jobs.get('j1')!.status).toBe('done')
  expect(s.jobs.get('j2')!.status).toBe('done')
})
