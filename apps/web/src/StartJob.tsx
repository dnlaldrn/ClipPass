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
import { ComposerPopover } from './ComposerPopover'
import { sound } from './sound'
const EXAMPLE_SCRIPT = 'A rainy night market in Manila with soft lo-fi and street-food sounds.'
const HEADLINES = ['Score your reel', 'License your soundtrack', 'Pay artists per use']
const HEADLINE_TRANSITIONS = ['morph', 'swipe', 'flip']
const METER_HEIGHTS = [.22, .48, .72, .42, .88, .56, .31]

export function StartJob({ navigate }: { navigate: (url: string) => void }) {
  const [script, setScript] = useState('')
  const [mood, setMood] = useState<string>('chill')
  const [budget, setBudget] = useState('2.5')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const scriptInput = useRef<HTMLTextAreaElement>(null)
  const homepage = useRef<HTMLDivElement>(null)
  const cancelled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('checkout-cancelled')
  const tags = matchTags(script)
  const previousTags = useRef(tags)
  const tagKey = tags.join('|')
  useEffect(() => {
    if (tags.some(tag => !previousTags.current.includes(tag))) sound.play('tick')
    previousTags.current = tags
  }, [tagKey]) // tags are deterministic from tagKey
  useEffect(() => {
    if (!homepage.current || !('IntersectionObserver' in window)) return
    const sections = [...homepage.current.querySelectorAll('.music-hero, .recorded-reel, .process-section')]
      .filter(section => section.getBoundingClientRect().top >= window.innerHeight)
    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue
        target.classList.remove('reveal-pending')
        observer.unobserve(target)
      }
    }, { threshold: 0.06 })
    for (const section of sections) {
      section.classList.add('reveal-pending')
      observer.observe(section)
    }
    return () => {
      observer.disconnect()
      sections.forEach(section => section.classList.remove('reveal-pending'))
    }
  }, [])
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
  return <div className="start" ref={homepage}>
    <section className="studio-hero" aria-labelledby="composer-title">
      <header className="hero composer-hero">
        <p className="studio-kicker"><Edge>ClipPass Studio</Edge></p>
        <h1 id="composer-title" className="score-title" aria-label="Score your reel">
          {HEADLINES.map((headline, phrase) => <span key={headline} className="score-label" data-transition={HEADLINE_TRANSITIONS[phrase]} style={{ '--phrase-delay': `${phrase * 5 - 16}s` } as CSSProperties} aria-hidden="true">
            {headline.split(' ').map((word, wordIndex) => <span className="score-token" key={wordIndex}>
              {[...word].map((letter, index) => <span key={index} className="score-letter" style={{
                '--meter-height': METER_HEIGHTS[(index + wordIndex * 3) % METER_HEIGHTS.length],
                '--sweep-offset': `${(wordIndex * 6 + index) * 18}ms`,
              } as CSSProperties}>{letter}</span>)}
            </span>)}
          </span>)}
        </h1>
        <p>Describe a scene. Your agent finds and licenses the music, sound effects, and footage.</p>
      </header>
      <form className="reel-composer" onSubmit={submit}>
        {cancelled && <p className="hint" role="status">Checkout closed. You can start a new checkout below.</p>}
        <div className="composer-surface">
          <label className="sr-only" htmlFor="reel-script">Reel script</label>
          <div className="composer-input">
            <textarea id="reel-script" ref={scriptInput} placeholder={EXAMPLE_SCRIPT} value={script} onChange={e => setScript(e.target.value)} required maxLength={500} rows={3} aria-describedby="script-count" />
            {!script && <div className="composer-example">
              <span aria-hidden="true">{EXAMPLE_SCRIPT}</span>{' '}
              <button className="example-prompt" type="button" aria-label="Try this example prompt" onClick={() => { setScript(EXAMPLE_SCRIPT); scriptInput.current?.focus() }}>Try this <span aria-hidden="true">↗</span></button>
            </div>}
          </div>
          <div className="composer-meta">
            <span id="script-count">{script.length}/500</span>
          </div>
          <div className="composer-toolbar">
            <ComposerPopover label={`Mood · ${mood[0].toUpperCase()}${mood.slice(1)}`}>
              <fieldset className="mood-field"><legend>Mood</legend><div className="mood-segments">{MOODS.map(value => <label key={value}><input type="radio" name="mood" value={value} checked={mood === value} onChange={() => { setMood(value); sound.play('tick') }} /><span>{value}</span></label>)}</div></fieldset>
            </ComposerPopover>
            <ComposerPopover label={`Budget · ${budget} XLM`}>
              <label className="budget-field">License budget<output htmlFor="budget">{budget} <span>XLM</span></output><input id="budget" aria-label="License budget" type="range" min="2" max="5" step="0.1" value={budget} style={{ '--fill': ((Number(budget) - 2) / 3 * 100) + '%' } as CSSProperties} onChange={e => { setBudget(e.target.value); sound.play('tick') }} /></label>
            </ComposerPopover>
            <button className="composer-send" type="submit" aria-describedby="payment-terms" disabled={busy}>{busy ? 'Opening checkout…' : 'Velo checkout · 1 XLM'}{!busy && <span aria-hidden="true">→</span>}</button>
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
    </section>
    <MusicHero />
    <section className="recorded-reel" aria-labelledby="recorded-title">
      <div className="reel-notes">
        <div><p className="section-kicker"><Edge>Payment proof</Edge></p><h2 id="recorded-title">Recorded Testnet run</h2></div>
        <span className="reel-links"><a href="/sample">View sample reel</a><a href={txLink(DEMO_REEL[1].hash!)} target="_blank" rel="noreferrer">View on Stellar <Icon name="external" /></a></span>
      </div>
      <Reel frames={DEMO_REEL} mode="replay" label="Recorded Testnet reel with six licensed assets and one refused purchase" />
      <div className="recorded-proof">
        <p className="reel-refusal"><PencilMark><Edge>Neon Crown, 2 XLM: refused by card, over_limit</Edge></PencilMark></p>
        <ChainStrip />
      </div>
    </section>
    <section className="process-section" aria-labelledby="process-title">
      <h2 id="process-title">How the agent pays</h2>
      <Pipeline />
      <Lanes />
    </section>
  </div>
}
