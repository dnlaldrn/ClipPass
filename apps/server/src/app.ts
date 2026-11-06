import express, { type ErrorRequestHandler, type Express, type Router } from 'express'
import cors from 'cors'

export function createApp(d: { webOrigin: string; routers: Router[] }): Express {
  const app = express()
  app.use(cors({ origin: d.webOrigin }))
  app.use('/webhooks/velo', express.raw({ type: 'application/json' })) // signature needs the raw body
  app.use(express.json())
  app.get('/health', (_req, res) => { res.json({ ok: true }) })
  for (const r of d.routers) app.use(r)
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found.' }) })
  const errors: ErrorRequestHandler = (error, _req, res, next) => {
    console.error('server request failed', error)
    if (res.headersSent) return next(error)
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'That request was not valid JSON.' })
      return
    }
    res.status(500).json({ error: 'Something went wrong on the server. Try again.' })
  }
  app.use(errors)
  return app
}
