import { useEffect, useState } from 'react'
import type { AssetType, DecisionAction, JobView } from '@clippass/shared'
import { ApiError, claim, getBalances, getJob, type Balances, type Payout } from './api'
import { Lanes } from './Lanes'
import { laneStates, xlm } from './format'
import { LANES } from './mirror'
import { Reel } from './reel/Reel'
import { reelFrames, SLOTS } from './reel/frames'
import { PencilMark } from './PencilMark'
import { Edge } from './Edge'
import { CountUp } from './CountUp'
import { Identicon } from './Identicon'
import { Address } from './Address'
import { Hash } from './Hash'
import { Icon } from './Icon'
import { sound, type Cue } from './sound'
const STATUS_TEXT: Record<JobView['status'], string> = {
  awaiting_payment: 'Waiting for Velo to confirm the project fee', paid: 'Project fee paid. The agent is starting.',
  running: 'The agent is licensing assets', done: 'Finished', failed: 'Stopped with an error',
}
const ACTION_TEXT: Record<DecisionAction, string> = { plan: 'Plan', skip: 'Skip', refused: 'Refused', paid: 'Paid', failed: 'Failed', done: 'Total' }
const CUES: Record<DecisionAction, Cue> = { plan: 'advance', skip: 'advance', refused: 'refused', paid: 'paid', failed: 'refused', done: 'done' }
const LANE_LABEL = Object.fromEntries(LANES.map(l => [l.type, l.label])) as Record<AssetType, string>
export function JobPage({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobView | null>(null)
  const [missing, setMissing] = useState(false)
  const [balances, setBalances] = useState<Balances | null>(null)
  const [payouts, setPayouts] = useState<Payout[] | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [finishedNow, setFinishedNow] = useState(false)
  useEffect(() => {
    let disposed = false, stopped = false, pending = false, balancePending = false
    let previousCount: number | null = null, previousStatus: JobView['status'] | null = null
    const cues: ReturnType<typeof setTimeout>[] = []
    const tick = async () => {
      if (disposed || stopped || pending) return
      pending = true
      // Balances can take seconds on Testnet RPC, so they never hold up the reel.
      if (!balancePending) {
        balancePending = true
        getBalances().then((b) => { if (!disposed) setBalances(b) }).catch(() => {}).finally(() => { balancePending = false })
      }
      const [result] = await Promise.allSettled([getJob(jobId)])
      pending = false
      if (disposed) return
      if (result.status === 'fulfilled') {
        const j = result.value
        const fresh = previousCount === null ? [] : j.trace.slice(previousCount)
        fresh.forEach((d, i) => cues.push(setTimeout(() => sound.play(CUES[d.action]), i * 150)))
        if (previousStatus !== null && previousStatus !== 'done' && j.status === 'done') {
          setFinishedNow(true)
          if (!fresh.some(d => d.action === 'done')) cues.push(setTimeout(() => sound.play('done'), fresh.length * 150))
        }
        previousCount = j.trace.length; previousStatus = j.status
        setJob(j)
        if (j.status === 'done' || j.status === 'failed') stopped = true
      } else if (result.reason instanceof ApiError && result.reason.status === 404) { setMissing(true); stopped = true; sound.stopHum() }
    }
    void tick()
    const id = setInterval(() => void tick(), 2000)
    return () => { disposed = true; clearInterval(id); cues.forEach(clearTimeout); sound.stopHum() }
  }, [jobId])
  useEffect(() => {
    if (job?.status === 'running') sound.startHum()
    else sound.stopHum()
    return () => sound.stopHum()
  }, [job?.status])
  async function onClaim() {
    sound.play('press'); setClaiming(true); setClaimError(null)
    try {
      setPayouts((await claim()).claims); sound.play('payout')
      // A balance refresh failure must not discard successful payout receipts.
      try { setBalances(await getBalances()) } catch {}
    } catch (e) {
      setClaimError(e instanceof ApiError && e.status === 409 ? 'Nothing to pay out yet.' : e instanceof Error ? e.message : String(e))
    } finally { setClaiming(false) }
  }
  if (missing) return <div className="notice"><h1>Reel not found (the server restarted). Start a new reel.</h1><p>Reels live in the server’s memory, so a restart clears them. Payments that already happened stay on Testnet.</p><a className="button" href="/">Start a new reel</a></div>
  if (!job) return <p className="notice">Loading reel…</p>
  const artists = new Set(job.licenses.map(l => l.artistAddress)).size
  const owed = balances?.artists.reduce((sum, a) => sum + BigInt(a.pending), 0n)
  const spent = job.licenses.reduce((sum, l) => sum + BigInt(l.price), 0n)
  const budget = BigInt(job.budget)
  const percent = budget > 0n ? Number(spent * 10_000n / budget) / 100 : 0
  const payoutArtists = balances?.artists.filter(a => BigInt(a.pending) > 0n || payouts?.some(p => p.artist === a.id)) ?? []
  return <div className="job">
    <Reel frames={reelFrames(job.trace, job.licenses)} mode="live" label="The reel: one frame per asset the agent planned, filled as each license is paid" />
    <header className="job-head">
      <div className="headline-row"><h1>{job.licenses.length ? <>This reel uses <CountUp value={String(job.licenses.length)} count /> assets from <CountUp value={String(artists)} count /> artists</> : 'Reel project'}</h1>{finishedNow && <span className="licensed-stamp"><Edge>LICENSED</Edge></span>}</div>
      <p className="script">“{job.script}” · mood {job.mood}</p>
      <dl className="facts">
        <div><dt>Status</dt><dd className={'status is-' + job.status}>{STATUS_TEXT[job.status]}</dd></div>
        <div><dt>Velo checkout</dt><dd>{job.veloStatus ?? (job.status === 'awaiting_payment' ? 'checking' : 'not used (dev run)')}</dd></div>
        <div><dt>License budget</dt><dd><CountUp value={job.budget} /> XLM</dd></div>
        <div><dt>Card escrow</dt><dd>{balances ? <><CountUp value={balances.escrow} /> XLM</> : '…'}</dd></div>
        <div><dt>Artists can claim</dt><dd>{owed !== undefined ? <><CountUp value={owed.toString()} /> XLM</> : '…'}</dd></div>
      </dl>
      <div className="budget-meter"><span><CountUp value={spent.toString()} /> of <CountUp value={job.budget} /> XLM spent</span><div role="meter" aria-label="License budget spent" aria-valuenow={Math.min(100, percent)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={xlm(spent.toString()) + ' of ' + xlm(job.budget) + ' XLM'}><span style={{ width: Math.min(100, percent) + '%' }} /></div></div>
    </header>
    <div className="job-grid">
      <section className="sheet" aria-label="License sheet and the agent’s decisions" aria-live="polite">
        <h2>License sheet</h2>
        {job.licenses.length ? <table className="licenses"><thead><tr><th scope="col">Asset</th><th scope="col">Type</th><th scope="col">Artist</th><th scope="col">Price</th><th scope="col">Proof</th></tr></thead><tbody>{job.licenses.map(l => <tr key={l.hash} className="license-row">
          <td className="asset">{l.title}</td><td className="lane"><Edge>{LANE_LABEL[l.assetType]}</Edge></td>
          <td className="artist"><span className="artist-identity"><Identicon address={l.artistAddress} /><Address address={l.artistAddress} name={l.artist} /></span></td>
          <td className="amt">{xlm(l.price)} XLM</td><td className="proof"><Hash hash={l.hash} /></td>
        </tr>)}</tbody></table> : <p className="sheet-empty">{job.status === 'awaiting_payment' ? 'The agent starts once Velo confirms the project fee.' : 'No licenses yet.'}</p>}
        <h2>Agent log</h2>
        <ol className="trace">{job.trace.map((d, i) => <li key={i} className={'line is-' + d.action}>
          <span className="timeline-icon"><Icon name={d.action} /></span>
          <div className="line-head"><span className="act">{ACTION_TEXT[d.action]}</span>{d.assetId && <span className="ep">/api/assets/{d.assetId}</span>}{d.price && <span className="amt">{xlm(d.price)} XLM</span>}</div>
          {d.action === 'plan' ? <><div className="slot-chips" aria-label="Seven planned lanes in order">{SLOTS.map((type, n) => <span className="tag-chip" key={n}><Edge>{LANE_LABEL[type]}</Edge></span>)}</div><details><summary>Full plan</summary><p className="why">{d.reason}</p></details></>
            : d.action === 'refused' ? <p className="why refusal-reason"><PencilMark><Edge>{d.reason}</Edge></PencilMark></p>
            : d.action === 'done' ? <div className="trace-result">{d.reason.split('\n').map((line, n) => <p key={n}>{line}</p>)}</div>
            : <p className="why">{d.action === 'paid' ? d.reason.replace(/; [\d.]+ XLM within budget and card policy$/, '') : d.reason}</p>}
          {d.hash && <Hash hash={d.hash} />}
        </li>)}{(job.status === 'running' || job.status === 'paid') && <li className="line working" role="status"><span className="timeline-icon"><Icon name="pick" /></span><Edge>AGENT WORKING</Edge></li>}</ol>
      </section>
      <aside className="job-side"><Lanes states={laneStates(job.trace)} /><div className={'claim' + (claiming ? ' is-claiming' : '')} aria-busy={claiming}>
        {!!payoutArtists.length && <ul className="payouts">{payoutArtists.map(a => {
          const p = payouts?.find(p => p.artist === a.id)
          return <li key={a.id}><Identicon address={a.address} /><span className="payout-name">{a.name}<span className="payout-amount">{xlm(p?.amount ?? a.pending)} XLM</span></span>{p && <Hash hash={p.hash} />}</li>
        })}</ul>}
        {!balances && payouts && <ul className="payouts">{payouts.map(p => <li key={p.hash}><span>{p.name}: {xlm(p.amount)} XLM</span><Hash hash={p.hash} /></li>)}</ul>}
        <button onClick={onClaim} disabled={claiming}>{claiming ? 'Paying out…' : 'Pay out artists'}</button>
        {claimError && <p className="error" role="alert">{claimError}</p>}
      </div></aside>
    </div>
  </div>
}
