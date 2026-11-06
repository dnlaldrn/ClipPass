import { useEffect, useRef, useState } from 'react'
import { Edge } from './Edge'
import { Icon } from './Icon'
export function Proof({ value, href, kind, name }: { value: string; href: string; kind: string; name?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1200)
    } catch { /* Clipboard permissions may be unavailable; explorer still exposes the value. */ }
  }
  return <span className="identity-proof">
    {name && <a className="artist-name" href={href} target="_blank" rel="noreferrer">{name}</a>}
    <span className="proof-tools">
      <a href={href} target="_blank" rel="noreferrer" title={value} aria-label={kind + ' ' + value}><Edge>{value.slice(0, 4) + '…' + value.slice(-4)}</Edge></a>
      <button className="icon-button" type="button" onClick={copy} aria-label={copied ? kind + ' copied' : 'Copy ' + kind}><Icon name={copied ? 'check' : 'copy'} /></button>
      <a className="icon-button" href={href} target="_blank" rel="noreferrer" aria-label={'View ' + kind + ' on Stellar Testnet explorer'}><Icon name="external" /></a>
    </span>
    <span className="sr-only" role="status">{copied ? 'Copied' : ''}</span>
  </span>
}
