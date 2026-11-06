import { useEffect, useState } from 'react'
import { getBalances } from './api'
import { CountUp } from './CountUp'
import { Edge } from './Edge'
export function ChainStrip() {
  const [artists, setArtists] = useState(4)
  const [escrow, setEscrow] = useState<string | null>(null)
  useEffect(() => {
    let alive = true, pending = false, last = -Infinity
    const tick = async () => {
      if (document.hidden || pending || Date.now() - last < 10_000) return
      pending = true; last = Date.now()
      try { const b = await getBalances(); if (alive) { setEscrow(b.escrow); setArtists(b.artists.length) } }
      catch { if (alive) setEscrow(null) }
      finally { pending = false }
    }
    void tick()
    const timer = setInterval(() => void tick(), 10_000)
    const visible = () => void tick()
    document.addEventListener('visibilitychange', visible)
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [])
  return <dl className="chain-strip">
    <div><dt><Edge>CARD ESCROW</Edge></dt><dd>{escrow === null ? '—' : <><CountUp value={escrow} /> XLM</>}</dd></div>
    <div><dt><Edge>CARD LIMIT</Edge></dt><dd>1 XLM</dd></div>
    <div><dt><Edge>ARTISTS</Edge></dt><dd><CountUp value={String(artists)} count /></dd></div>
  </dl>
}
