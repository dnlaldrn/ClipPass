import { readFileSync } from 'node:fs'
import { ASSETS, ARTISTS } from '@clippass/shared'
import { DEMO_REEL } from './reel/demo'
import { reelFrames } from './reel/frames'
import { refusals, totalSpent } from './receipt'
import { SAMPLE_JOB } from './sample'

const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8')

test('the sample totals 0.63 XLM across 6 licenses and 4 artists, with one over_limit refusal', () => {
  expect(totalSpent(SAMPLE_JOB)).toBe(6_300_000n)
  expect(SAMPLE_JOB.licenses).toHaveLength(6)
  expect(new Set(SAMPLE_JOB.licenses.map(l => l.artistAddress)).size).toBe(4)
  expect(refusals(SAMPLE_JOB).map(d => [d.title, d.reason])).toEqual([['Neon Crown (exclusive rights)', 'over_limit']])
  expect(SAMPLE_JOB.budget).toBe('25000000')
  expect(SAMPLE_JOB.mood).toBe('chill')
  expect(readme).toContain(`script "${SAMPLE_JOB.script}", mood chill, budget 2.5 XLM`)
})

test('every license matches the catalog, the README and its own terms', () => {
  for (const l of SAMPLE_JOB.licenses) {
    const asset = ASSETS.find(a => a.id === l.assetId)!
    expect(l.title).toBe(asset.title)
    expect(BigInt(l.price)).toBe(asset.price)
    expect(l.artist).toBe(ARTISTS[asset.artist].name)
    expect(l.assetType).toBe(asset.type)
    expect(l.terms).toBe('single use in one reel')
    expect(l.licenseId).toBe(l.hash)
    expect(readme).toContain(`tx/${l.hash}`)
    expect(readme).toContain(`${l.artist}: https://stellar.expert/explorer/testnet/account/${l.artistAddress}`)
  }
})

test('trace reasons name only the asset’s own tags, each found in the script or mood', () => {
  const paid = SAMPLE_JOB.trace.filter(d => d.action === 'paid')
  expect(paid).toHaveLength(6)
  const words = (SAMPLE_JOB.script + ' ' + SAMPLE_JOB.mood).toLowerCase()
  for (const d of paid) {
    const asset = ASSETS.find(a => a.id === d.assetId)!
    const [, title, tags] = d.reason.match(/^picked (.+): matches (.+)$/)!
    expect(title).toBe(asset.title)
    for (const tag of tags.split(', ')) { expect(asset.tags).toContain(tag); expect(words).toContain(tag) }
  }
  expect(SAMPLE_JOB.trace.map(d => d.reason).join()).not.toMatch(/cheaper/)
})

test('the sample draws the same reel as the start page replay', () => {
  expect(reelFrames(SAMPLE_JOB.trace, SAMPLE_JOB.licenses)).toEqual(DEMO_REEL)
})
