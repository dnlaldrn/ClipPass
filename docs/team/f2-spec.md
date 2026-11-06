# F2: complete the site

Same world as `DESIGN.md`. Few words, real data only. Follow the hard limits in `AGENTS.md`. Code freeze is 8:00 AM.

## Shared contract

Add to `packages/shared/src/types.ts`. Web code imports these as types only.

```ts
export type CatalogItem = {
  id: string; type: AssetType; title: string; artistId: ArtistId; artist: string
  address: string; price: string; tags: string[]
}
export type Catalog = { cardLimit: string; assets: CatalogItem[] }

export type ActivityItem = {
  id: string; at: string; kind: 'paid' | 'refused'
  amount: string; artist?: string; address?: string; title?: string
  hash?: string; reason?: string
}
export type Activity = { items: ActivityItem[] }
```

`License` gains `licenseId: string` and `terms: string`. All amounts are stroop strings.

| Route | Result |
|---|---|
| `GET /api/catalog` | `Catalog` |
| `GET /api/activity` | `Activity`, newest first, at most 100 |
| `POST /api/jobs` | adds `503 { error }` when the card can't pay for a reel |
| Any unhandled error | `500 { error }`, JSON, never a stack or HTML |

## Stream A: server and agent (`apps/server`, `packages/agent`, `packages/shared`)

1. **JSON errors.** In `createApp`, add final error middleware. Log the error. Answer `500 { error: 'Something went wrong on the server. Try again.' }`. A malformed JSON body answers `400 { error: 'That request was not valid JSON.' }`. Unknown `/api/*` routes answer `404 { error: 'Not found.' }`.
2. **Balance cache.** `/api/balances` takes 5 to 8 seconds on Testnet. In `claimRouter`, cache the result for 10 seconds with one shared in-flight request. While a refresh runs, serve the last value at once. Clear the cache after a successful claim. If a refresh fails and a value exists, keep serving it. With no value, the error reaches the middleware.
3. **Low escrow.** `veloRouter` takes an optional `canStart: () => Promise<boolean>`, called after validation and before `checkout.sessions.create`. When false: `503 { error: 'The card is out of funds right now, so no checkout opened. You were not charged.' }`. When it throws: `503 { error: 'Stellar Testnet is not responding, so no checkout opened. You were not charged.' }`. `index.ts` wires it to `getEscrowBalance(deviceHash) >= toStroops('2')`, and the dev route uses the same check.
4. **License body.** In `packages/agent/src/run.ts`, read `licenseId` and `terms` from `result.data` of the paid response. Fall back to the tx hash and `'single use in one reel'` if they are missing.
5. **Catalog.** New `apps/server/src/catalog.ts` with `catalogRouter({ payees })`, built from `ASSETS`, `ARTISTS` and `POLICY_MAX`.
6. **Activity.** New `apps/server/src/activity.ts`: an `ActivityLog` class holding at most 100 items, de-duplicated by `id` (the tx hash for paid items), and `activityRouter`.
   - `startPaymentWatch` takes an optional `onPayment` callback, so `payment.authorized` events become `paid` items, with `artist` from the payee address.
   - On startup, backfill recent `payment.authorized` events with `noir.getEvents` for this device, through the same restored client. A backfill failure logs and is otherwise ignored. It must not block `app.listen` or stop the server.
   - `runJob` adds `refused` items from the trace, and fills `title` on `paid` items as licenses arrive.
   - Refused items live in memory only.

Tests for each of these, using the existing fake styles in `velo.test.ts`, `claim.test.ts` and `runner.test.ts`.

## Stream B: web core (`App.tsx`, `JobPage.tsx`, `api.ts`, new view files)

1. **Error boundary** around `<main>`: short message and a link home.
2. **Job page states.** Server unreachable: a message with Retry, on first load and after 3 failed polls. `veloStatus` of `failed`, `expired` or `cancelled`: stop polling, say so, link to a new reel. Status `paid`: `Waiting for the agent. Another reel may be finishing first.`
3. **`ChainStrip`:** show `…` while loading and `—` only after a failure.
4. **Routes:** `/library`, `/artists`, `/activity`, `/sample`, `/jobs/:id/receipt`, and a 404 page. Header nav with real `<a href>` links that use `navigate`, plain clicks only, active state, wraps on phones.
5. **`ReelView`:** split `JobPage` into data loading and a pure view taking `job`, `balances` and optional payout props.
6. **Sample reel:** `src/sample.ts` is a `JobView` built from the real reel in `src/reel/demo.ts` and the README: 6 licenses, 4 artists, 0.63 XLM, Neon Crown refused `over_limit`. Reasons must be true to that run. Use artist addresses from the README's Artist accounts list. `/sample` shows `ReelView` with no payout button and one line: `Recorded Testnet reel. Nothing here spends.` Add a clear link to it on the start page beside the replay link.
7. **Receipt:** `/jobs/:id/receipt` and `/sample/receipt`. Reel script, mood, date, each asset with artist, price, terms and tx link, total spent, refusal. A `Save as PDF` button using `window.print()`, and `Download JSON`. Print CSS hides the header, footer and buttons. Link it from `ReelView` once a reel has licenses.
8. Add `getCatalog` and `getActivity` to `api.ts` with the shared types.

## Stream C: new pages (`apps/web/src/pages/*`, `apps/web/src/pages.css`)

Each page handles loading, error with Retry, and empty states. Rule-drawn rows, no cards. Reuse `Identicon`, `Address`, `Hash`, `Edge`, `CountUp`, `Icon`, `Proof`, `xlm`, `txLink`, `accountLink`. Export `Library`, `Artists`, `Activity` from their own files.

- **`Library.tsx`:** heading `Library`. Lane filter as radio segments (All, Music, B-roll, SFX, Exclusive), search by title or tag, sort by price with a toggle. Rows: lane, title, tags, artist with identicon, price. A small bar shows price against the 1 XLM limit, using the gauge style. Neon Crown gets the pencil ring and `Over card limit`. Show the count. Filter clicks use `sound.play('tick')`.
- **`Artists.tsx`:** heading `Artists`. One row per studio from `getCatalog` plus `getBalances`: identicon, name, `Address`, asset count, cheapest to highest price, pending XLM. Expanding shows their assets. No lifetime totals.
- **`Activity.tsx`:** heading `Activity`. Timeline newest first: icon, kind, title or artist, amount, relative time, `Hash` link. Refused rows use pencil and show the reason. Poll every 5s, stop when the tab is hidden. New rows use the develop animation. Empty: `No agent payments yet.` Footnote: `Refusals never reach the chain, so they're kept in memory.`

## Done means

`AGENTS.md` Definition of Done passes. Works at 375px and 1440px with no horizontal scroll. Keyboard reachable with visible focus. Reduced motion respected. No new npm dependencies.
