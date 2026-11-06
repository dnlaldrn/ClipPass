import { useEffect, useRef, useState } from 'react'
import { Edge } from './Edge'
import { Icon, type IconName } from './Icon'
const nodes: [IconName, string][] = [['quote', '402 QUOTE'], ['pick', 'AGENT PICKS'], ['card', 'CARD CHECK'], ['paid', 'PAID + LICENSED']]
export function Pipeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    let inView = false
    const update = () => setRunning(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update() })
    observer.observe(ref.current); document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  return <div ref={ref} className={'pipeline' + (running ? ' is-running' : '')} role="img" aria-label="Each asset returns a 402 quote. The agent picks a match, the card checks its limits, then the artist is paid and the asset licensed.">
    <span className="pipeline-runner" aria-hidden="true" />
    {nodes.map(([icon, label], i) => <div className="pipeline-node" style={{ '--node': i } as React.CSSProperties} key={label} aria-hidden="true"><span className="pipeline-icon"><Icon name={icon} /></span><Edge>{label}</Edge></div>)}
  </div>
}
