import type { AssetType, DecisionAction, JobView } from '@clippass/shared'
import type { Balances, Payout } from './api'
import { Lanes } from './Lanes'
import { laneStates, txLink, xlm } from './format'
import { LANES } from './mirror'
import { Reel } from './reel/Reel'
import { reelFrames } from './reel/frames'
import type { ReelMode } from './reel/ReelScene'
import { PencilMark } from './PencilMark'
import { Edge } from './Edge'
import { CountUp } from './CountUp'
import { Identicon } from './Identicon'
import { Address } from './Address'
import { Hash } from './Hash'
import { Icon } from './Icon'
import { checkoutEnded } from './jobState'
import { totalSpent } from './receipt'

const STATUS_TEXT: Record<JobView['status'], string> = {
  awaiting_payment: 'Waiting for Velo to confirm the project fee', paid: 'Waiting for the agent. Another reel may be finishing first.',
  running: 'The agent is licensing assets', done: 'Finished', failed: 'Stopped with an error',
}
const ACTION_TEXT: Record<DecisionAction, string> = { plan: 'Plan', skip: 'Skip', refused: 'Refused', paid: 'Paid', failed: 'Failed', done: 'Total' }
const LANE_LABEL = Object.fromEntries(LANES.map(l => [l.type, l.label])) as Record<AssetType, string>

export type PayoutProps = { payouts: Payout[] | null; claiming: boolean; error: string | null; onClaim: () => void }

