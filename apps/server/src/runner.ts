import type { NoirSigner } from '@noirx402/agent-sdk'
import { runAgent, type NoirPort } from '@tollbooth/agent'
import type { JobStore } from './jobs'

/** Runs the agent for a paid job, streaming its decisions into the job so polling shows progress. Never rejects. */
export async function runJob(
  jobId: string,
  d: { jobs: JobStore; noir: NoirPort; agent: NoirSigner; deviceHash: string; baseUrl: string; delayMs?: number },
): Promise<void> {
  const job = d.jobs.get(jobId)
  if (!job) return
  job.status = 'running'
  try {
    const result = await runAgent({
      topic: job.topic, budget: job.budget, baseUrl: d.baseUrl, noir: d.noir, agent: d.agent,
      deviceHash: d.deviceHash, log: (dec) => job.trace.push(dec), delayMs: d.delayMs,
    })
    job.payments = result.payments
    job.summary = result.summary
    job.status = 'done'
  } catch (e) {
    job.status = 'failed'
    job.trace.push({ at: new Date().toISOString(), action: 'failed', reason: `agent crashed: ${e instanceof Error ? e.message : String(e)}` })
    console.error(`job ${jobId} failed`, e)
  }
}
