import type { CSSProperties } from 'react'
import type { AssetType, DecisionAction } from '@clippass/shared'
import type { LaneState } from './format'
import { LANES } from './mirror'
import { PencilMark } from './PencilMark'
import { Edge } from './Edge'

const CAP = 1
const SCALE = 2.4

const STATE_TEXT: Partial<Record<DecisionAction, string>> = {
  skip: 'Skipped', refused: 'Refused by card', failed: 'Failed',
}

/** The lane gauge: each lane's top asset price against the card's per-payment limit. */
export function Lanes({ states = {} }: { states?: Partial<Record<AssetType, LaneState>> }) {
  return (
    <figure className="gauge" aria-label="Highest license price in each lane against the 1 XLM per-payment card limit">
      <div className="gauge-rows" style={{ '--cap': `${(CAP / SCALE) * 100}%` } as CSSProperties}>
        <div className="gauge-row gauge-head" aria-hidden="true">
          <span />
          <span className="gauge-track bare"><span className="gauge-limit">Card limit: 1 XLM per payment</span></span>
        </div>
        {LANES.map((l) => {
          const s = states[l.type]
          const text = s && (s.action === 'paid' ? `Paid ×${s.count}` : STATE_TEXT[s.action])
          return (
            <div key={l.type} className={`gauge-row ${s ? `is-${s.action}` : ''}`}>
              <span className="gauge-name"><Edge>{l.label}</Edge></span>
              <span className="gauge-track">
                <span className={`gauge-bar ${l.price > CAP ? 'over' : ''}`} style={{ width: `${(l.price / SCALE) * 100}%` }} />
              </span>
              <span className="gauge-price">{l.price > CAP ? <PencilMark>{l.price} XLM</PencilMark> : <>up to {l.price} XLM</>}</span>
              <span className="gauge-tag">{text && <strong className={`tag is-${s!.action}`}>{text}</strong>}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}
