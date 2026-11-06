import { Router } from 'express'
import { ARTISTS, ASSETS, type Activity, type ActivityItem, type ArtistId, type License } from '@clippass/shared'
import type { NoirEvent } from '@noirx402/agent-sdk'

export type AuthorizedPayment = Extract<NoirEvent, { type: 'payment.authorized' }>

/** The last 100 events. Refusals deliberately have no persistence or chain transaction. */
export class ActivityLog {
  private items = new Map<string, ActivityItem>()

  record(item: ActivityItem): void {
    this.items.set(item.id, { ...this.items.get(item.id), ...item })
    const newest = this.list()
    this.items = new Map(newest.map((entry) => [entry.id, entry]))
  }

  list(): ActivityItem[] {
    return [...this.items.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 100).map((item) => ({ ...item }))
  }

  recordPayment(event: AuthorizedPayment, payees: Record<ArtistId, string>): void {
    const id = (Object.keys(ARTISTS) as ArtistId[]).find((id) => payees[id] === event.merchant)
    // On-chain events name no asset, but artist plus price is unique in the catalog.
    const title = ASSETS.find((a) => a.artist === id && a.price === event.amount)?.title
    this.record({
      id: event.txHash, at: event.ledgerClosedAt, kind: 'paid', amount: event.amount.toString(),
      address: event.merchant, hash: event.txHash,
      ...(id ? { artist: ARTISTS[id].name } : {}), ...(title ? { title } : {}),
    })
  }

  recordLicense(license: License): void {
    // Normally watch arrives first (it also verifies the proof), but tolerate either order.
    this.record({
      id: license.hash, at: this.items.get(license.hash)?.at ?? new Date().toISOString(),
      kind: 'paid', amount: this.items.get(license.hash)?.amount ?? license.price,
      artist: license.artist, address: license.artistAddress,
      title: license.title, hash: license.hash,
    })
  }
}

export function activityRouter(d: { activity: ActivityLog }): Router {
  const r = Router()
  r.get('/api/activity', (_req, res) => {
    const result: Activity = { items: d.activity.list() }
    res.json(result)
  })
  return r
}
