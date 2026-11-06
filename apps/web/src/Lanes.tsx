import type { DecisionAction, EndpointName } from '@clippass/shared'

// Mirrors CATALOG prices and the 1 XLM Noir policy cap; kept here so the page doesn't bundle the Stellar SDK.
const LANES: { name: EndpointName; label: string; price: number }[] = [
  { name: 'weather', label: 'Weather', price: 0.05 },
  { name: 'quote', label: 'Market quote', price: 0.1 },
  { name: 'news', label: 'Headlines', price: 0.2 },
  { name: 'report', label: 'Deep report', price: 2 },
]
const CAP = 1
const SCALE = 2.4

const STATE_TEXT: Partial<Record<DecisionAction, string>> = {
  paid: 'Paid', skip: 'Skipped', refused: 'Refused by card', failed: 'Failed',
}

/** The lane board: each data call's price against the card's per-payment clearance bar. */
export function Lanes({ states = {} }: { states?: Partial<Record<EndpointName, DecisionAction>> }) {
  return (
    <figure className="lanes" aria-label="Price of each data call against the 1 XLM per-payment card limit">
      <div className="lanes-plot">
        <div className="clearance" style={{ bottom: `${(CAP / SCALE) * 100}%` }}>
          <span>Card limit: 1 XLM per payment</span>
        </div>
        {LANES.map((l) => (
          <div key={l.name} className={`lane ${states[l.name] ? `is-${states[l.name]}` : ''}`}>
            <div className={`bar ${l.price > CAP ? 'over' : ''}`} style={{ height: `${(l.price / SCALE) * 100}%` }}>
              <span className="price">{l.price} XLM</span>
            </div>
          </div>
        ))}
      </div>
      <div className="lanes-axis">
        {LANES.map((l) => {
          const text = states[l.name] && STATE_TEXT[states[l.name]!]
          return (
            <div key={l.name} className="lane-name">
              {l.label}
              {text && <strong className={`tag is-${states[l.name]}`}>{text}</strong>}
            </div>
          )
        })}
      </div>
    </figure>
  )
}
