import request from 'supertest'
import { NOIR_TESTNET_CONTRACTS, type License } from '@clippass/shared'
import { ActivityLog, activityRouter, type AuthorizedPayment } from './activity'
import { createApp } from './app'

const PAYEES = { lowtide: 'GLOW', lantern: 'GLAN', kestrel: 'GKES', fern: 'GFERN' }
const event: AuthorizedPayment = {
  id: 'event1', type: 'payment.authorized', contractId: NOIR_TESTNET_CONTRACTS.paymentEscrow,
  ledger: 5000, ledgerClosedAt: '2026-11-06T00:00:00.000Z', txHash: 'tx1',
  deviceHash: 'ab'.repeat(32), merchant: PAYEES.lowtide, amount: 1_800_000n,
}
const license: License = {
  assetId: 'm-lofi', assetType: 'music', title: 'Low Tide Lo-fi', artist: 'Lowtide Loops',
  artistAddress: PAYEES.lowtide, price: '1800000', hash: 'tx1', licenseId: 'license1', terms: 'single use in one reel', decision: 'within policy',
}

test('a backfilled payment recovers its title from artist and price', () => {
  const activity = new ActivityLog()
  activity.recordPayment(event, PAYEES)
  expect(activity.list()[0]).toMatchObject({ title: 'Low Tide Lo-fi', artist: 'Lowtide Loops' })
  activity.recordPayment({ ...event, txHash: 'tx2', amount: 1n }, PAYEES)
  expect(activity.list().find((item) => item.id === 'tx2')?.title).toBeUndefined()
})

test('activity keeps at most 100 items, newest first, deduplicated by id', () => {
  const activity = new ActivityLog()
  for (let i = 104; i >= 0; i--) {
    activity.record({ id: `r${i}`, at: new Date(i * 1000).toISOString(), kind: 'refused', amount: '20000000', reason: 'over_limit' })
  }
  activity.record({ id: 'r104', at: new Date(104_000).toISOString(), kind: 'refused', amount: '20000000', title: 'Neon Crown' })
  const items = activity.list()
  expect(items).toHaveLength(100)
  expect(items[0]).toMatchObject({ id: 'r104', title: 'Neon Crown', reason: 'over_limit' })
  expect(items.at(-1)!.id).toBe('r5')
  expect(items.every((item) => item.hash === undefined)).toBe(true)
  items[0].title = 'mutated copy'
  expect(activity.list()[0].title).toBe('Neon Crown')
})

test('paid activity resolves artists by address and preserves titles across replay', () => {
  const activity = new ActivityLog()
  activity.recordPayment(event, PAYEES)
  activity.recordLicense(license)
  activity.recordPayment({ ...event, id: 'replayed-event' }, PAYEES)
  expect(activity.list()).toEqual([{
    id: 'tx1', at: event.ledgerClosedAt, kind: 'paid', amount: '1800000', artist: 'Lowtide Loops',
    address: PAYEES.lowtide, title: license.title, hash: 'tx1',
  }])
  // A late watch event must supply the chain timestamp without losing the license title.
  const late = new ActivityLog()
  late.recordLicense(license)
  late.recordPayment(event, PAYEES)
  expect(late.list()).toEqual(activity.list())
  const unknown = { ...event, txHash: 'other', merchant: 'GUNKNOWN' }
  activity.recordPayment(unknown, PAYEES)
  expect(activity.list().find((item) => item.id === 'other')).toMatchObject({ address: 'GUNKNOWN' })
  expect(activity.list().find((item) => item.id === 'other')!.artist).toBeUndefined()
})

test('activity API returns an empty or populated JSON timeline without bigint values', async () => {
  const activity = new ActivityLog()
  const app = createApp({ webOrigin: '*', routers: [activityRouter({ activity })] })
  expect((await request(app).get('/api/activity')).body).toEqual({ items: [] })
  activity.recordPayment(event, PAYEES)
  activity.record({ id: 'j:refused:1', at: '2026-11-06T00:00:01.000Z', kind: 'refused', amount: '20000000', reason: 'over_limit' })
  const res = await request(app).get('/api/activity')
  expect(res.status).toBe(200)
  expect(res.body.items.map((item: { id: string }) => item.id)).toEqual(['j:refused:1', 'tx1'])
  expect(res.body.items[1].amount).toBe('1800000')
  expect(new ActivityLog().list()).toEqual([]) // refusals belong to this process only
})
