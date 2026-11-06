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
import { sound } from './sound'
export function StartJob({ navigate }: { navigate: (url: string) => void }) {
  const [script, setScript] = useState('Rain at a night market in Manila, street food sizzle, crowd chatter')
  const [mood, setMood] = useState<string>('chill')
  const [budget, setBudget] = useState('2.5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
    <section className="hero"><h1>Your reel, licensed by an agent.</h1><p>Set a budget. It pays every artist per use.</p></section>
    <Reel frames={DEMO_REEL} mode="replay" label="A replay of a real Testnet reel: six licensed frames and the exclusive track refused by the card" />
    <div className="reel-notes">
      <span className="reel-links"><a className="replay-link" href={txLink(DEMO_REEL[1].hash!)} target="_blank" rel="noreferrer">Real Testnet replay <Icon name="external" /></a><a className="replay-link" href="/sample">Open the sample reel</a></span>
      <p className="reel-refusal"><PencilMark><Edge>Neon Crown, 2 XLM: refused by card, over_limit</Edge></PencilMark></p>
    </div>
    <ChainStrip />
    <Pipeline />
    <form className="leader-form" onSubmit={submit}>
      <div className="script-console">
        <label className="leader-field">Reel script<textarea value={script} onChange={e => setScript(e.target.value)} required maxLength={500} rows={3} aria-describedby="script-count" /></label>
        <span className="character-count" id="script-count"><Edge>{script.length + '/500'}</Edge></span>
        <div className="live-tags" aria-label="Matched script tags" aria-live="polite">{tags.length ? tags.map(tag => <span key={tag} className="tag-chip"><Edge>{tag}</Edge></span>) : <Edge>USING MOOD</Edge>}</div>
      </div>
      <fieldset className="mood-field"><legend>Mood</legend><div className="mood-segments">{MOODS.map(m => <label key={m}><input type="radio" name="mood" value={m} checked={mood === m} onChange={() => { setMood(m); sound.play('tick') }} /><span>{m}</span></label>)}</div></fieldset>
      <label className="budget-field">License budget in XLM (2 to 5)<output htmlFor="budget">{budget} <span>XLM</span></output><input id="budget" type="range" min="2" max="5" step="0.1" value={budget} style={{ '--fill': ((Number(budget) - 2) / 3 * 100) + '%' } as CSSProperties} onChange={e => { setBudget(e.target.value); sound.play('tick') }} /></label>
      <div className="checkout"><button type="submit" disabled={busy}>{busy ? 'Opening checkout…' : 'Start reel · 1 XLM'}</button><Edge>CHECKOUT BY VELO</Edge></div>
      {error && <p className="error" role="alert">{error}</p>}
      {import.meta.env.DEV && <button type="button" className="dev-reel" onClick={startTestReel} disabled={busy}>Run test reel without Velo (local only)</button>}
    </form>
    <Lanes />
  </div>
}
