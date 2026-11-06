import type { AssetType, DecisionAction } from '@clippass/shared'
import type { LaneState } from './format'
import { LANES } from './mirror'

const CAP = 1
const SCALE = 2.4

const STATE_TEXT: Partial<Record<DecisionAction, string>> = {
  skip: 'Skipped', refused: 'Refused by card', failed: 'Failed',
}

/** The lane board: each lane's top asset price against the card's per-payment clearance bar. */
export function Lanes({ states = {} }: { states?: Partial<Record<AssetType, LaneState>> }) {
  return (
    <figure className="lanes" aria-label="Highest license price in each lane against the 1 XLM per-payment card limit">
      <div className="lanes-plot">
        <div className="clearance" style={{ bottom: `${(CAP / SCALE) * 100}%` }}>
          <span>Card limit: 1 XLM per payment</span>
        </div>
        {LANES.map((l) => (
          <div key={l.type} className={`lane ${states[l.type] ? `is-${states[l.type]!.action}` : ''}`}>
            <div className={`bar ${l.price > CAP ? 'over' : ''}`} style={{ height: `${(l.price / SCALE) * 100}%` }}>
              <span className="price">{l.price < CAP ? 'up to ' : ''}{l.price} XLM</span>
            </div>
          </div>
        ))}
      </div>
      <div className="lanes-axis">
        {LANES.map((l) => {
          const s = states[l.type]
          const text = s && (s.action === 'paid' ? `Paid ×${s.count}` : STATE_TEXT[s.action])
          return (
            <div key={l.type} className="lane-name">
              {l.label}
              {text && <strong className={`tag is-${s!.action}`}>{text}</strong>}
            </div>
          )
        })}
      </div>
    </figure>
  )
}
