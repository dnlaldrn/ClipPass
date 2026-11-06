import { useId, useState } from 'react'
import { getBalances, getCatalog } from '../api'
import { Address } from '../Address'
import { CountUp } from '../CountUp'
import { Edge } from '../Edge'
import { Identicon } from '../Identicon'
import { PencilMark } from '../PencilMark'
import { xlm } from '../format'
import { sound } from '../sound'
import { groupStudios, LANE_LABELS } from './catalog'
import { usePageData } from './usePageData'
import '../pages.css'

async function loadArtists() {
  const [catalog, balances] = await Promise.all([getCatalog(), getBalances()])
  return { studios: groupStudios(catalog.assets, balances), cardLimit: catalog.cardLimit }
}

export function Artists() {
  const { data, loading, error, retry } = usePageData(loadArtists)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const pageId = useId()
  function toggle(id: string) {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    sound.play('tick')
  }

  return <section className="directory-page artists-page" aria-labelledby={`${pageId}-heading`}>
    <header className="directory-heading"><h1 id={`${pageId}-heading`}>Artists</h1>
      {data && <span className="directory-count"><CountUp value={String(data.studios.length)} count /> studios</span>}
    </header>
    {loading && <p className="directory-state" role="status">Loading artists…</p>}
    {error && <div className="directory-state directory-error" role="alert">Artists unavailable.
      <button type="button" className="page-action" onClick={retry}>Retry</button>
    </div>}
    {!loading && !error && data && (data.studios.length === 0
      ? <p className="directory-state" role="status">No artists yet.</p>
      : <ul className="studio-rows" aria-label="Studios">{data.studios.map((studio, index) => {
        const open = expanded.has(studio.id)
        const assetsId = `${pageId}-assets-${index}`
        const cheapest = studio.assets[0], highest = studio.assets[studio.assets.length - 1]
        return <li key={studio.id} className="studio">
          <div className="studio-row">
            <div className="directory-identity"><Identicon address={studio.address} /><Address address={studio.address} name={studio.name} /></div>
            <dl className="studio-facts">
              <div><dt>Assets</dt><dd>{studio.assets.length}</dd></div>
              <div><dt>Price range</dt><dd>{cheapest && highest ? `${xlm(cheapest.price)}–${xlm(highest.price)} XLM` : '—'}</dd></div>
              <div><dt>Pending</dt><dd>{studio.pending === null ? '—' : <><CountUp value={studio.pending} /> XLM</>}</dd></div>
            </dl>
            <button type="button" className="page-action studio-toggle" aria-expanded={open} aria-controls={assetsId}
              aria-label={`${open ? 'Hide' : 'Show'} assets by ${studio.name}`} onClick={() => toggle(studio.id)}>
              Assets <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path d={open ? 'm5 15 7-7 7 7' : 'm5 9 7 7 7-7'} /></svg>
            </button>
          </div>
          <div id={assetsId} hidden={!open} className="studio-assets">
            {studio.assets.length === 0 ? <p className="directory-state">No assets yet.</p>
              : <ul aria-label={`${studio.name} assets`}>{studio.assets.map(asset => {
                const over = BigInt(asset.price) > BigInt(data.cardLimit)
                return <li className="studio-asset" key={asset.id}>
                  <span className="catalog-lane"><Edge>{LANE_LABELS[asset.type]}</Edge></span>
                  <strong>{asset.title}</strong>
                  <span className={over ? 'catalog-refusal' : 'directory-money'}>{over
                    ? <PencilMark>{xlm(asset.price)} XLM</PencilMark> : `${xlm(asset.price)} XLM`}</span>
                </li>
              })}</ul>}
          </div>
        </li>
      })}</ul>)}
  </section>
}
