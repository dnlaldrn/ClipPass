import { useState, type FormEvent } from 'react'
import { createJob } from './api'
import { Lanes } from './Lanes'
import { MOODS } from './mirror'

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
      <section className="intro">
        <h1>Describe your reel and set a budget. The agent licenses the music, b-roll and sound effects, and pays each artist per use.</h1>
        <p>
          Every asset answers with <em>402 Payment Required</em> and its own price. The agent picks the cheapest asset
          that fits your script and mood, then checks the price against your budget and the card’s 1 XLM limit per
          payment. If both allow it, the agent pays that artist from the card’s escrow, and the payment is your license.
          The exclusive-rights track costs more than the card allows, so the card refuses it every time.
        </p>
      </section>
      <Lanes />
      <form className="job-form" onSubmit={submit}>
        <label>
          Reel script
          <textarea value={script} onChange={(e) => setScript(e.target.value)} required maxLength={500} rows={3} />
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
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Opening checkout…' : 'Pay reel project fee (1 XLM) with Velo'}</button>
        <p className="hint">You pay the project fee once at checkout. After that, the agent decides every license itself.</p>
      </form>
    </div>
  )
}
