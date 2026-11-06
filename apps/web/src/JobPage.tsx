import { useEffect, useRef, useState } from 'react'
import type { DecisionAction, JobView } from '@clippass/shared'
import { ApiError, claim, getBalances, getJob, type Balances, type Payout } from './api'
import { MAX_FAILED_POLLS, pollingEnded, showServerDown } from './jobState'
import { ReelMissing, ServerDown } from './Notices'
import { ReelView } from './ReelView'
import { sound, type Cue } from './sound'

const CUES: Record<DecisionAction, Cue> = { plan: 'advance', skip: 'advance', refused: 'refused', paid: 'paid', failed: 'refused', done: 'done' }

export function JobPage({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobView | null>(null)
  const [missing, setMissing] = useState(false)
  const [failures, setFailures] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [balances, setBalances] = useState<Balances | null>(null)
  const [payouts, setPayouts] = useState<Payout[] | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [finishedNow, setFinishedNow] = useState(false)
  // Kept across Retry, so a reel that moved on during an outage still plays its cues.
  const seen = useRef<{ count: number | null; status: JobView['status'] | null }>({ count: null, status: null })
  useEffect(() => {
    let disposed = false, stopped = false, pending = false, balancePending = false, failed = 0
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
        const { count, status } = seen.current
        const fresh = count === null ? [] : j.trace.slice(count)
        fresh.forEach((d, i) => cues.push(setTimeout(() => sound.play(CUES[d.action]), i * 150)))
        if (status !== null && status !== 'done' && j.status === 'done') {
          setFinishedNow(true)
          if (!fresh.some(d => d.action === 'done')) cues.push(setTimeout(() => sound.play('done'), fresh.length * 150))
        }
        seen.current = { count: j.trace.length, status: j.status }
        failed = 0
        setFailures(0)
        setJob(j)
        if (pollingEnded(j)) stopped = true
      } else if (result.reason instanceof ApiError && result.reason.status === 404) { setMissing(true); stopped = true; sound.stopHum() }
      else {
        failed += 1
        setFailures(failed)
        if (failed >= MAX_FAILED_POLLS) stopped = true
      }
    }
    void tick()
    const id = setInterval(() => void tick(), 2000)
    return () => { disposed = true; clearInterval(id); cues.forEach(clearTimeout); sound.stopHum() }
  }, [jobId, attempt])
  const down = showServerDown(failures, !!job)
  const humming = job?.status === 'running' && !down
  useEffect(() => {
    if (humming) sound.startHum()
    else sound.stopHum()
    return () => sound.stopHum()
  }, [humming])
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
  function retry() { sound.play('press'); setFailures(0); setAttempt(n => n + 1) }
  if (missing) return <ReelMissing />
  if (!job) return down ? <ServerDown onRetry={retry} /> : <p className="notice">Loading reel…</p>
  return <>
    {down && <ServerDown onRetry={retry} />}
    <ReelView job={job} balances={balances} finished={finishedNow} receiptHref={`/jobs/${job.jobId}/receipt`} payout={{ payouts, claiming, error: claimError, onClaim }} />
  </>
}
