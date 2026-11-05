import { useEffect, useState } from 'react'
import type { DecisionAction, EndpointName, JobView } from '@tollbooth/shared'
import { ApiError, claim, getBalances, getJob } from './api'
import { Lanes } from './Lanes'
import { txLink, xlm } from './format'

const STATUS_TEXT: Record<JobView['status'], string> = {
  awaiting_payment: 'Waiting for Velo to confirm the job fee',
  paid: 'Job fee paid. The agent is starting.',
  running: 'The agent is buying data',
  done: 'Finished',
  failed: 'Stopped with an error',
}
const ACTION_TEXT: Record<DecisionAction, string> = {
  plan: 'Plan', skip: 'Skip', refused: 'Refused', paid: 'Paid', failed: 'Failed', done: 'Total',
}

export function JobPage({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobView | null>(null)
  const [missing, setMissing] = useState(false)
  const [balances, setBalances] = useState<{ escrow: string; pending: string } | null>(null)
  const [claimed, setClaimed] = useState<{ hash: string; before: string; after: string } | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    let stop = false
    const tick = async () => {
      getBalances().then(setBalances).catch(() => {})
      try {
        const j = await getJob(jobId)
        setJob(j)
        if (j.status === 'done' || j.status === 'failed') stop = true
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) { setMissing(true); stop = true }
      }
    }
    tick()
    const id = setInterval(() => { if (!stop) tick() }, 2000)
    return () => { stop = true; clearInterval(id) }
  }, [jobId])

  async function onClaim() {
    setClaiming(true)
    setClaimError(null)
    try {
      setClaimed(await claim())
      setBalances(await getBalances())
    } catch (e) {
      setClaimError(e instanceof ApiError && e.status === 409 ? 'Nothing to claim yet.' : e instanceof Error ? e.message : String(e))
    } finally {
      setClaiming(false)
    }
  }

  if (missing) {
    return (
      <div className="notice">
        <h1>Job not found (the server restarted). Start a new job.</h1>
        <p>Jobs live in the server’s memory, so a restart clears them. Payments that already happened stay on Testnet.</p>
        <a className="button" href="/">Start a new job</a>
      </div>
    )
  }
  if (!job) return <p className="notice">Loading job…</p>

  const states: Partial<Record<EndpointName, DecisionAction>> = {}
  for (const d of job.trace) if (d.endpoint) states[d.endpoint] = d.action

  return (
    <div className="job">
      <section className="job-side">
        <h1>{job.topic}</h1>
        <dl className="facts">
          <div><dt>Status</dt><dd className={`status is-${job.status}`}>{STATUS_TEXT[job.status]}</dd></div>
          <div><dt>Velo checkout</dt><dd>{job.status === 'awaiting_payment' ? (job.veloStatus ?? 'checking') : 'paid'}</dd></div>
          <div><dt>Data budget</dt><dd>{xlm(job.budget)} XLM</dd></div>
          <div><dt>Card escrow</dt><dd>{balances ? `${xlm(balances.escrow)} XLM` : '…'}</dd></div>
          <div><dt>Merchant can claim</dt><dd>{balances ? `${xlm(balances.pending)} XLM` : '…'}</dd></div>
        </dl>
        <Lanes states={states} />
        <div className="claim">
          <button onClick={onClaim} disabled={claiming}>{claiming ? 'Claiming…' : 'Claim earnings'}</button>
          <p className="hint">This collects what the agent paid the merchant. It doesn’t make a payment.</p>
          {claimed && (
            <p>
              Claimed {xlm(claimed.before)} XLM, {xlm(claimed.after)} XLM left.{' '}
              <a href={txLink(claimed.hash)} target="_blank" rel="noreferrer">See the claim on stellar.expert</a>
            </p>
          )}
          {claimError && <p className="error" role="alert">{claimError}</p>}
        </div>
      </section>

      <section className="tape" aria-label="The agent’s decisions" aria-live="polite">
        <h2>Agent receipt</h2>
        {job.status === 'awaiting_payment' && <p className="tape-empty">The agent starts once Velo confirms the job fee.</p>}
        <ol>
          {job.trace.map((d, i) => (
            <li key={i} className={`line is-${d.action}`}>
              <div className="line-head">
                <span className="act">{ACTION_TEXT[d.action]}</span>
                {d.endpoint && <span className="ep">/api/data/{d.endpoint}</span>}
                {d.price && <span className="amt">{xlm(d.price)} XLM</span>}
              </div>
              <p className="why">{d.action === 'refused' ? `The card’s policy refused it: ${d.reason}` : d.reason}</p>
              {d.hash && <a href={txLink(d.hash)} target="_blank" rel="noreferrer">See payment {d.hash.slice(0, 10)}… on stellar.expert</a>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
