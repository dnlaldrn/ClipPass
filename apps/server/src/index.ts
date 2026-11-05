import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Keypair } from '@stellar/stellar-sdk'
import { Velo } from '@carts1024/velo-sdk'
import { NoirAgentClient } from '@noirx402/agent-sdk'
import { assertTestnetContracts, readEnv, XLM_SAC } from '@tollbooth/shared'
import { createApp } from './app'
import { JobStore } from './jobs'
import { veloRouter } from './velo'
import { QuoteStore } from './quotes'
import { createVerifier } from './verifier'
import { merchantRouter } from './merchant'
import { startPaymentWatch } from './noirWatch'

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv) // local dev only; Render sets real env vars

const env = readEnv(['VELO_API_KEY', 'VELO_WEBHOOK_SECRET', 'WEB_ORIGIN', 'MERCHANT_SECRET', 'DEVICE_HASH'])
const merchant = Keypair.fromSecret(env.MERCHANT_SECRET).publicKey()

// Startup assertions: the SDK must point at the deployed Testnet contracts, and the escrow must hold XLM
// (payment.authorized events carry no asset, so this is where the asset check lives).
const noir = new NoirAgentClient()
assertTestnetContracts(noir.contracts)
if ((await noir.getEscrowToken(env.DEVICE_HASH)) !== XLM_SAC) {
  throw new Error('escrow not bound to XLM SAC; run npm run setup')
}

const velo = new Velo({ apiKey: env.VELO_API_KEY, environment: 'testnet' })
const jobs = new JobStore()
const quotes = new QuoteStore()
const verifier = createVerifier({ quotes, merchant, deviceHash: env.DEVICE_HASH })
startPaymentWatch(noir, verifier, merchant)

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  routers: [
    veloRouter({
      velo, jobs, webOrigin: env.WEB_ORIGIN, secret: env.VELO_WEBHOOK_SECRET,
      onPaid: (id) => console.log(`job paid ${id}`),
    }),
    merchantRouter({ quotes, verifier, merchant }),
  ],
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`tollbooth server on :${port}`))
