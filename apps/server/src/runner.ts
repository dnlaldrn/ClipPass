import type { NoirSigner } from '@noirx402/agent-sdk'
import { runAgent, type NoirPort, type Planner } from '@clippass/agent'
import type { JobStore } from './jobs'

/**
 * Runs jobs one at a time. Every job pays with the same agent key, and concurrent transactions from one
 * account collide on its sequence number, so a second job would fail mid-purchase.
 */
export function createJobQueue(run: (jobId: string) => Promise<void>): (jobId: string) => Promise<void> {
  let chain = Promise.resolve()
  return (jobId) => (chain = chain.then(() => run(jobId)))
}

/** Runs the agent for a paid job, streaming its decisions into the job so polling shows progress. Never rejects. */
export async function runJob(
  jobId: string,
  d: { jobs: JobStore; noir: NoirPort; agent: NoirSigner; deviceHash: string; baseUrl: string; delayMs?: number; planner?: Planner },
): Promise<void> {
  const job = d.jobs.get(jobId)
  if (!job) return
  job.status = 'running'
  try {
    const result = await runAgent({
      script: job.script, mood: job.mood, budget: job.budget, baseUrl: d.baseUrl, noir: d.noir, agent: d.agent,
      deviceHash: d.deviceHash, log: (dec) => job.trace.push(dec), delayMs: d.delayMs, planner: d.planner,
    })
    job.licenses = result.licenses
    job.summary = result.summary
    job.status = 'done'
  } catch (e) {
    job.status = 'failed'
    job.trace.push({ at: new Date().toISOString(), action: 'failed', reason: `agent crashed: ${e instanceof Error ? e.message : String(e)}` })
    console.error(`job ${jobId} failed`, e)
  }
}
