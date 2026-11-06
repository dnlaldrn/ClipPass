import { useEffect, useId, useRef, useState } from 'react'
import type { ActivityItem } from '@clippass/shared'
import { getActivity } from '../api'
import { Edge } from '../Edge'
import { Hash } from '../Hash'
import { Icon } from '../Icon'
import { PencilMark } from '../PencilMark'
import { xlm } from '../format'
import { newestFirst, relativeTime } from './activityFeed'
import '../pages.css'

export function Activity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [newRows, setNewRows] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(Date.now)
  const seen = useRef<Set<string> | null>(null)
  const pageId = useId()

  useEffect(() => {
    let alive = true, pending = false
    let timer: ReturnType<typeof setInterval> | undefined
    const refresh = async () => {
      if (document.hidden || pending) return
      pending = true
      try {
        const result = await getActivity()
        if (!alive) return
        const rows = newestFirst(result.items)
        const previous = seen.current
        setNewRows(new Set(previous === null ? [] : rows.filter(row => !previous.has(row.id)).map(row => row.id)))
        seen.current = new Set(rows.map(row => row.id))
        setItems(rows)
        setError(false)
      } catch { if (alive) setError(true) }
      finally { if (alive) { pending = false; setNow(Date.now()) } }
    }
    const visibility = () => {
      clearInterval(timer)
      timer = undefined
      if (!document.hidden) {
        setNow(Date.now())
        void refresh()
        timer = setInterval(() => { setNow(Date.now()); void refresh() }, 5000)
      }
    }
    setError(false)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [attempt])

  return <section className="directory-page activity-page" aria-labelledby={`${pageId}-heading`}>
    <header className="directory-heading"><h1 id={`${pageId}-heading`}>Activity</h1>
      {items && <span className="directory-count">{items.length} events</span>}
    </header>
    {items === null && !error && <p className="directory-state" role="status">Loading activity…</p>}
    {error && <div className="directory-state directory-error" role="alert">{items === null ? 'Activity unavailable.' : 'Activity refresh failed.'}
      <button type="button" className="page-action" onClick={() => setAttempt(value => value + 1)}>Retry</button>
    </div>}
    {items?.length === 0 && <p className="directory-state" role="status">No agent payments yet.</p>}
    {items && items.length > 0 && <ol className="activity-timeline" aria-label="Agent activity, newest first">{items.map(item => <li
      className={`activity-row is-${item.kind}${newRows.has(item.id) ? ' is-new' : ''}`} key={item.id}>
      <span className="activity-icon"><Icon name={item.kind} /></span>
      <div className="activity-event">
        <span className="activity-kind"><Edge>{item.kind === 'paid' ? 'Paid' : 'Refused'}</Edge></span>
        <strong>{item.title || item.artist || 'Agent payment'}</strong>
        {item.title && item.artist && <span className="activity-artist">{item.artist}</span>}
        {item.kind === 'refused' && <span className="activity-reason"><PencilMark>{item.reason || 'Refused'}</PencilMark></span>}
      </div>
      <span className="directory-money">{xlm(item.amount)} XLM</span>
      <time dateTime={item.at} title={item.at}>{relativeTime(item.at, now)}</time>
      <span className="activity-proof">{item.hash && <Hash hash={item.hash} />}</span>
    </li>)}</ol>}
    <p className="activity-footnote">Refusals never reach the chain, so they're kept in memory.</p>
  </section>
}
