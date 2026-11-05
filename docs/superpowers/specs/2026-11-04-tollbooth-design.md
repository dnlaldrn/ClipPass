# Build: Tollbooth — an agent that pays per API call on Stellar Testnet

## What it is
A live web app where a user buys a "research job" through a Velo checkout. When Velo confirms the
payment, an agent runs the job. It buys data from a paid merchant API one call at a time, using an
x402-style `402 Payment Required` handshake. The agent pays each call itself through a Noir card's
constrained agent key. It decides on its own whether to buy a call, which one, and how much to spend.
The owner's Noir policy caps every payment, and one deliberate over-cap purchase is refused.

Data is mocked. The payment rail is real (Stellar Testnet only, no real funds ever).

## Non-negotiable requirements (the project is disqualified if any are missed)
1. **Agentic payment:** the agent alone decides when, whom and how much to pay. No human "Pay" click
   triggers a Noir payment.
2. **Noir, strictly through `@noirx402/agent-sdk`, on the deployed 2026-10-24 Testnet contracts:**
   - device_registry `CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5`
   - agent_registry `CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV`
   - payment_escrow `CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS`
   These are the SDK's built-in `TESTNET` defaults: construct `new NoirAgentClient()` and do NOT pass
   contract-ID overrides. Add a startup assertion that the client's configured IDs equal the three above.
   Never build or submit Noir contract calls with `@stellar/stellar-sdk` directly; never deploy copies.
   `@stellar/stellar-sdk` (v16, peer dep) is allowed only for keypairs, friendbot funding, Horizon
   balance reads and `Asset.native().contractId(Networks.TESTNET)`.
3. **Velo (`@carts1024/velo-sdk`, pinned exactly to `0.1.0-alpha.4`, the `@alpha` dist-tag; do not
   take `latest`/1.0.0)** for the rest of the app:
   checkout sessions, payment-intent status and signed `payment.succeeded` webhooks. Server-side only.
4. **Stellar Testnet** only.
5. **Public GitHub monorepo** with the judging README (template at the bottom, every section filled).
6. **Live website** at a public URL (localhost does not count).

Node must satisfy the Noir SDK engines: `^22.23.4`, `^24.22.1` or `>=26.12.1`. Use **24.22.1**: pin it
in `.nvmrc`, in root `engines` (`"node": ">=24.22.1 <25"`), and in the Render/Railway service's Node
version. The dev machine currently runs 24.11.0 and must be upgraded before `npm install`.

## Monorepo layout (npm workspaces; `npm install` at root installs everything)
```
tollbooth/
├── apps/
│   ├── web/        # Vite + React live site: start a job, watch the agent, payment log, Testnet links
│   └── server/     # Express: merchant paid API, Velo checkout + webhook, Noir event relay, agent runner
├── packages/
│   ├── agent/      # decision logic + paidFetch(); all Noir SDK calls for paying live here
│   └── shared/     # types, prices, asset id, contract-ID constants (for the assertion), env schema
├── scripts/        # setup.ts (rebuild Testnet state), claim.ts
├── docs/           # architecture diagram, screenshots
├── .env.example
├── package.json    # declares workspaces
└── README.md
```

## Accounts and setup (`scripts/setup.ts`, idempotent, safe to rerun after a Testnet reset)
- Create or load three Testnet keypairs (owner, agent, merchant) and fund each with friendbot.
  The agent pays its own Soroban fees (the first tap is about 2.3 XLM), so it must keep XLM.
- Through the Noir SDK with the owner as `keypairSigner(OWNER_SECRET)`. These are not client methods;
  each runs through `noir.execute(owner, { kind, ... })`:
  `{ kind: 'registerDevice', deviceHash, agent }` (deviceHash = 64-char hex SHA-256 of a typed demo
  card UID; no NFC hardware) →
  `{ kind: 'registerAgent', deviceHash, agent, asset, maxAmount: toStroops('1'), expiresAt }` (asset =
  native XLM SAC, `expiresAt` = a `Date` 30 days out) →
  `{ kind: 'fundEscrow', deviceHash, token: asset, amount: toStroops('20') }`.
- Idempotency: skip `registerDevice` if `getDeviceOwner(deviceHash)` is already the owner, skip
  `registerAgent` if `getPolicy(deviceHash)` already matches, and top up the escrow only when
  `getEscrowBalance(deviceHash)` is below 10 XLM.
