import type { AddressInfo } from 'node:net'
import type { NoirSigner } from '@noirx402/agent-sdk'
import { NOIR_TESTNET_CONTRACTS, POLICY_MAX } from '@tollbooth/shared'
import type { NoirPort } from '@tollbooth/agent'
import { createApp } from './app'
import { JobStore } from './jobs'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'
import { runJob, createJobQueue } from './runner'

const MERCHANT = 'GMERCHANT'
const DEVICE = 'ab'.repeat(32)
const agent: NoirSigner = { publicKey: 'GAGENT', signTransaction: async () => '' }

async function setup(noirOverride?: Partial<NoirPort>) {
  const quotes = new QuoteStore()
  const verifier = createVerifier({ quotes, merchant: MERCHANT, deviceHash: DEVICE })
  const server = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, merchant: MERCHANT })] }).listen(0)
  await new Promise((r) => server.once('listening', r))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  let n = 0
  const noir: NoirPort = {
    checkPayment: async (p) => (p.amount > POLICY_MAX ? { ok: false, reason: 'over_limit' } : { ok: true }),
    authorizePayment: async (p) => {
      const hash = `tx${++n}`
      // stands in for noir.watch delivering the on-chain event
      verifier.recordEvent({ txHash: hash, contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow, merchant: p.merchant, deviceHash: p.deviceHash, amount: p.amount })
      return { hash, nonce: 0n }
    },
    ...noirOverride,
  }
  const jobs = new JobStore()
  jobs.create({ jobId: 'j1', topic: 'stellar fees', budget: 25_000_000n, paymentIntentId: 'pi', checkoutUrl: 'c' })
  jobs.markPaid('j1')
  return { jobs, noir, baseUrl, close: () => server.close() }
}

test('runJob marks done and stores trace', async () => {
  const s = await setup()
  await runJob('j1', { jobs: s.jobs, noir: s.noir, agent, deviceHash: DEVICE, baseUrl: s.baseUrl, delayMs: 0 })
  s.close()
  const job = s.jobs.get('j1')!
  expect(job.status).toBe('done')
  expect(job.payments.map((p) => p.endpoint)).toEqual(['quote', 'news'])
  expect(job.trace.find((d) => d.endpoint === 'report')!.action).toBe('refused')
  expect(job.summary).toMatch(/Bought 2/)
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
  s.jobs.create({ jobId: 'j2', topic: 'stellar fees', budget: 25_000_000n, paymentIntentId: 'pi2', checkoutUrl: 'c' })
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
