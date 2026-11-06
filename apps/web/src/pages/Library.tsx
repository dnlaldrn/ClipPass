import { useId, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getCatalog } from '../api'
import { Address } from '../Address'
import { CountUp } from '../CountUp'
import { Edge } from '../Edge'
import { Identicon } from '../Identicon'
import { PencilMark } from '../PencilMark'
import { xlm } from '../format'
import { sound } from '../sound'
import { filterLibrary, gaugePercent, gaugeScale, LANE_LABELS } from './catalog'
import type { LaneFilter, PriceOrder } from './catalog'
import { usePageData } from './usePageData'
import '../pages.css'

const FILTERS: { value: LaneFilter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'music', label: 'Music' },
  { value: 'broll', label: 'B-roll' }, { value: 'sfx', label: 'SFX' },
  { value: 'exclusive', label: 'Exclusive' },
]

export function Library() {
  const { data, loading, error, retry } = usePageData(getCatalog)
  const [lane, setLane] = useState<LaneFilter>('all')
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<PriceOrder>('asc')
  const filterId = useId()
  const assets = useMemo(() => filterLibrary(data?.assets ?? [], lane, query, order), [data, lane, query, order])
  const scale = data ? gaugeScale(data.assets, data.cardLimit) : 1n

  return <section className="directory-page library-page" aria-labelledby={`${filterId}-heading`}>
    <header className="directory-heading">
      <h1 id={`${filterId}-heading`}>Library</h1>
      {data && <span className="directory-count" role="status"><CountUp value={String(assets.length)} count /> / {data.assets.length} assets</span>}
    </header>
    <div className="library-controls">
      <fieldset className="lane-filter">
        <legend className="sr-only">Filter by lane</legend>
        <div className="lane-segments">{FILTERS.map(filter => <label key={filter.value}>
          <input type="radio" name={filterId} value={filter.value} checked={lane === filter.value}
            onChange={() => { setLane(filter.value); sound.play('tick') }} />
          <span>{filter.label}</span>
        </label>)}</div>
      </fieldset>
      <label className="library-search"><span className="sr-only">Search by title or tag</span>
        <input type="search" placeholder="Search title or tag" value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <button type="button" className="page-action price-sort" aria-label={`Price: ${order === 'asc' ? 'lowest' : 'highest'} first. Sort ${order === 'asc' ? 'highest' : 'lowest'} first`}
        onClick={() => { setOrder(order === 'asc' ? 'desc' : 'asc'); sound.play('tick') }}>
        Price {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>
    {loading && <p className="directory-state" role="status">Loading library…</p>}
    {error && <div className="directory-state directory-error" role="alert">Library unavailable.
      <button type="button" className="page-action" onClick={retry}>Retry</button>
    </div>}
    {!loading && !error && data && <>
      <p className="hint">Demo media catalog. License payments use Stellar Testnet.</p>
      <div className="directory-rule-heading"><span>{lane === 'all' ? 'All lanes' : LANE_LABELS[lane]}</span>
        <span>Card limit · {xlm(data.cardLimit)} XLM</span>
      </div>
      {assets.length === 0 ? <p className="directory-state" role="status">{data.assets.length ? 'No matching assets.' : 'No assets yet.'}</p>
        : <ul className="catalog-rows" aria-label="Assets">{assets.map(asset => {
          const over = BigInt(asset.price) > BigInt(data.cardLimit)
          return <li className="catalog-row" key={asset.id}>
            <span className="catalog-lane"><Edge>{LANE_LABELS[asset.type]}</Edge></span>
            <div className="catalog-title"><h2>{asset.title}</h2>
              {asset.tags.length > 0 && <ul className="catalog-tags" aria-label="Tags">{asset.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
            </div>
            <div className="directory-identity"><Identicon address={asset.address} /><Address address={asset.address} name={asset.artist} /></div>
            <div className={`catalog-price${over ? ' is-over-limit' : ''}`}>
              <strong>{over ? <PencilMark>{xlm(asset.price)} XLM</PencilMark> : <>{xlm(asset.price)} XLM</>}</strong>
              <span className="catalog-gauge" aria-hidden="true" style={{ '--limit-position': `${gaugePercent(data.cardLimit, scale)}%` } as CSSProperties}>
                <span style={{ width: `${gaugePercent(asset.price, scale)}%` }} />
              </span>
              {over && <span className="catalog-refusal">Over card limit</span>}
            </div>
          </li>
        })}</ul>}
    </>}
  </section>
}
