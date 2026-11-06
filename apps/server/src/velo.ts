import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { Velo, VeloAuthError, VeloWebhookSignatureVerificationError } from '@carts1024/velo-sdk'
import { toStroops } from '@noirx402/agent-sdk'
import { JOB_FEE, MAX_JOB_BUDGET, MIN_JOB_BUDGET, MOODS, type Mood } from '@clippass/shared'
import type { JobStore } from './jobs'

/** Checkout asset; the day-one Velo check settles whether Testnet takes 'native'. */
export const VELO_ASSET = 'native'

export type VeloLike = {
  checkout: {
    sessions: {
      create(p: object, o?: { idempotencyKey?: string }): Promise<{ checkoutUrl: string | null; paymentIntentId: string }>
    }
  }
  paymentIntents: { retrieve(id: string): Promise<{ status: string }> }
}

export function parseBudget(raw: unknown): bigint | null {
  if (typeof raw !== 'string') return null
  try {
    const b = toStroops(raw)
    return b >= MIN_JOB_BUDGET && b <= MAX_JOB_BUDGET ? b : null
  } catch {
    return null
  }
}

/** Shared by checkout and the opt-in dev route; a failed read never opens a job. */
export async function checkCardFunding(canStart?: () => Promise<boolean>): Promise<string | null> {
  try {
    if (canStart && !await canStart()) {
      return 'The card is out of funds right now, so no checkout opened. You were not charged.'
    }
    return null
  } catch (error) {
    console.error('card funding check failed', error)
    return 'Stellar Testnet is not responding, so no checkout opened. You were not charged.'
  }
}

export function veloRouter(d: {
  velo: VeloLike
  jobs: JobStore
  webOrigin: string
  secret: string
  verify?: typeof Velo.webhooks.verify
  onPaid: (jobId: string) => void
  canStart?: () => Promise<boolean>
}): Router {
  const r = Router()
  const verify = d.verify ?? Velo.webhooks.verify
  const seenDeliveries = new Set<string>()
  const seenEvents = new Set<string>()
  const paid = (jobId: string) => { if (d.jobs.markPaid(jobId)) d.onPaid(jobId) }

  r.post('/api/jobs', async (req, res) => {
    const script = typeof req.body?.script === 'string' ? req.body.script.trim() : ''
    const mood = req.body?.mood as Mood
    const budget = parseBudget(req.body?.budget)
    if (!script || script.length > 500) return res.status(400).json({ error: 'Script is required (max 500 characters).' })
    if (!MOODS.includes(mood)) return res.status(400).json({ error: `Mood must be one of: ${MOODS.join(', ')}.` })
    if (budget === null) return res.status(400).json({ error: 'Budget must be an XLM amount from 2 to 5.' })

    const error = await checkCardFunding(d.canStart)
    if (error) return res.status(503).json({ error })

    const jobId = randomUUID()
    let session: Awaited<ReturnType<VeloLike['checkout']['sessions']['create']>>
    try {
      session = await d.velo.checkout.sessions.create(
        {
          amount: JOB_FEE,
          asset: VELO_ASSET,
          description: `ClipPass reel project: ${script.slice(0, 80)}`,
          successUrl: `${d.webOrigin}/jobs/${jobId}`,
          cancelUrl: `${d.webOrigin}/`,
        },
        { idempotencyKey: `job:${jobId}` },
      )
    } catch (e) {
      // Our upstream failed, so never echo Velo's status (a 401 here isn't the visitor's) or its details.
      console.error('velo checkout failed', e)
      return res.status(502).json({
        error: e instanceof VeloAuthError
          ? 'Velo rejected this server’s API key, so no checkout opened. You were not charged.'
          : 'Velo could not open the checkout. You were not charged. Try again.',
      })
    }
    if (!session.checkoutUrl) return res.status(502).json({ error: 'Velo returned no checkout URL.' })
    d.jobs.create({ jobId, script, mood, budget, paymentIntentId: session.paymentIntentId, checkoutUrl: session.checkoutUrl })
    res.json({ jobId, checkoutUrl: session.checkoutUrl })
  })

  r.get('/api/jobs/:id', async (req, res) => {
    const job = d.jobs.get(req.params.id)
    if (!job) return res.status(404).json({ error: 'job not found' })
    if (job.status === 'awaiting_payment') {
      try {
        job.veloStatus = (await d.velo.paymentIntents.retrieve(job.paymentIntentId)).status
        if (job.veloStatus === 'paid') paid(job.jobId) // fallback when the webhook is late
      } catch {
        job.veloStatus = null // a Velo outage must not break the job page
      }
    }
    res.json(d.jobs.view(job.jobId))
  })

  r.post('/webhooks/velo', async (req, res) => {
    const sig = req.headers['x-velo-signature']
    let event
    try {
      event = await verify({
        payload: Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '',
        signature: (Array.isArray(sig) ? sig[0] : sig) ?? null,
        secret: d.secret,
      })
    } catch (e) {
      if (e instanceof VeloWebhookSignatureVerificationError) return res.status(400).send('bad signature')
      throw e
    }
    const delivery = req.headers['x-velo-delivery']
    const deliveryId = Array.isArray(delivery) ? delivery[0] : delivery
    if ((deliveryId && seenDeliveries.has(deliveryId)) || seenEvents.has(event.id)) return res.sendStatus(200)
    if (deliveryId) seenDeliveries.add(deliveryId)
    seenEvents.add(event.id)

    if (event.type === 'payment.succeeded' && 'paymentIntent' in event) {
      const job = d.jobs.byPaymentIntent(event.paymentIntent.id)
      if (job) { job.veloStatus = 'paid'; paid(job.jobId) }
    }
    res.sendStatus(200) // unknown intents are acknowledged so Velo stops retrying
  })

  return r
}
