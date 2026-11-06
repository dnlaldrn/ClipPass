# ClipPass design: migrating Tollbooth to per-reel stock media licensing

Date: 2026-11-06. Supersedes the product framing of `2026-11-04-tollbooth-design.md`; the payment rails in that spec still hold.

## Intent

A creator describes a reel (a script and a mood) and sets a budget. The agent picks background music, b-roll and sound
effects from a mock stock library and pays each artist per use from the Noir card escrow on Stellar Testnet. Every asset
arrives with a license tied to a Stellar tx. The card refuses a 2 XLM exclusive-rights track on every run.

Demo line: "This reel uses 6 assets from 4 artists. Here is the payment proof for every one. The agent tried an
exclusive track and the card said no."

Success: `npm run demo` on Testnet prints a license sheet of 6 assets from 4 distinct artist accounts, each with its own
tx link, plus an `over_limit` refusal for the exclusive track; the web job page shows the same.

## Decisions

| Question | Decision |
|---|---|
| Who gets paid | Each artist has a real Testnet account; the 402 quote names the artist's address. |
| Pricing | Per-asset prices that vary inside a lane, so "cheapest match" decides something. |
| Asset discovery | Shared catalog in `packages/shared` (approach A). No browse endpoint. |
| Ollama planner | Kept (opt-in via `AGENT_LLM`); it now reads the script and tags each slot. |
| Rename | Full: `@tollbooth/*` becomes `@clippass/*`, root package `clippass`. `DEVICE_UID` stays. |

Unchanged: the Noir policy and escrow, the Velo checkout and webhooks, the RPC shim, the job queue, `paidFetch`,
startup assertions, the one-job-at-a-time runner.

## 1. Data model (`packages/shared`)

`catalog.ts` replaces `EndpointName` and `CATALOG`:

```ts
export type AssetType = 'music' | 'broll' | 'sfx' | 'exclusive'
export type ArtistId = 'lowtide' | 'lantern' | 'kestrel' | 'fern'
export type Asset = { id: string; type: AssetType; title: string; artist: ArtistId; tags: string[]; price: bigint; preview: string }
export const MOODS = ['upbeat', 'chill', 'dramatic', 'cinematic'] as const
export type Mood = (typeof MOODS)[number]
export const ARTISTS: Record<ArtistId, { name: string }>
export const ASSETS: Asset[]
```

`POLICY_MAX` (1 XLM), `JOB_FEE` ('1.00'), `MIN_JOB_BUDGET` (2 XLM), `MAX_JOB_BUDGET` (5 XLM) and `QUOTE_TTL_MS` keep
their values. `MIN_JOB_BUDGET` must stay at or above the exclusive price so `decide` never skips the exclusive for
budget and the card refusal is always reached.

### Artists (fictional studios)

| id | name |
|---|---|
| lowtide | Lowtide Loops |
| lantern | Paper Lantern Films |
| kestrel | Kestrel Studio |
| fern | Foley Fern |

### Catalog

Preview links are `https://clippass.example/preview/<id>` (reserved example domain; media is mocked by design).

| id | type | title | artist | tags | price XLM |
|---|---|---|---|---|---|
| m-sunny | music | Sunny Side Loop | lowtide | upbeat | 0.15 |
| m-lofi | music | Low Tide Lo-fi | lowtide | chill | 0.18 |
| m-drift | music | Night Drift | lowtide | chill, cinematic | 0.22 |
| m-reveal | music | Big Reveal | kestrel | dramatic, cinematic | 0.30 |
| b-drizzle | broll | City Drizzle | kestrel | rain, city | 0.08 |
| b-beach | broll | Sunset Beach | lantern | beach, sunset | 0.09 |
| b-glass | broll | Rain on Glass | lantern | rain, night | 0.10 |
| b-market | broll | Night Market Lights | lantern | night, market, street | 0.12 |
| b-food | broll | Street Food Close-ups | kestrel | food, street, market | 0.15 |
| s-rain | sfx | Rain on Tin Roof | fern | rain | 0.03 |
| s-whoosh | sfx | Whoosh Transition | fern | whoosh | 0.04 |
| s-sizzle | sfx | Wok Sizzle | fern | sizzle, food | 0.05 |
| s-crowd | sfx | Market Crowd | fern | crowd, market | 0.07 |
| x-crown | exclusive | Neon Crown (exclusive rights) | kestrel | upbeat, chill, dramatic, cinematic | 2.00 |

