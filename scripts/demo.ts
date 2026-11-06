// End-to-end Testnet demo: check setup, license one reel against the real stock library API, pay out artists, print every link.
// Velo is skipped here because its checkout needs a human; the live site covers it.
import type { AddressInfo } from 'node:net'
import { NoirAgentClient, keypairSigner, toStroops, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, readEnv, XLM_SAC, POLICY_MAX, DEMO_SCRIPT, txLink } from '@clippass/shared'
import { runAgent, ollamaPlanner } from '@clippass/agent'
import { createApp } from '../apps/server/src/app'
import { QuoteStore } from '../apps/server/src/quotes'
import { createVerifier } from '../apps/server/src/verifier'
import { merchantRouter } from '../apps/server/src/merchant'
import { startPaymentWatch } from '../apps/server/src/noirWatch'
import { restoreSuccessFlag } from '../apps/server/src/rpcShim'
import { loadArtists, payees } from '../apps/server/src/artists'
import { payOutArtists } from '../apps/server/src/claim'
import { loadDotEnv } from './env-file'

const fail = (msg: string): never => { console.error(`${msg}\nRun npm run setup first.`); process.exit(1) }

loadDotEnv()
const env = readEnv(['AGENT_SECRET', 'DEVICE_HASH'])
const artists = loadArtists()
const noir = restoreSuccessFlag(new NoirAgentClient())
assertTestnetContracts(noir.contracts)
const agent = keypairSigner(env.AGENT_SECRET)

// 1. Setup state
const policy = await noir.getPolicy(env.DEVICE_HASH)
if (!policy || policy.agent !== agent.publicKey || policy.asset !== XLM_SAC || policy.maxAmount !== POLICY_MAX) fail('Agent policy missing or wrong.')
if ((await noir.getEscrowToken(env.DEVICE_HASH)) !== XLM_SAC) fail('Escrow is not bound to XLM.')
const escrow = await noir.getEscrowBalance(env.DEVICE_HASH)
if (escrow < toStroops('2')) fail(`Escrow too low: ${fromStroops(escrow)} XLM.`)
console.log(`setup ok: policy cap ${fromStroops(policy!.maxAmount)} XLM, escrow ${fromStroops(escrow)} XLM`)

// 2. Stock library API in-process on an ephemeral port
const quotes = new QuoteStore()
const verifier = createVerifier({ quotes, deviceHash: env.DEVICE_HASH })
const stopWatch = startPaymentWatch(noir, verifier, env.DEVICE_HASH)
const server = createApp({ webOrigin: '*', routers: [merchantRouter({ quotes, verifier, payees: payees(artists) })] }).listen(0)
await new Promise((r) => server.once('listening', r))
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

// 3. One reel
console.log(`reel: "${DEMO_SCRIPT}" (mood chill, budget 2.5 XLM)`)
const { licenses, summary } = await runAgent({
  script: DEMO_SCRIPT, mood: 'chill', budget: toStroops('2.5'), baseUrl, noir, agent, deviceHash: env.DEVICE_HASH,
  planner: process.env.AGENT_LLM ? ollamaPlanner({ model: process.env.AGENT_LLM, url: process.env.OLLAMA_URL }) : undefined,
  log: (d) => console.log(`  ${d.action.padEnd(8)} ${(d.assetId ?? '').padEnd(10)} ${d.reason.split('\n')[0]}`),
})
stopWatch()
server.close()

console.log('\nLicense sheet:')
for (const l of licenses) console.log(`  ${l.title.padEnd(24)} ${l.artist.padEnd(20)} ${fromStroops(BigInt(l.price))} XLM  ${txLink(l.hash)}`)

// 4. Artists collect
console.log('\nArtist payouts:')
for (const c of await payOutArtists(noir, artists)) console.log(`  ${c.name.padEnd(20)} ${fromStroops(BigInt(c.amount))} XLM  ${txLink(c.hash)}`)
console.log(`\n${summary}`)
console.log('\nVelo checkout skipped (needs a human); run it from the live site.')
