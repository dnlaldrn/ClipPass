import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Velo } from '@carts1024/velo-sdk'
import { randomUUID } from 'node:crypto'
import { NoirAgentClient, keypairSigner, toStroops } from '@noirx402/agent-sdk'
import { Router } from 'express'
import { assertTestnetContracts, readEnv, XLM_SAC, DEMO_SCRIPT, MOODS, type Mood } from '@clippass/shared'
import { createApp } from './app'
import { JobStore } from './jobs'
import { veloRouter } from './velo'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'
import { startPaymentWatch } from './noirWatch'
import { runJob, createJobQueue } from './runner'
import { ollamaPlanner } from '@clippass/agent'
import { devRoutesEnabled } from './dev'
import { claimRouter } from './claim'
import { restoreSuccessFlag } from './rpcShim'
import { loadArtists, payees } from './artists'

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv) // local dev only; Render sets real env vars

const env = readEnv(['VELO_API_KEY', 'VELO_WEBHOOK_SECRET', 'WEB_ORIGIN', 'MERCHANT_SECRET', 'AGENT_SECRET', 'DEVICE_HASH'])
const artists = loadArtists()

// Startup assertions: the SDK must point at the deployed Testnet contracts, and the escrow must hold XLM
// (payment.authorized events carry no asset, so this is where the asset check lives).
const noir = restoreSuccessFlag(new NoirAgentClient()) // see rpcShim.ts: SDK 0.3.0 drops RPC v30 events
assertTestnetContracts(noir.contracts)
if ((await noir.getEscrowToken(env.DEVICE_HASH)) !== XLM_SAC) {
  throw new Error('escrow not bound to XLM SAC; run npm run setup')
}

const velo = new Velo({ apiKey: env.VELO_API_KEY, environment: 'testnet' })
const jobs = new JobStore()
const quotes = new QuoteStore()
const verifier = createVerifier({ quotes, deviceHash: env.DEVICE_HASH })
startPaymentWatch(noir, verifier, env.DEVICE_HASH)

const port = Number(process.env.PORT ?? 8787)
const agent = keypairSigner(env.AGENT_SECRET) // the agent key lives only on the server
// The agent buys from our own merchant API over real HTTP, so the full 402 path runs.
const planner = process.env.AGENT_LLM ? ollamaPlanner({ model: process.env.AGENT_LLM, url: process.env.OLLAMA_URL }) : undefined
const enqueue = createJobQueue((id) => runJob(id, { jobs, noir, agent, deviceHash: env.DEVICE_HASH, baseUrl: `http://127.0.0.1:${port}`, planner }))
const startAgent = (id: string) => void enqueue(id)

const routers = [
  veloRouter({ velo, jobs, webOrigin: env.WEB_ORIGIN, secret: env.VELO_WEBHOOK_SECRET, onPaid: startAgent }),
  merchantRouter({ quotes, verifier, payees: payees(artists) }),
  claimRouter({ noir, merchant: keypairSigner(env.MERCHANT_SECRET), deviceHash: env.DEVICE_HASH }),
]
if (devRoutesEnabled(process.env)) {
  // Local dev only (DEV_ROUTES=1): create and start a job without a Velo checkout. Never set it on Render.
  const dev = Router()
  dev.post('/api/dev/jobs', (req, res) => {
    const jobId = randomUUID()
    const script = String(req.body?.script ?? DEMO_SCRIPT)
    const mood: Mood = MOODS.includes(req.body?.mood) ? req.body.mood : 'chill'
    jobs.create({ jobId, script, mood, budget: toStroops(String(req.body?.budget ?? '2.5')), paymentIntentId: `dev-${jobId}`, checkoutUrl: '' })
    jobs.markPaid(jobId)
    startAgent(jobId)
    res.json({ jobId })
  })
  routers.push(dev)
}

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  routers,
})

app.listen(port, () => console.log(`clippass server on :${port}`))
