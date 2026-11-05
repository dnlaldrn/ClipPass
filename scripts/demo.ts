// End-to-end Testnet demo: check setup, run one agent job against the real merchant API, claim, print every link.
// Velo is skipped here because its checkout needs a human; the live site covers it.
import type { AddressInfo } from 'node:net'
import { Keypair } from '@stellar/stellar-sdk'
import { NoirAgentClient, keypairSigner, toStroops, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, readEnv, XLM_SAC, POLICY_MAX, txLink } from '@tollbooth/shared'
import { runAgent } from '@tollbooth/agent'
import { createApp } from '../apps/server/src/app'
import { QuoteStore } from '../apps/server/src/quotes'
import { createVerifier } from '../apps/server/src/verifier'
import { merchantRouter } from '../apps/server/src/merchant'
import { startPaymentWatch } from '../apps/server/src/noirWatch'
import { restoreSuccessFlag } from '../apps/server/src/rpcShim'
import { loadDotEnv } from './env-file'

const fail = (msg: string): never => { console.error(`${msg}\nRun npm run setup first.`); process.exit(1) }

loadDotEnv()
const env = readEnv(['AGENT_SECRET', 'MERCHANT_SECRET', 'DEVICE_HASH'])
const noir = restoreSuccessFlag(new NoirAgentClient())
assertTestnetContracts(noir.contracts)
const agent = keypairSigner(env.AGENT_SECRET)
const merchant = Keypair.fromSecret(env.MERCHANT_SECRET).publicKey()

// 1. Setup state
const policy = await noir.getPolicy(env.DEVICE_HASH)
if (!policy || policy.agent !== agent.publicKey || policy.asset !== XLM_SAC || policy.maxAmount !== POLICY_MAX) fail('Agent policy missing or wrong.')
if ((await noir.getEscrowToken(env.DEVICE_HASH)) !== XLM_SAC) fail('Escrow is not bound to XLM.')
const escrow = await noir.getEscrowBalance(env.DEVICE_HASH)
if (escrow < toStroops('2')) fail(`Escrow too low: ${fromStroops(escrow)} XLM.`)
console.log(`setup ok: policy cap ${fromStroops(policy!.maxAmount)} XLM, escrow ${fromStroops(escrow)} XLM`)

// 2. Merchant API in-process on an ephemeral port
const quotes = new QuoteStore()
const verifier = createVerifier({ quotes, merchant, deviceHash: env.DEVICE_HASH })
const stopWatch = startPaymentWatch(noir, verifier, merchant)
const server = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, merchant })] }).listen(0)
await new Promise((r) => server.once('listening', r))
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

// 3. One job
const { payments, summary } = await runAgent({
  topic: 'stellar weather', budget: toStroops('2.5'), baseUrl, noir, agent, deviceHash: env.DEVICE_HASH,
  log: (d) => console.log(`  ${d.action.padEnd(8)} ${(d.endpoint ?? '').padEnd(8)} ${d.reason.split('\n')[0]}`),
})
stopWatch()
server.close()

// 4. Claim
const { hash: claimHash } = await noir.claim({ merchant: keypairSigner(env.MERCHANT_SECRET), token: XLM_SAC })

console.log('\nAgent payments:')
for (const p of payments) console.log(`  ${p.endpoint.padEnd(8)} ${fromStroops(BigInt(p.price))} XLM  ${txLink(p.hash)}`)
console.log(`Merchant claim: ${txLink(claimHash)}`)
console.log(`\n${summary}`)
console.log('\nVelo checkout skipped (needs a human); run it from the live site.')
