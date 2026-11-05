import type { JobView } from '@tollbooth/shared'

export type Job = Omit<JobView, 'budget'> & { budget: bigint; paymentIntentId: string }

/** In-memory job state. Lost on restart by design (spec: no persistent DB). */
export class JobStore {
  private jobs = new Map<string, Job>()

  create(p: { jobId: string; topic: string; budget: bigint; paymentIntentId: string; checkoutUrl: string }): Job {
    const job: Job = { ...p, status: 'awaiting_payment', veloStatus: null, trace: [], payments: [], summary: null }
    this.jobs.set(p.jobId, job)
    return job
  }

  get(id: string) { return this.jobs.get(id) }

  byPaymentIntent(piId: string) {
    for (const j of this.jobs.values()) if (j.paymentIntentId === piId) return j
  }

  /** True only on the awaiting_payment → paid transition, so the agent starts once per job. */
  markPaid(id: string): boolean {
    const j = this.jobs.get(id)
    if (!j || j.status !== 'awaiting_payment') return false
    j.status = 'paid'
    return true
  }

  view(id: string): JobView | undefined {
    const j = this.jobs.get(id)
    if (!j) return
    const { paymentIntentId: _, budget, ...rest } = j
    return { ...rest, budget: budget.toString() }
  }
}