A lane's tag vocabulary is the union of its assets' tags (derived, not a separate list). Music tags are exactly `MOODS`.

### Types (`types.ts`)

- `Decision`: `endpoint` becomes `assetId?: string` plus `assetType?: AssetType`; the rest is unchanged.
- `PaymentRecord` becomes `License = { assetId; assetType; title; artist: string /* display name */; artistAddress; price: string; hash; decision }`.
- `JobView`: `topic` becomes `script` and `mood`; `payments` becomes `licenses: License[]`.
- `Quote402` is unchanged; its `merchant` field now carries the artist's address.
- `ProofReason` is unchanged; `wrong_merchant` now means "paid someone other than the quote's artist".

## 2. Server (`apps/server`)

### Artist keys

- `scripts/setup.ts` creates and friendbot-funds `ARTIST_LOWTIDE_SECRET`, `ARTIST_LANTERN_SECRET`,
  `ARTIST_KESTREL_SECRET`, `ARTIST_FERN_SECRET` with the existing `keypair()` and `friendbot()` helpers, and prints
  each artist's account link. Owner, agent, device, policy and escrow steps are unchanged.
- `MERCHANT_SECRET` is retired from code, `.env.example`, and Render. Claim its pending balance once with the old
  `npm run claim` before switching.
- New `apps/server/src/artists.ts`: `loadArtists(env)` returns `Record<ArtistId, NoirSigner>` and throws
  `missing ARTIST_<ID>_SECRET; run npm run setup` if any is absent. Used by the server, `scripts/demo.ts` and
  `scripts/claim.ts`.

### Paid route (`merchant.ts`)

`GET /api/assets/:id` replaces `GET /api/data/:name`:

- Unknown id: 404 `{ error: 'unknown asset' }`.
- No `X-Payment`: issue a quote and answer 402 with the asset's own price and `merchant` = its artist's address.
- Valid proof: 200 with the license body built from the asset:
  `{ assetId, title, artist, licenseId: <tx hash>, download: 'https://clippass.example/download/<id>?tx=<hash>', terms: 'single use in one reel' }`.
- The `not_found` wait loop (`proofWaitMs`) is unchanged. `mockData.ts` is deleted.

`QuoteStore.issue(assetId, price, payee)` stores `{ quoteId, assetId, price, payee, expiresAt, consumed }`.

### Verifier (`verifier.ts`)

`createVerifier({ quotes, deviceHash, now? })` no longer takes a merchant. `verify(txHash, quoteId, assetId)` runs the
same checks in the same order, except the merchant check is `e.merchant !== q.payee` → `wrong_merchant`.

### Payment watch (`noirWatch.ts`)

`startPaymentWatch(noir, verifier, deviceHash)` filters with the SDK's `deviceHash` option instead of `merchant`, so
`payment.authorized` events to all four artists reach the verifier.

### Balances and claim (`claim.ts`)

- `GET /api/balances` → `{ escrow, artists: [{ id, name, address, pending }] }`.
- `POST /api/claim` ("Pay out artists"): for each artist with `pending > 0`, `noir.claim({ merchant: <artist signer>, token: XLM_SAC })`
  sequentially; `NothingToClaim` is skipped. Returns `{ claims: [{ artist, amount, hash }] }`, or 409
  `{ reason: 'NothingToClaim' }` when no claim was made. Any other error propagates (claims already sent are on-chain;
  the next balances call shows the truth).
- `scripts/claim.ts` runs the same loop and prints each claim link.

### Job creation (`velo.ts`, `jobs.ts`, dev route)

- `POST /api/jobs` requires `script` (trimmed, 1–500 chars) and `mood` in `MOODS`, plus the existing budget rule
  (2–5 XLM). Errors are 400 with plain messages.
- Velo description: `ClipPass reel project: <first 80 chars of script>`.
- `JobStore.create` takes `script` and `mood` instead of `topic`. The dev route defaults to the demo script and `chill`.
- Server log line: `clippass server on :<port>`.