- Print the public keys, the deviceHash and stellar.expert links. Write the secrets to `.env`, never
  to code or git.

## Merchant paid API (`apps/server`)
| Endpoint | Price | Purpose |
|---|---|---|
| `GET /api/data/quote` | 0.1 XLM | mock market quote |
| `GET /api/data/weather` | 0.05 XLM | mock weather |
| `GET /api/data/news` | 0.2 XLM | mock headlines |
| `GET /api/data/report` | 2 XLM | above the 1 XLM cap; shows the policy refusal |

- A request without proof gets **402** with JSON
  `{ quoteId, price (stroops string), asset, merchant, network: "testnet", expiresAt }`.
  `quoteId` is random, stored server-side, single-use, and valid for 2 minutes.
- A retry with header `X-Payment: <tx hash>` is verified **through the Noir SDK**, not by decoding
  the transaction by hand. The server runs `noir.watch({ types: ['payment.authorized'], onEvent })`
  (or `startWebhookRelay` into its own endpoint, checked with `verifyWebhookSignature` and deduped on
  `event.id`). It keeps a map of tx hash → event (keyed on `event.txHash`) and accepts the proof only
  when all of these hold: merchant is our address, amount ≥ the quoted price, deviceHash matches, the
  tx hash was never used before, and the quote exists, is unexpired and is not consumed. Then it marks
  the quote consumed and returns the data.
  - **Asset:** the `payment.authorized` event carries only `deviceHash`, `merchant`, `amount` (plus
    `id`, `contractId`, `ledger`, `ledgerClosedAt`, `txHash`), with no asset. An escrow is bound to the
    token it was first funded with, so the server asserts once at startup that
    `noir.getEscrowToken(deviceHash)` equals the XLM SAC and refuses to start otherwise. It also checks
    `event.contractId` equals the payment_escrow ID.
  - **No quote binding on-chain:** `authorizePayment` takes an optional `nonce: bigint`, but it must
    increase per (device, agent) (default `Date.now()`) and the `payment.authorized` event does not
    carry it, so the server cannot check a payment against a `quoteId`. Use the default nonce. Replay safety comes from single-use tx hashes plus single-use quotes plus the
    amount check. Known limit: a payment made for quote A could redeem a different open quote B of
    equal or lower price. That is acceptable for the demo because there is only one agent.
  - If the event has not arrived yet, return 402 `{ reason: "not_found" }`. The agent retries the
    proof up to 3 times, 2 s apart.
- Any other bad proof returns 402 with a `reason` (`wrong_merchant`, `low_amount`, `reused`,
  `expired_quote`, ...).

## Velo: checkout, status and webhooks (`apps/server`)
- `POST /api/jobs`: the user picks a research topic and a job budget (e.g. "up to 1.5 XLM of data").
  The server creates `velo.checkout.sessions.create({ amount: '1.00', asset: 'native', description,
  successUrl, cancelUrl }, { idempotencyKey: 'job:' + jobId })` for a flat job fee, stores
  `{ jobId, paymentIntentId, status: 'awaiting_payment' }` and returns `checkoutUrl`. This human
  checkout pays for the *job*. It is not the agentic payment.
  - The SDK README only shows `asset: "USDC"`. The day-one spike checks whether `'native'` (or
    `'XLM'`) is accepted on Testnet, and the asset is set to whatever works.
  - Construct the client with `new Velo({ apiKey, environment: 'testnet' })`.
- `POST /webhooks/velo`: reads the **raw** body (`express.raw({ type: 'application/json' })` on this
  route only) and calls `Velo.webhooks.verify({ payload, signature: req.headers['x-velo-signature'],
  secret })`. On `VeloWebhookSignatureVerificationError` it returns 400. It dedupes on the
  `x-velo-delivery` header (as the SDK requires) and also on event id, and returns 200 for duplicates
  without acting. On `payment.succeeded` it finds the job by `paymentIntentId`, marks it paid and
  starts the agent. Starting the agent twice for one job is guarded by the job status.
- `GET /api/jobs/:id`: job state plus `velo.paymentIntents.retrieve(paymentIntentId).status` as a
  fallback when the webhook is late.
