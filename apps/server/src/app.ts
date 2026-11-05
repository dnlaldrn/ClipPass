import express, { type Express, type Router } from 'express'
import cors from 'cors'

export function createApp(d: { webOrigin: string; routers: Router[] }): Express {
  const app = express()
  app.use(cors({ origin: d.webOrigin }))
  app.use('/webhooks/velo', express.raw({ type: 'application/json' })) // signature needs the raw body
  app.use(express.json())
  app.get('/health', (_req, res) => { res.json({ ok: true }) })
  for (const r of d.routers) app.use(r)
  return app
}
