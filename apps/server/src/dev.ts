import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { DEMO_SCRIPT, MOODS, type Mood } from '@clippass/shared'
import type { JobStore } from './jobs'
import { checkCardFunding, parseBudget } from './velo'

/** Dev-only routes are opt-in: hosts like Render don't set NODE_ENV, so an opt-out guard would expose them. */
export const devRoutesEnabled = (env: Record<string, string | undefined>) => env.DEV_ROUTES === '1'

export function devRouter(d: { jobs: JobStore; canStart: () => Promise<boolean>; onPaid: (id: string) => void }): Router {
  const r = Router()
  r.post('/api/dev/jobs', async (req, res) => {
    const jobId = randomUUID()
    const script = String(req.body?.script ?? DEMO_SCRIPT)
    const mood: Mood = MOODS.includes(req.body?.mood) ? req.body.mood : 'chill'
    const budget = parseBudget(String(req.body?.budget ?? '2.5'))
    if (budget === null) return res.status(400).json({ error: 'Budget must be an XLM amount from 2 to 5.' })
    const error = await checkCardFunding(d.canStart)
    if (error) return res.status(503).json({ error })
    d.jobs.create({ jobId, script, mood, budget, paymentIntentId: `dev-${jobId}`, checkoutUrl: '' })
    d.jobs.markPaid(jobId)
    d.onPaid(jobId)
    res.json({ jobId })
  })
  return r
}
