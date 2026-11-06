import { useState, type FormEvent } from 'react'
import { createJob } from './api'
import { Lanes } from './Lanes'
import { MOODS } from './mirror'
import { Reel } from './reel/Reel'
import { DEMO_REEL } from './reel/demo'
import { txLink } from './format'
import { PencilMark } from './PencilMark'

export function StartJob() {
  const [script, setScript] = useState('Rain at a night market in Manila, street food sizzle, crowd chatter')
  const [mood, setMood] = useState<string>('chill')
  const [budget, setBudget] = useState('2.5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      location.href = (await createJob(script, mood, budget)).checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="start">
      <section className="hero">
        <h1>Describe your reel and set a budget. The agent licenses the music, b-roll and sound effects, and pays each artist per use.</h1>
        <p className="intro">
          Every asset answers with <em>402 Payment Required</em> and its own price. The agent picks the cheapest asset
          that fits your script and mood, then checks the price against your budget and the card’s 1 XLM limit per
          payment. If both allow it, the agent pays that artist from the card’s escrow, and the payment is your license.
          The exclusive-rights track costs more than the card allows, so the card refuses it every time.
        </p>
      </section>

      <Reel frames={DEMO_REEL} mode="replay" label="A replay of a real Testnet reel: six licensed frames and the exclusive track refused by the card" />
      <div className="reel-notes">
        <p className="reel-caption">
          A replay of a real Testnet reel: 6 licenses from 4 artists, and Neon Crown refused by the card.{' '}
          <a href={txLink(DEMO_REEL[1].hash!)} target="_blank" rel="noreferrer">See the first license on stellar.expert</a>
        </p>
        <p className="reel-refusal">
          <span>Card limit: 1 XLM per payment</span>
          <PencilMark>Neon Crown, 2 XLM: refused by card, over_limit</PencilMark>
        </p>
      </div>

      <form className="leader-form" onSubmit={submit}>
        <label className="leader-field">
          Reel script
          <textarea value={script} onChange={(e) => setScript(e.target.value)} required maxLength={500} rows={2} />
        </label>
        <label>
          Mood
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>
          License budget in XLM (2 to 5)
          <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" required />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Opening checkout…' : 'Pay reel project fee (1 XLM) with Velo'}</button>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="hint">You pay the project fee once at checkout. After that, the agent decides every license itself.</p>
      </form>

      <Lanes />
    </div>
  )
}
