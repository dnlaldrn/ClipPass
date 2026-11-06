import type { JobView } from '@clippass/shared'
import { MEDIA_NOTE, receiptJson, reelDate, totalSpent } from './receipt'
import { SAMPLE_JOB } from './sample'

test('receipt JSON carries the reel, every license, the total and the refusal', () => {
  const r = JSON.parse(receiptJson(SAMPLE_JOB))
  expect(r).toMatchObject({
    jobId: 'sample', network: 'stellar-testnet', script: SAMPLE_JOB.script, mood: 'chill', date: '2026-11-07', status: 'done',
    budget: { stroops: '25000000', xlm: '2.5' }, totalSpent: { stroops: '3500000', xlm: '0.35' }, note: MEDIA_NOTE,
  })
  expect(r.licenses).toHaveLength(3)
  expect(r.licenses[0]).toEqual({
    licenseId: SAMPLE_JOB.licenses[0].hash, assetId: 'm-lofi', type: 'music', title: 'Low Tide Lo-fi', artist: 'Lowtide Loops',
    artistAddress: SAMPLE_JOB.licenses[0].artistAddress, price: { stroops: '1800000', xlm: '0.18' }, terms: 'single use in one reel',
    hash: SAMPLE_JOB.licenses[0].hash, tx: `https://stellar.expert/explorer/testnet/tx/${SAMPLE_JOB.licenses[0].hash}`,
  })
  expect(r.refusals).toEqual([{ assetId: 'x-crown', type: 'exclusive', title: 'Neon Crown (exclusive rights)', price: { stroops: '20000000', xlm: '2' }, reason: 'over_limit' }])
})

test('the total stays exact above Number precision', () => {
  const price = '9007199254740993'
  const job = { ...SAMPLE_JOB, licenses: [{ ...SAMPLE_JOB.licenses[0], price }, { ...SAMPLE_JOB.licenses[0], price }] }
  expect(totalSpent(job)).toBe(18014398509481986n)
  expect(JSON.parse(receiptJson(job)).totalSpent).toEqual({ stroops: '18014398509481986', xlm: '1801439850.9481986' })
})

test('a reel with no decisions has no date and an empty receipt', () => {
  const job: JobView = { ...SAMPLE_JOB, trace: [], licenses: [] }
  expect(reelDate(job)).toBeNull()
  expect(JSON.parse(receiptJson(job))).toMatchObject({ date: null, licenses: [], refusals: [], totalSpent: { stroops: '0', xlm: '0' } })
})
