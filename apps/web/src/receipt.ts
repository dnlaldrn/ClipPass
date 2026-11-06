import type { JobView } from '@clippass/shared'
import { txLink, xlm } from './format'

export const MEDIA_NOTE = 'Media is mocked. The payments are real Testnet transactions.'

export const totalSpent = (job: JobView) => job.licenses.reduce((sum, l) => sum + BigInt(l.price), 0n)

export const refusals = (job: JobView) => job.trace.filter(d => d.action === 'refused')

/** The UTC day the reel started, from its first logged decision. */
export function reelDate(job: JobView): string | null {
  const at = job.trace[0]?.at
  const time = at ? Date.parse(at) : NaN
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10)
}

export function receiptJson(job: JobView): string {
  const total = totalSpent(job)
  return JSON.stringify({
    jobId: job.jobId,
    network: 'stellar-testnet',
    script: job.script,
    mood: job.mood,
    date: reelDate(job),
    status: job.status,
    budget: { stroops: job.budget, xlm: xlm(job.budget) },
    totalSpent: { stroops: total.toString(), xlm: xlm(total.toString()) },
    licenses: job.licenses.map(l => ({
      licenseId: l.licenseId,
      assetId: l.assetId,
      type: l.assetType,
      title: l.title,
      artist: l.artist,
      artistAddress: l.artistAddress,
      price: { stroops: l.price, xlm: xlm(l.price) },
      terms: l.terms,
      hash: l.hash,
      tx: txLink(l.hash),
    })),
    refusals: refusals(job).map(d => ({
      assetId: d.assetId ?? null,
      type: d.assetType ?? null,
      title: d.title ?? null,
      price: d.price ? { stroops: d.price, xlm: xlm(d.price) } : null,
      reason: d.reason,
    })),
    note: MEDIA_NOTE,
  }, null, 2)
}
