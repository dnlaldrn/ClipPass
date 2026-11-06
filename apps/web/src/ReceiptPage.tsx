import { useEffect, useState } from 'react'
import type { AssetType, JobView } from '@clippass/shared'
import { ApiError, getJob } from './api'
import { Address } from './Address'
import { Edge } from './Edge'
import { Hash } from './Hash'
import { Identicon } from './Identicon'
import { LANES } from './mirror'
import { ReelMissing, ServerDown } from './Notices'
import { PencilMark } from './PencilMark'
import { xlm } from './format'
import { MEDIA_NOTE, receiptJson, reelDate, refusals, totalSpent } from './receipt'

const LANE_LABEL = Object.fromEntries(LANES.map(l => [l.type, l.label])) as Record<AssetType, string>

function downloadJson(job: JobView) {
  const url = URL.createObjectURL(new Blob([receiptJson(job)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `clippass-receipt-${job.jobId}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url))
}

export function Receipt({ job, backHref }: { job: JobView; backHref: string }) {
  const date = reelDate(job)
  const refused = refusals(job)
  return <article className="receipt">
    <header className="job-head">
      <h1>Receipt</h1>
      <p className="script">“{job.script}”</p>
      <dl className="facts">
        <div><dt>Mood</dt><dd>{job.mood}</dd></div>
        <div><dt>Date</dt><dd>{date ? new Date(date).toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' }) : '—'}</dd></div>
        <div><dt>License budget</dt><dd>{xlm(job.budget)} XLM</dd></div>
      </dl>
    </header>
    {job.status !== 'done' && <p className="hint receipt-partial">Reel not finished.</p>}
    {job.licenses.length ? <table className="licenses receipt-table">
      <thead><tr><th scope="col">Asset</th><th scope="col">Type</th><th scope="col">Artist</th><th scope="col">Terms</th><th scope="col">Price</th><th scope="col">Proof</th></tr></thead>
      <tbody>{job.licenses.map(l => <tr key={l.hash}>
        <td className="asset">{l.title}</td><td className="lane"><Edge>{LANE_LABEL[l.assetType]}</Edge></td>
        <td className="artist"><span className="artist-identity"><Identicon address={l.artistAddress} /><Address address={l.artistAddress} name={l.artist} /></span></td>
        <td className="terms">{l.terms}</td><td className="amt">{xlm(l.price)} XLM</td>
        <td className="proof"><Hash hash={l.hash} /><span className="print-hash">{l.hash}</span></td>
      </tr>)}</tbody>
    </table> : <p className="sheet-empty receipt-empty">No licenses on this reel.</p>}
    <p className="receipt-total"><span>Total spent</span><strong>{xlm(totalSpent(job).toString())} XLM</strong></p>
    {!!refused.length && <section className="receipt-refused">
      <h2>Refused</h2>
      <ul>{refused.map((d, i) => <li key={i}><span>{d.title ?? d.assetId}{d.price && ', ' + xlm(d.price) + ' XLM'}</span><span className="refusal-reason"><PencilMark><Edge>{d.reason}</Edge></PencilMark></span></li>)}</ul>
    </section>}
    <p className="receipt-note">{MEDIA_NOTE}</p>
    <div className="receipt-actions">
      <button type="button" onClick={() => window.print()}>Save as PDF</button>
      <button type="button" className="button-quiet" onClick={() => downloadJson(job)}>Download JSON</button>
      <a href={backHref}>Back to reel</a>
    </div>
  </article>
}

export function JobReceipt({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobView | null>(null)
  const [state, setState] = useState<'loading' | 'down' | 'missing'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState('loading')
    getJob(jobId).then(j => { if (alive) setJob(j) }).catch(e => {
      if (alive) setState(e instanceof ApiError && e.status === 404 ? 'missing' : 'down')
    })
    return () => { alive = false }
  }, [jobId, attempt])
  if (job) return <Receipt job={job} backHref={`/jobs/${job.jobId}`} />
  if (state === 'missing') return <ReelMissing />
  if (state === 'down') return <ServerDown onRetry={() => setAttempt(n => n + 1)} />
  return <p className="notice">Loading receipt…</p>
}
