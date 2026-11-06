import { useEffect, useState } from 'react'
import type { AssetType, DecisionAction, JobView } from '@clippass/shared'
import { ApiError, claim, getBalances, getJob, type Balances, type Payout } from './api'
import { Lanes } from './Lanes'
import { laneStates, txLink, xlm } from './format'
import { LANES } from './mirror'
import { Reel } from './reel/Reel'
import { reelFrames } from './reel/frames'

const STATUS_TEXT: Record<JobView['status'], string> = {
  awaiting_payment: 'Waiting for Velo to confirm the project fee',
  paid: 'Project fee paid. The agent is starting.',
  running: 'The agent is licensing assets',
  done: 'Finished',
  failed: 'Stopped with an error',
}
const ACTION_TEXT: Record<DecisionAction, string> = {
  plan: 'Plan', skip: 'Skip', refused: 'Refused', paid: 'Paid', failed: 'Failed', done: 'Total',
}
const LANE_LABEL = Object.fromEntries(LANES.map((l) => [l.type, l.label])) as Record<AssetType, string>

export function JobPage({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobView | null>(null)
  const [missing, setMissing] = useState(false)
  const [balances, setBalances] = useState<Balances | null>(null)
  const [payouts, setPayouts] = useState<Payout[] | null>(null)
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
      setPayouts((await claim()).claims)
      setBalances(await getBalances())
    } catch (e) {
      setClaimError(e instanceof ApiError && e.status === 409 ? 'Nothing to pay out yet.' : e instanceof Error ? e.message : String(e))
    } finally {
      setClaiming(false)
    }
  }

  if (missing) {
    return (
      <div className="notice">
        <h1>Reel not found (the server restarted). Start a new reel.</h1>
        <p>Reels live in the server’s memory, so a restart clears them. Payments that already happened stay on Testnet.</p>
        <a className="button" href="/">Start a new reel</a>
      </div>
    )
  }
  if (!job) return <p className="notice">Loading reel…</p>

  const artists = new Set(job.licenses.map((l) => l.artistAddress)).size
  const owed = balances?.artists.reduce((sum, a) => sum + BigInt(a.pending), 0n)

  return (
    <div className="job">
      <Reel frames={reelFrames(job.trace, job.licenses)} mode="live" label="The reel: one frame per asset the agent planned, filled as each license is paid" />
      <header className="job-head">
        <h1>{job.licenses.length ? `This reel uses ${job.licenses.length} assets from ${artists} artists` : 'Reel project'}</h1>
        <p className="script">“{job.script}” · mood {job.mood}</p>
        <dl className="facts">
          <div><dt>Status</dt><dd className={`status is-${job.status}`}>{STATUS_TEXT[job.status]}</dd></div>
          <div><dt>Velo checkout</dt><dd>{job.veloStatus ?? (job.status === 'awaiting_payment' ? 'checking' : 'not used (dev run)')}</dd></div>
          <div><dt>License budget</dt><dd>{xlm(job.budget)} XLM</dd></div>
          <div><dt>Card escrow</dt><dd>{balances ? `${xlm(balances.escrow)} XLM` : '…'}</dd></div>
          <div><dt>Artists can claim</dt><dd>{owed !== undefined ? `${xlm(owed.toString())} XLM` : '…'}</dd></div>
        </dl>
      </header>

      <div className="job-grid">
        <section className="sheet" aria-label="License sheet and the agent’s decisions" aria-live="polite">
          <h2>License sheet</h2>
          {job.licenses.length ? (
            <table className="licenses">
              <thead><tr><th scope="col">Asset</th><th scope="col">Type</th><th scope="col">Artist</th><th scope="col">Price</th><th scope="col">Proof</th></tr></thead>
              <tbody>
                {job.licenses.map((l) => (
                  <tr key={l.hash}>
                    <td className="asset">{l.title}</td>
                    <td>{LANE_LABEL[l.assetType]}</td>
                    <td>{l.artist}</td>
                    <td className="amt">{xlm(l.price)} XLM</td>
                    <td className="proof"><a href={txLink(l.hash)} target="_blank" rel="noreferrer">tx {l.hash.slice(0, 8)}…</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="sheet-empty">{job.status === 'awaiting_payment' ? 'The agent starts once Velo confirms the project fee.' : 'No licenses yet.'}</p>
          )}

          <h2>How the agent decided</h2>
          <ol className="trace">
            {job.trace.map((d, i) => (
              <li key={i} className={`line is-${d.action}`}>
                <div className="line-head">
                  <span className="act">{ACTION_TEXT[d.action]}</span>
                  {d.assetId && <span className="ep">/api/assets/{d.assetId}</span>}
                  {d.price && <span className="amt">{xlm(d.price)} XLM</span>}
                </div>
                <p className="why">{d.action === 'refused' ? `The card’s policy refused it: ${d.reason}` : d.reason}</p>
                {d.hash && <a href={txLink(d.hash)} target="_blank" rel="noreferrer">See payment {d.hash.slice(0, 10)}… on stellar.expert</a>}
              </li>
            ))}
          </ol>
        </section>

        <aside className="job-side">
          <Lanes states={laneStates(job.trace)} />
          <div className="claim">
            <button onClick={onClaim} disabled={claiming}>{claiming ? 'Paying out…' : 'Pay out artists'}</button>
            <p className="hint">This sends each artist what the agent paid them. It doesn’t make a payment.</p>
            {payouts && (
              <ul className="payouts">
                {payouts.map((p) => (
                  <li key={p.hash}>
                    {p.name}: {xlm(p.amount)} XLM.{' '}
                    <a href={txLink(p.hash)} target="_blank" rel="noreferrer">See the payout on stellar.expert</a>
                  </li>
                ))}
              </ul>
            )}
            {claimError && <p className="error" role="alert">{claimError}</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}