## 3. Agent (`packages/agent`)

### Plan (`plan.ts`)

`makePlan(script, mood): Slot[]` where `Slot = { type: AssetType; tags: string[]; why: string }`. Seven slots, in
order: exclusive, music, broll ×3, sfx ×2. Exclusive goes first so the card refusal happens before budget is spent.

Rule tagging: split the lowercased script on non-letters; a lane tag matches a script word that starts with it
(`rainy` matches `rain`, `markets` matches `market`). Every b-roll slot gets all b-roll matches and every sfx slot gets
all sfx matches, so ranking and the duplicate rule (below) spread them across slots. Music and exclusive slots get
`[mood]`. A lane with no matches gets `[mood]` and its `why` says so.

### Pick (`pick.ts`, new)

`pick(slot, tried: Set<string>): { asset: Asset; why: string } | null`. Candidates are `ASSETS` of the slot's type not in
`tried`. Rank by tag overlap (descending), then price (ascending), then id (stable). The `why` names the choice and the
runner-up, e.g. `picked Wok Sizzle over Market Crowd: same match, 0.02 cheaper`. When the best-ranked asset overall is in
`tried` (licensed or attempted earlier in this reel), the `why` starts `Night Market Lights already used in this reel;
next best …`. Zero overlap: cheapest unused, `why` says `no tag match; cheapest unused`. No candidates: `null`.

### Decide (`decide.ts`)

`decide(asset, quotePrice, remaining)`:

1. `quotePrice > remaining` → skip, `over budget: price X > remaining Y XLM` (unchanged rule).
2. `quotePrice > asset.price` → skip, `quote X above listed Y XLM` (replaces the old value rule).
3. Otherwise pay.

### Run (`run.ts`)

`runAgent({ script, mood, budget, baseUrl, noir, agent, deviceHash, log, fetch?, delayMs?, planner? })`. Per slot:
`pick` → if `null`, log skip `no unused <type> left` → `paidFetch(${baseUrl}/api/assets/${id})` → `decide` →
`checkPayment` → `authorizePayment` → proof. Every attempted asset is added to `tried`, paid or not, so a failed asset
is never retried. Paid assets become `License` entries (artist display name from `ARTISTS`, `artistAddress` from the
quote). Error handling (`NoirContractError` → `failed`, merchant rejection → `failed`) is unchanged.

Summary, three lines:
`Licensed 6 assets from 4 artists: <titles>.` / `Spent 0.67 of 2.5 XLM.` /
`Refused by card: Neon Crown (exclusive rights) (exclusive, over_limit).` or `No card refusals.`

### LLM planner (`llm.ts`)

`Planner = (script, mood, slots) => Promise<Slot[]>`. `ollamaPlanner` sends the script (first 500 chars) and asks for one
tag per music, broll and sfx slot. Its JSON `format` schema sets each tag to an `enum` of that lane's vocabulary, and the
response is re-checked against the vocabulary; any tag outside it falls back to that slot's rule tags. The exclusive
slot is never sent or changed. Any failure (non-2xx, timeout, bad JSON) returns the rule slots unchanged and warns, as
today. `why` becomes `<model>: <reason, ≤120 chars>`.

`paidFetch` is unchanged.

## 4. Web, demo, rename, docs

### Web (`apps/web`)

- `StartJob.tsx`: script textarea (`maxLength` 500), mood `<select>` from `MOODS`, budget input (2–5 XLM). Button:
  `Pay reel project fee (1 XLM) with Velo`. Intro copy explains the 402 price, the budget, the 1 XLM card limit, and
  that the exclusive track is refused every time.
- `Lanes.tsx`: lanes Music, B-roll, SFX, Exclusive, each bar at the lane's highest price (0.3, 0.15, 0.07, 2), mirrored
  locally as today so the page does not bundle the Stellar SDK. Lane state is aggregated from the trace by `assetType`;
  the tag shows a count, e.g. `Paid ×3`, or `Refused by card`.
