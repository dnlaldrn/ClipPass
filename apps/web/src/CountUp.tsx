import { useEffect, useRef, useState } from 'react'
import { xlm } from './format'
/** Interpolate stroops as bigint; the final label always uses the exact formatter. */
export function CountUp({ value, count = false }: { value: string; count?: boolean }) {
  const current = useRef(BigInt(value))
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const target = BigInt(value), from = current.current
    if (typeof matchMedia === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target; setShown(value); return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 450)
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      current.current = from + (target - from) * BigInt(Math.round(ease * 1_000_000)) / 1_000_000n
      setShown(t === 1 ? value : current.current.toString())
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="count-up" aria-label={count ? value : xlm(value)}><span aria-hidden="true">{count ? shown : xlm(shown)}</span></span>
}
