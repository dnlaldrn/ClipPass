import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Velo } from '@carts1024/velo-sdk'
import { readEnv } from '@tollbooth/shared'
import { createApp } from './app'
import { JobStore } from './jobs'
import { veloRouter } from './velo'

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv) // local dev only; Render sets real env vars

const env = readEnv(['VELO_API_KEY', 'VELO_WEBHOOK_SECRET', 'WEB_ORIGIN'])
const velo = new Velo({ apiKey: env.VELO_API_KEY, environment: 'testnet' })
const jobs = new JobStore()

const app = createApp({
  webOrigin: env.WEB_ORIGIN,
  routers: [
    veloRouter({
      velo, jobs, webOrigin: env.WEB_ORIGIN, secret: env.VELO_WEBHOOK_SECRET,
      onPaid: (id) => console.log(`job paid ${id}`),
    }),
  ],
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`tollbooth server on :${port}`))