- Store the Velo API key and webhook secret in `.env`, server only.

## The agent (`packages/agent`)
Rule-based by default, with an explicit decision trace (each decision logged with its reason and shown
on the site). An optional LLM planner can run behind `AGENT_LLM=on`, but the deterministic rules must
work without it.
1. Make a plan from the topic: a list of candidate data calls, each with an estimated value.
2. For each call: request it, get the 402 quote, and decide:
   - skip if the price exceeds the remaining job budget or the value is too low for the price;
   - otherwise run `noir.checkPayment({ deviceHash, agent, asset, amount })`. If it returns
     `{ ok: false }`, log the reason (`over_limit`, `expired`, `insufficient_escrow`, ...), do not pay,
     and continue.
3. Pay: `noir.authorizePayment({ agent: keypairSigner(AGENT_SECRET), deviceHash, merchant, asset,
   amount })`, retry the request with `X-Payment: hash`, and record `{ endpoint, price, hash, decision }`.
4. Stop when the plan is done or the budget is spent, then write a short summary of the data bought.
   The demo task must include `/api/data/report`, so the over-cap refusal always shows up.
- Amounts are always bigint stroops via `toStroops` and `fromStroops`, never floats.
- On `NoirContractError`, log `errorName` and fail that purchase only.
- The agent key runs only on the server.

## Merchant claim
`scripts/claim.ts` and a server endpoint/button "Claim earnings" call `noir.claim` with the merchant
signer. The site shows the pending balance before and after.

## Live site (`apps/web`)
- Start a job, which redirects to the Velo checkout, then return to a live job page.
- The job page shows: Velo payment status, the agent's decision trace, each Noir payment with a
  stellar.expert link, refusals with their reasons, the escrow balance, the merchant's pending balance,
  and the Claim button.
- Polling `/api/jobs/:id` every 2 s is fine. No websockets needed.

## Deployment
- `apps/web` on Vercel. `apps/server` on Render or Railway: a long-running Node process, because the
  Noir event watcher needs one.
- The web app reads `VITE_API_URL`. The server enables CORS for the web origin.
- Register the Velo webhook URL (`https://<server>/webhooks/velo`) in the Velo dashboard, and set
  `successUrl`/`cancelUrl` to the live web URL.

## Testing
- Vitest unit tests for: the proof verifier (valid, wrong merchant, low amount, reused hash, expired
  quote, not yet indexed); quote-store single use and expiry; agent decisions with mocked Noir
  (refusal, budget skip, success); the Velo webhook handler (bad signature returns 400, duplicate
  event is ignored).
- `npm run demo` runs against Testnet: verify the setup state, run one job end to end, claim, and
  print every stellar.expert link.
- Day one, before anything else: one live `checkPayment` + `authorizePayment` + `claim` round trip,
  and one Velo checkout + webhook on the deployed server. These are the two integrations that can fail.

## Out of scope
Real NFC hardware, mainnet, persistent DB (in-memory state is fine; setup rebuilds the chain state),
multi-agent support, Velo Gas Station.

## .env.example (all keys, empty)
OWNER_SECRET, AGENT_SECRET, MERCHANT_SECRET, DEVICE_UID, DEVICE_HASH, VELO_API_KEY,
VELO_WEBHOOK_SECRET, WEB_ORIGIN, PUBLIC_SERVER_URL, VITE_API_URL, AGENT_LLM, (optional LLM key)

## README (root, this exact section order, judges score from it)
Project name + one-line pitch, **Live website**, **Demo video (2 min)**, **Team** →
Problem → Solution → How the agentic payment works → Architecture (Mermaid: web, server, agent,
Noir contracts, Velo) → Noir integration (SDK version; contracts called; each SDK call linked to
file:line: `execute` with `registerDevice` / `registerAgent` / `fundEscrow`, `checkPayment`,
`authorizePayment`, `claim`, `getEscrowToken`, `getPendingBalance`, `watch` (or `startWebhookRelay` +
`verifyWebhookSignature` if used)) → Velo integration (SDK version; checkout, status,
webhooks; links to files) → Testnet proof (stellar.expert links to agent transactions) → Repo
structure → Run it locally → Environment variables table (Name | What it is | Where to get it) →
Screenshots → What's next → Credits.
Every file link must point to a real file and line in the repo.