- `JobPage.tsx`: headline `This reel uses N assets from M artists` once licenses exist (the script shows beneath it).
  A **License sheet** table (asset title, type, artist, price, stellar.expert tx link) above **How the agent decided**
  (the existing trace list, with `/api/assets/<id>` in place of `/api/data/<name>`). Side panel: status, Velo, budget,
  card escrow, `Artists can claim` (sum of pending), and a **Pay out artists** button that lists one claim link per
  artist.
- `api.ts`: `createJob(script, mood, budget)`, the new balances and claim shapes.
- `index.html` title: `ClipPass`.

### Demo (`scripts/demo.ts`)

Runs one reel: script `Rain at a night market in Manila, street food sizzle, crowd chatter`, mood `chill`, budget
2.5 XLM. With the catalog above the rule plan licenses m-lofi, b-market, b-food, b-glass, s-sizzle, s-crowd (0.67 XLM
across lowtide, lantern, kestrel, fern) and is refused on x-crown. It prints the license sheet (title, artist, price, tx
link), then one claim per artist with pending earnings, then the summary. Setup checks are unchanged, except the
merchant key is replaced by the artist keys.

### Rename

`@tollbooth/shared`, `@tollbooth/agent`, `@tollbooth/web` and the server package become `@clippass/*`; the root
package becomes `clippass`. Every import, `package.json` and the lockfile (regenerated with `npm install`) change.
`DEVICE_UID` keeps its `TOLLBOOTH-DEMO-0001` default with a one-line comment: changing it registers a new device and
escrow.

### Docs

- README: new Problem, Solution and Pitch sections, the new flow, setup and env (artist secrets), and fresh Testnet
  proof copied from `npm run demo` output.
- `docs/architecture.md`: diagrams use `/api/assets/:id`, the four artist payees, and the device-filtered watch.
- `docs/screenshots/start.png` and `job.png` refreshed from the running app.
- The Tollbooth spec and plan stay as history.

### Deploy

Render: add the four `ARTIST_*_SECRET` values, remove `MERCHANT_SECRET`. Vercel: rebuild only.

## 5. Errors and tests

### Errors

| Case | Behavior |
|---|---|
| Missing artist secret at startup | Server, demo and claim exit with `run npm run setup`. |
| Unknown asset id | 404; `paidFetch` returns `rejected http_404`; agent logs `failed` and moves on. |
| No unused asset in a lane | Agent logs `skip` `no unused <type> left` and continues. |
| Ollama down, slow, or bad output | Rule slots, with a warning. |
| Bad script, mood or budget | 400 with a plain message. |
| One artist claim fails (not `NothingToClaim`) | Error propagates; earlier claims are already on-chain. |

### Tests (vitest)

- `shared.test.ts`: asset ids unique; every asset's artist exists; every non-exclusive price `< POLICY_MAX`; the
  exclusive price `> POLICY_MAX`; `MIN_JOB_BUDGET >= ` exclusive price; music tags are exactly `MOODS`.
- `agent.test.ts`: exclusive planned first; prefix tag matching; pick by overlap then price; no asset licensed twice in
  a reel and the `already used in this reel` reason appears; quote above listed → skip; over budget → skip; exclusive →
  `refused` `over_limit`; the demo script and mood yield exactly the six licenses listed above from four artists.
- `llm.test.ts`: per-slot tags applied; tags outside the vocabulary fall back; exclusive slot untouched; dead model and
  bad JSON return the rule slots.
- `merchant.test.ts`: 402 carries the asset's price and its artist's address; valid proof returns the license body;
  unknown id → 404.
- `verifier.test.ts`: event paid to a different artist than the quote's payee → `wrong_merchant`; existing cases keep
  passing with `assetId`.
- `quotes.test.ts`, `velo.test.ts`, `runner.test.ts`, `jobs.test.ts`: new fields; script and mood validation.
- `claim.test.ts` (new): claims each artist with pending earnings, skips `NothingToClaim`, 409 when no claim was made.

### Verification

`npm test`, `npx tsc -p tsconfig.json --noEmit` and `npx tsc -p apps/web/tsconfig.json --noEmit` pass. Then, with the user's go-ahead
because it sends Testnet transactions from their keys: `npm run setup` (funds the new artist accounts) and
`npm run demo`, whose output becomes the README's Testnet proof.
