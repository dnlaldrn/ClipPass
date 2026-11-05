import { useState, type FormEvent } from 'react'
import { createJob } from './api'
import { Lanes } from './Lanes'

export function StartJob() {
  const [topic, setTopic] = useState('Stellar fees and the weather in Manila')
  const [budget, setBudget] = useState('2.5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      location.href = (await createJob(topic, budget)).checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="start">
      <section className="intro">
        <h1>Give the agent a topic and a budget. It decides what data is worth buying.</h1>
        <p>
          Each data call answers with <em>402 Payment Required</em> and a price. The agent checks that price against
          your budget and against the card’s spending policy. If both allow it, the agent pays from the card’s escrow
          and moves on. The deep report costs more than the card allows, so the card refuses it every time.
        </p>
      </section>
      <Lanes />
      <form className="job-form" onSubmit={submit}>
        <label>
          Research topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)} required maxLength={200} />
        </label>
        <label>
          Data budget in XLM (2 to 5)
          <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Opening checkout…' : 'Pay job fee (1 XLM) with Velo'}</button>
        <p className="hint">You pay the job fee once at checkout. After that, the agent decides every data purchase itself.</p>
      </form>
    </div>
  )
}