/** The reel as data: no fetching and no sound, so the recorded sample can use it too. */
export function ReelView({ job, balances, payout, finished = false, receiptHref, mode = 'live' }: {
  job: JobView
  /** null while loading; left out when the view has no live chain state to show. */
  balances?: Balances | null
  payout?: PayoutProps
  finished?: boolean
  receiptHref: string
  mode?: ReelMode
}) {
  const artists = new Set(job.licenses.map(l => l.artistAddress)).size
  const owed = balances?.artists.reduce((sum, a) => sum + BigInt(a.pending), 0n)
  const spent = totalSpent(job)
  const budget = BigInt(job.budget)
  const percent = budget > 0n ? Number(spent * 10_000n / budget) / 100 : 0
  const payouts = payout?.payouts
  const payoutArtists = balances?.artists.filter(a => BigInt(a.pending) > 0n || payouts?.some(p => p.artist === a.id)) ?? []
  const ended = checkoutEnded(job)
  const working = job.status === 'running'
  const latestLicense = job.licenses.at(-1)
  const latestPurchase = job.trace.find(d => d.hash === latestLicense?.hash && d.action === 'paid')
  const cardRefusal = job.trace.find(d => d.action === 'refused' && d.reason.includes('over_limit') && d.price)
  return <div className="job">
    <Reel frames={reelFrames(job.trace, job.licenses)} mode={mode} label="The reel: one frame per asset the agent planned, filled as each license is paid" />
    <header className="job-head">
      <div className="headline-row"><h1>{job.licenses.length ? <>This reel uses <CountUp value={String(job.licenses.length)} count /> assets from <CountUp value={String(artists)} count /> artists</> : 'Reel project'}</h1>{finished && <span className="licensed-stamp"><Edge>LICENSED</Edge></span>}</div>
      <p className="script">“{job.script}” · mood {job.mood}</p>
      {ended && <div className="job-alert"><p className="error"><Icon name="failed" /> Checkout {job.veloStatus}. The agent never started.</p><a className="button" href="/">Start a new reel</a></div>}
      <dl className="facts">
        <div><dt>Status</dt><dd className={'status is-' + (ended ? 'failed' : job.status)}>{ended ? 'Checkout ' + job.veloStatus : STATUS_TEXT[job.status]}</dd></div>
        <div><dt>Velo checkout</dt><dd>{job.veloStatus ?? (job.status === 'awaiting_payment' ? 'checking' : 'not used (dev run)')}</dd></div>
        <div><dt>License budget</dt><dd><CountUp value={job.budget} /> XLM</dd></div>
        {balances !== undefined && <>
          <div><dt>Card escrow</dt><dd>{balances ? <><CountUp value={balances.escrow} /> XLM</> : '…'}</dd></div>
          <div><dt>Artists can claim</dt><dd>{owed !== undefined ? <><CountUp value={owed.toString()} /> XLM</> : '…'}</dd></div>
        </>}
      </dl>
      {job.status === 'awaiting_payment' && !ended && <p className="hint">If you just paid, keep this page open while Velo checks the Testnet payment.</p>}
      {(latestLicense || cardRefusal) && <div className="job-proof" aria-live="polite">
        {latestLicense && <p><strong>{latestLicense.title}</strong> · {latestLicense.artist} · {xlm(latestLicense.price)} XLM · <a href={txLink(latestLicense.hash)} target="_blank" rel="noreferrer">View on Stellar</a></p>}
        {latestPurchase && <p>{latestPurchase.reason}</p>}
        {cardRefusal?.price && <p><strong>Refused by Noir.</strong> {cardRefusal.title ?? cardRefusal.assetId} costs {xlm(cardRefusal.price)} XLM. The demo card allows 1 XLM per purchase.</p>}
      </div>}
      <div className="budget-meter"><span><CountUp value={spent.toString()} /> of <CountUp value={job.budget} /> XLM spent</span><div role="meter" aria-label="License budget spent" aria-valuenow={Math.min(100, percent)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={xlm(spent.toString()) + ' of ' + xlm(job.budget) + ' XLM'}><span style={{ width: Math.min(100, percent) + '%' }} /></div></div>
    </header>
    <div className="job-grid">
      <section className="sheet" aria-label="License sheet and the agent’s decisions" aria-live="polite">
        <h2>License sheet</h2>
        {job.licenses.length ? <>
          <table className="licenses"><thead><tr><th scope="col">Asset</th><th scope="col">Type</th><th scope="col">Artist</th><th scope="col">Price</th><th scope="col">Proof</th></tr></thead><tbody>{job.licenses.map(l => <tr key={l.hash} className="license-row">
            <td className="asset">{l.title}</td><td className="lane"><Edge>{LANE_LABEL[l.assetType]}</Edge></td>
            <td className="artist"><span className="artist-identity"><Identicon address={l.artistAddress} /><Address address={l.artistAddress} name={l.artist} /></span></td>
            <td className="amt">{xlm(l.price)} XLM</td><td className="proof"><Hash hash={l.hash} /></td>
          </tr>)}</tbody></table>
          <p className="receipt-link"><a href={receiptHref}>Receipt</a></p>
        </> : <p className="sheet-empty">{ended ? 'No licenses.' : job.status === 'awaiting_payment' ? 'The agent starts once Velo confirms the project fee.' : 'No licenses yet.'}</p>}
        {(job.trace.length > 0 || working) && <>
          <h2>Agent log</h2>
          <ol className="trace">{job.trace.map((d, i) => <li key={i} className={'line is-' + d.action}>
            <span className="timeline-icon"><Icon name={d.action} /></span>
            <div className="line-head"><span className="act">{ACTION_TEXT[d.action]}</span>{d.assetId && <span className="ep">/api/assets/{d.assetId}</span>}{d.price && <span className="amt">{xlm(d.price)} XLM</span>}</div>
            {d.action === 'plan' ? <><div className="slot-chips" aria-label="Planned lanes in order">{reelFrames(job.trace, job.licenses).map((f, n) => <span className="tag-chip" key={n}><Edge>{LANE_LABEL[f.type]}</Edge></span>)}</div><details><summary>Full plan</summary><p className="why">{d.reason}</p></details></>
              : d.action === 'refused' ? <p className="why refusal-reason"><PencilMark><Edge>{d.reason}</Edge></PencilMark></p>
              : d.action === 'done' ? <div className="trace-result">{d.reason.split('\n').map((line, n) => <p key={n}>{line}</p>)}</div>
              : <p className="why">{d.action === 'paid' ? d.reason.replace(/; [\d.]+ XLM within budget and card policy$/, '') : d.reason}</p>}
            {d.hash && <Hash hash={d.hash} />}
          </li>)}{working && <li className="line working" role="status"><span className="timeline-icon"><Icon name="pick" /></span><Edge>AGENT WORKING</Edge></li>}</ol>
        </>}
      </section>
      <aside className="job-side"><Lanes states={laneStates(job.trace)} />{payout && <div className={'claim' + (payout.claiming ? ' is-claiming' : '')} aria-busy={payout.claiming}>
        {!!payoutArtists.length && <ul className="payouts">{payoutArtists.map(a => {
          const p = payouts?.find(p => p.artist === a.id)
          return <li key={a.id}><Identicon address={a.address} /><span className="payout-name">{a.name}<span className="payout-amount">{xlm(p?.amount ?? a.pending)} XLM</span></span>{p && <Hash hash={p.hash} />}</li>
        })}</ul>}
        {!balances && payouts && <ul className="payouts">{payouts.map(p => <li key={p.hash}><span>{p.name}: {xlm(p.amount)} XLM</span><Hash hash={p.hash} /></li>)}</ul>}
        <button onClick={payout.onClaim} disabled={payout.claiming}>{payout.claiming ? 'Paying out…' : 'Pay out artists'}</button>
        {payout.error && <p className="error" role="alert">{payout.error}</p>}
      </div>}</aside>
    </div>
  </div>
}
