import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import { createDevJob, createJob } from './api'
import { Lanes } from './Lanes'
import { MOODS } from './mirror'
import { Reel } from './reel/Reel'
import { DEMO_REEL } from './reel/demo'
import { matchTags, txLink } from './format'
import { PencilMark } from './PencilMark'
import { Edge } from './Edge'
import { Icon } from './Icon'
import { ChainStrip } from './ChainStrip'
import { Pipeline } from './Pipeline'
import { MusicHero } from './MusicHero'
import { sound } from './sound'
const EXAMPLE_SCRIPT = 'A rainy night market in Manila with soft lo-fi and street-food sounds.'

export function StartJob({ navigate }: { navigate: (url: string) => void }) {
  const [script, setScript] = useState('')
  const [mood, setMood] = useState<string>('chill')
  const [budget, setBudget] = useState('2.5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const scriptInput = useRef<HTMLTextAreaElement>(null)
  const cancelled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('checkout-cancelled')
  const tags = matchTags(script)
  const previousTags = useRef(tags)
  const tagKey = tags.join('|')
  useEffect(() => {
    if (tags.some(tag => !previousTags.current.includes(tag))) sound.play('tick')
    previousTags.current = tags
  }, [tagKey]) // tags are deterministic from tagKey
  async function submit(e: FormEvent) {
    e.preventDefault(); sound.play('press'); setBusy(true); setError(null)
    try { location.href = (await createJob(script, mood, budget)).checkoutUrl }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) }
  }
  async function startTestReel(e: MouseEvent<HTMLButtonElement>) {
    if (!e.currentTarget.form?.reportValidity()) return
    sound.play('press'); setBusy(true); setError(null)
    try { navigate('/jobs/' + (await createDevJob(script, mood, budget)).jobId) }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) }
  }
  return <div className="start">
    <section className="studio-hero" aria-labelledby="composer-title">
    <header className="hero composer-hero"><h1 id="composer-title">Describe your reel</h1><p>Give your agent a scene. It finds and licenses the music, sound effects, and footage.</p></header>
    <form className="reel-composer" onSubmit={submit}>
      {cancelled && <p className="hint" role="status">Checkout closed. You can start a new checkout below.</p>}
      <div className="composer-surface">
        <label className="sr-only" htmlFor="reel-script">Reel script</label>
        <textarea id="reel-script" ref={scriptInput} placeholder={EXAMPLE_SCRIPT} value={script} onChange={e => setScript(e.target.value)} required maxLength={500} rows={3} aria-describedby="script-count" />
        <div className="composer-meta">
          <button className="example-prompt" type="button" onClick={() => { setScript(EXAMPLE_SCRIPT); scriptInput.current?.focus() }}>Use this example</button>
          <span id="script-count">{script.length}/500</span>
        </div>
        <div className="composer-toolbar">
          <details className="composer-option" name="reel-settings">
            <summary>Mood · <span>{mood}</span><span aria-hidden="true">⌄</span></summary>
            <fieldset className="mood-field"><legend className="sr-only">Mood</legend><div className="mood-segments">{MOODS.map(m => <label key={m}><input type="radio" name="mood" value={m} checked={mood === m} onChange={() => { setMood(m); sound.play('tick') }} /><span>{m}</span></label>)}</div></fieldset>
          </details>
          <details className="composer-option" name="reel-settings">
            <summary>Budget · {budget} XLM <span aria-hidden="true">⌄</span></summary>
            <label className="budget-field">License budget<output htmlFor="budget">{budget} <span>XLM</span></output><input id="budget" type="range" min="2" max="5" step="0.1" value={budget} style={{ '--fill': ((Number(budget) - 2) / 3 * 100) + '%' } as CSSProperties} onChange={e => { setBudget(e.target.value); sound.play('tick') }} /></label>
          </details>
          <button className="composer-send" type="submit" aria-describedby="payment-terms" disabled={busy}>{busy ? 'Opening checkout…' : 'Continue to Velo checkout · 1 XLM'}{!busy && <span aria-hidden="true">→</span>}</button>
        </div>
      </div>
      <div className="live-tags" aria-label="Matched script tags" aria-live="polite">{tags.map(tag => <span key={tag} className="tag-chip"><Edge>{tag}</Edge></span>)}</div>
      <p id="payment-terms">You pay the 1 XLM project fee. The agent pays artists from Noir escrow, within your budget and up to 1 XLM per purchase.</p>
      {error && <p className="error" role="alert">{error}</p>}
      {import.meta.env.DEV && <details className="composer-dev">
        <summary>Local testing</summary>
        <button type="button" className="dev-reel" onClick={startTestReel} disabled={busy}>Run Testnet reel without Velo</button>
      </details>}
    </form>
    <MusicHero />
    </section>
    <section className="recorded-reel" aria-labelledby="recorded-title">
      <div className="reel-notes">
        <h2 id="recorded-title">Recorded Testnet run</h2>
        <span className="reel-links"><a href="/sample">View sample reel</a><a href={txLink(DEMO_REEL[1].hash!)} target="_blank" rel="noreferrer">View on Stellar <Icon name="external" /></a></span>
      </div>
      <Reel frames={DEMO_REEL} mode="replay" label="Recorded Testnet reel with six licensed assets and one refused purchase" />
      <p className="reel-refusal"><PencilMark><Edge>Neon Crown, 2 XLM: refused by card, over_limit</Edge></PencilMark></p>
    </section>
    <ChainStrip />
    <Pipeline />
    <Lanes />
  </div>
}
