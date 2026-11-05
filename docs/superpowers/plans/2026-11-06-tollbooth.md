# Tollbooth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live web app where a Velo checkout pays for a research job. A server-side agent then buys mock data one call at a time over a 402 handshake and pays each call itself through Noir on Stellar Testnet.

**Architecture:** npm-workspaces monorepo. `apps/server` (Express, long-running) hosts the merchant paid API, the Velo checkout and webhook, a Noir `watch` that indexes `payment.authorized` events, and the agent runner. `packages/agent` holds the rule-based decision logic and `paidFetch`. `packages/shared` holds constants and types. `apps/web` (Vite + React) starts jobs and polls job state. All state is in memory; `scripts/setup.ts` rebuilds the chain state.

**Tech Stack:** Node 24.22.1, TypeScript run by `tsx` (no build step for server or packages), Express 5, `cors`, Vitest + supertest, Vite + React 18, `@noirx402/agent-sdk@0.3.0`, `@stellar/stellar-sdk@^16.0.1`, `@carts1024/velo-sdk@0.1.0-alpha.4`.

**Spec:** `docs/superpowers/specs/2026-11-04-tollbooth-design.md`

## Global Constraints

- Node `24.22.1` in `.nvmrc`; root `engines.node` = `">=24.22.1 <25"`. Upgrade the dev machine (currently 24.11.0) before Task 1.
- Noir only through `@noirx402/agent-sdk`. Construct `new NoirAgentClient()` with **no** contract overrides. Never build Noir contract calls with `@stellar/stellar-sdk`.
- `@stellar/stellar-sdk` only for: keypairs, friendbot funding, Horizon balance reads, `Asset.native().contractId(Networks.TESTNET)`.
- Contract IDs (must equal `noir.contracts` at startup): deviceRegistry `CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5`, agentRegistry `CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV`, paymentEscrow `CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS`.
- `@carts1024/velo-sdk` pinned to exactly `0.1.0-alpha.4` (no caret). Velo is server-side only.
- Stellar Testnet only. No real funds.
- Amounts are `bigint` stroops everywhere; convert only with `toStroops` / `fromStroops`. Over the wire (JSON) amounts are stroop **strings**.
- Secrets live only in `.env` (gitignored). The agent key runs only on the server.
- No human click ever triggers a Noir payment. The Claim button calls `claim` (merchant collects), not `authorizePayment`.
- Every Noir write in the README links to a real `file:line`.

## Review Focus

1. **Noir event lag:** the agent's proof retry (3 tries, 2 s apart) can finish before `watch` sees the event. Expected: the event lands inside the window. `watch` runs with `pollMs: 1000`. If it still misses, the purchase is logged `failed: not_found` and the agent moves on without crashing. Test: Task 6 `gives up after 3 not_found retries`.
2. **Double start:** the Velo webhook, a redelivery and the `GET /api/jobs/:id` status fallback can all report "paid". Expected: the agent runs exactly once per job. Test: Task 3 `markPaid is a one-shot transition` and `duplicate delivery is ignored`.
3. **Bad job input:** a budget of `"abc"`, `"-1"`, `"0"`, `"1.123456789"` or `"50"`, or an empty topic. Expected: 400 with a message and no Velo session. Test: Task 3 `rejects bad budget`.
4. **Server restart loses jobs:** a user returns to `/jobs/:id` after a Render restart. Expected: the API returns 404 and the page says "Job not found (the server restarted). Start a new job." and does not spin forever. Test: Task 3 `unknown job is 404`; the Task 8 manual check.
5. **Webhook for an unknown payment intent** (another project's event, or a job wiped by a restart). Expected: 200 and ignored, never 500 (a 500 makes Velo retry forever). Test: Task 3 `unknown payment intent is acknowledged`.

## File Map

```
.nvmrc  package.json  tsconfig.base.json  vitest.config.ts  .env.example  .gitignore  README.md
packages/shared/src/  index.ts contracts.ts catalog.ts asset.ts types.ts env.ts links.ts  (+ shared.test.ts)
packages/agent/src/   index.ts plan.ts decide.ts paidFetch.ts run.ts                      (+ *.test.ts)
apps/server/src/      index.ts app.ts jobs.ts velo.ts quotes.ts verifier.ts merchant.ts
                      noirWatch.ts runner.ts claim.ts mockData.ts                         (+ *.test.ts)
apps/web/             index.html vite.config.ts vercel.json src/{main.tsx,App.tsx,StartJob.tsx,JobPage.tsx,api.ts}
scripts/              setup.ts spike-noir.ts claim.ts demo.ts
docs/                 architecture.md (Mermaid) screenshots/
```

Workspace package names: `@tollbooth/shared`, `@tollbooth/agent`, `@tollbooth/server`, `@tollbooth/web`. Each package's `package.json` sets `"type": "module"` and `"exports": "./src/index.ts"`, so consumers import the TS source directly (tsx and Vite both handle it).

---

### Task 1: Monorepo scaffold + shared package

**Files:**
- Create: `.nvmrc`, `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `packages/shared/package.json`, `packages/shared/src/{index,contracts,catalog,asset,types,env,links}.ts`
- Test: `packages/shared/src/shared.test.ts`

**Interfaces:**
- Produces (`@tollbooth/shared`):
  - `NOIR_TESTNET_CONTRACTS: NoirContracts` (the three IDs above)
  - `assertTestnetContracts(actual: NoirContracts): void`, which throws `Error('Noir contract mismatch: <key>')` on any difference
  - `type EndpointName = 'quote' | 'weather' | 'news' | 'report'`
  - `CATALOG: Record<EndpointName, { path: string; price: bigint; description: string }>` with prices `quote 1_000_000n`, `weather 500_000n`, `news 2_000_000n`, `report 20_000_000n`, and paths `/api/data/<name>`
  - `POLICY_MAX = 10_000_000n`, `JOB_FEE = '1.00'`, `MAX_JOB_BUDGET = 50_000_000n`, `QUOTE_TTL_MS = 120_000`
  - `XLM_SAC: string` = `Asset.native().contractId(Networks.TESTNET)`
  - `readEnv<K extends string>(keys: readonly K[], src?: Record<string, string | undefined>): Record<K, string>`, which throws one `Error` that names every missing key
  - `txLink(hash)`, `accountLink(g)`, `contractLink(c)`, which return `https://stellar.expert/explorer/testnet/{tx|account|contract}/<id>`
  - types: `Quote402 = { quoteId: string; price: string; asset: string; merchant: string; network: 'testnet'; expiresAt: string }`; `ProofReason = 'not_found' | 'unknown_quote' | 'consumed_quote' | 'expired_quote' | 'reused' | 'wrong_contract' | 'wrong_merchant' | 'wrong_device' | 'low_amount'`; `DecisionAction = 'plan' | 'skip' | 'refused' | 'paid' | 'failed' | 'done'`; `Decision = { at: string; action: DecisionAction; endpoint?: EndpointName; price?: string; reason: string; hash?: string }`; `PaymentRecord = { endpoint: EndpointName; price: string; hash: string; decision: string }`; `JobStatus = 'awaiting_payment' | 'paid' | 'running' | 'done' | 'failed'`; `JobView = { jobId: string; topic: string; budget: string; status: JobStatus; veloStatus: string | null; checkoutUrl: string; trace: Decision[]; payments: PaymentRecord[]; summary: string | null }`

- [ ] **Step 1:** Root `package.json`: `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, `engines` as in Global Constraints, scripts `test: vitest run`, `dev:server: tsx watch apps/server/src/index.ts`, `dev:web: npm -w @tollbooth/web run dev`, `setup: tsx scripts/setup.ts`, `claim: tsx scripts/claim.ts`, `demo: tsx scripts/demo.ts`. Root devDeps: `typescript`, `tsx`, `vitest`, `@types/node`. `.gitignore`: `node_modules`, `.env`, `dist`, `.vercel`. `.env.example` lists every key from spec §.env.example, empty.
- [ ] **Step 2:** Install deps into shared: `npm -w @tollbooth/shared i @noirx402/agent-sdk@0.3.0 @stellar/stellar-sdk@^16.0.1`. Expected: no `EBADENGINE` warning (proves the Node upgrade).
- [ ] **Step 3: Write failing tests** in `shared.test.ts`:

```ts
import { TESTNET } from '@noirx402/agent-sdk'
test('SDK TESTNET defaults equal our pinned IDs', () => {
  expect(() => assertTestnetContracts(TESTNET.contracts)).not.toThrow()
})
test('mismatch throws naming the key', () => {
  expect(() => assertTestnetContracts({ ...NOIR_TESTNET_CONTRACTS, paymentEscrow: 'CX' }))
    .toThrow('paymentEscrow')
})
test('report is above the policy cap, the rest below', () => {
  expect(CATALOG.report.price > POLICY_MAX).toBe(true)
  for (const k of ['quote', 'weather', 'news'] as const) expect(CATALOG[k].price <= POLICY_MAX).toBe(true)
})
test('readEnv names all missing keys', () => {
  expect(() => readEnv(['A', 'B'], { A: 'x' })).toThrow(/B/)
  expect(readEnv(['A'], { A: 'x' })).toEqual({ A: 'x' })
})
test('XLM_SAC is a contract id', () => expect(XLM_SAC).toMatch(/^C[A-Z2-7]{55}$/))
```

- [ ] **Step 4:** Run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 5:** Implement the shared modules per the Interfaces block. `index.ts` re-exports all of them.
- [ ] **Step 6:** Run `npm test`. Expected: 5 passed. If the first test fails, the SDK defaults have moved: **stop and tell the user** (the spec forbids overrides).
- [ ] **Step 7: Commit** `chore: monorepo scaffold and shared constants`

---

### Task 2: Testnet setup script + live Noir spike (day-one gate)

**Files:**
- Create: `scripts/setup.ts`, `scripts/spike-noir.ts`, `scripts/env-file.ts`

**Interfaces:**
- Consumes: `NOIR_TESTNET_CONTRACTS`, `assertTestnetContracts`, `XLM_SAC`, `accountLink`, `txLink`, `readEnv`
- Produces: `.env` with `OWNER_SECRET`, `AGENT_SECRET`, `MERCHANT_SECRET`, `DEVICE_UID`, `DEVICE_HASH`. Also `scripts/env-file.ts` exporting `loadDotEnv(): Record<string,string>` and `upsertDotEnv(updates: Record<string,string>): void` (keeps unrelated lines and comments). Scripts call `process.loadEnvFile('.env')` (built into Node 24) for reads.

- [ ] **Step 1:** Implement `setup.ts`, following spec §Accounts and setup exactly, including the idempotency rules:
  - keys: reuse from `.env`, otherwise `Keypair.random()`; friendbot `GET https://friendbot.stellar.org?addr=<G>`. Treat an HTTP 400 whose body says the account is already funded as success.
  - `DEVICE_UID` defaults to `TOLLBOOTH-DEMO-0001`; `DEVICE_HASH = createHash('sha256').update(uid).digest('hex')`
  - `const noir = new NoirAgentClient(); assertTestnetContracts(noir.contracts)`
  - `registerDevice` only if `getDeviceOwner(hash) !== owner.publicKey`. If the owner is a *different* account, throw `Error('device hash owned by another wallet; change DEVICE_UID')`.
  - `registerAgent` only if `getPolicy(hash)` is null or differs in agent, asset (`XLM_SAC`) or maxAmount (`POLICY_MAX`), or expires within 7 days
  - `fundEscrow` with `toStroops('20')` only if `getEscrowBalance(hash) < toStroops('10')`
  - Print the three `accountLink`s, `DEVICE_HASH`, and a `txLink` for each write sent.
- [ ] **Step 2:** Run `npm run setup` twice. Expected: the first run sends 3 txs and prints their links; the second run prints "already registered / already funded" and sends 0 txs.
- [ ] **Step 3:** Implement `spike-noir.ts`. It runs `checkPayment` for `toStroops('0.01')` (expect `{ ok: true }`), then `checkPayment` for `toStroops('2')` (expect `{ ok: false, reason: 'over_limit' }`), then `authorizePayment` for 0.01 to the merchant (print `txLink`), then `getPendingBalance(merchant)` (expect ≥ 100_000n), then `claim({ merchant: keypairSigner(MERCHANT_SECRET), token: XLM_SAC })` (print `txLink`). Each failed expectation makes the script exit 1.
- [ ] **Step 4:** Run `npx tsx scripts/spike-noir.ts`. Expected: exit 0 with 2 tx links that open on stellar.expert. **If this fails, stop the plan and report to the user. Nothing else is worth building until this works.**
- [ ] **Step 5: Commit** `feat: idempotent testnet setup and noir round-trip spike`

---

### Task 3: Server skeleton + Velo jobs/webhook + Render deploy (day-one gate)

**Files:**
- Create: `apps/server/package.json`, `apps/server/src/{index,app,jobs,velo}.ts`
- Test: `apps/server/src/jobs.test.ts`, `apps/server/src/velo.test.ts`

**Interfaces:**
- Consumes: `JobView`, `JobStatus`, `JOB_FEE`, `MAX_JOB_BUDGET`, `readEnv`
- Produces:
  - `class JobStore { create(p: { topic: string; budget: bigint; paymentIntentId: string; checkoutUrl: string; jobId: string }): Job; get(id): Job | undefined; byPaymentIntent(piId): Job | undefined; markPaid(id): boolean; view(id): JobView | undefined }`. `Job` is internal: `JobView` fields plus `paymentIntentId` and `budget: bigint`. `markPaid` returns true only on the `awaiting_payment → paid` transition. Trace/payments/status/summary are mutated directly on the `Job` by the runner (Task 7).
  - `type VeloLike = { checkout: { sessions: { create(p: object, o?: { idempotencyKey?: string }): Promise<{ checkoutUrl: string; paymentIntentId: string }> } }; paymentIntents: { retrieve(id: string): Promise<{ status: string }> } }`
  - `veloRouter(d: { velo: VeloLike; jobs: JobStore; webOrigin: string; secret: string; verify?: typeof Velo.webhooks.verify; onPaid: (jobId: string) => void }): Router`, which mounts `POST /api/jobs`, `GET /api/jobs/:id`, `POST /webhooks/velo`
  - `createApp(d: { webOrigin: string; routers: Router[] }): Express`: `cors({ origin: webOrigin })`, then `express.raw({ type: 'application/json' })` on `/webhooks/velo` only, then `express.json()`, then routers, then `GET /health → { ok: true }`

- [ ] **Step 1:** `npm -w @tollbooth/server i express@5 cors @carts1024/velo-sdk@0.1.0-alpha.4 --save-exact`, plus devDeps `supertest @types/express @types/cors @types/supertest`. Check `apps/server/package.json` shows `"@carts1024/velo-sdk": "0.1.0-alpha.4"` with no caret.
- [ ] **Step 2: Write failing tests.** `jobs.test.ts`: `markPaid is a one-shot transition` (true, then false). `velo.test.ts` uses supertest against `createApp` with a fake `VeloLike` (counts `create` calls) and a fake `verify` that returns the parsed body, or throws `new VeloWebhookSignatureVerificationError(...)` when the signature is `'bad'`:
  - `POST /api/jobs creates a session`: body `{ topic: 'stellar fees', budget: '1.5' }` → 200 `{ jobId, checkoutUrl }`. `create` is called with `amount: '1.00'`, `asset: 'native'`, `successUrl: <webOrigin>/jobs/<jobId>`, `cancelUrl: <webOrigin>/` and idempotency key `job:<jobId>`.
  - `rejects bad budget`: each of `'abc'`, `'-1'`, `'0'`, `'1.123456789'`, `'50'`, and topic `''` → 400, and `create` is never called
  - `bad signature returns 400`
  - `paid webhook calls onPaid once`: a `payment.succeeded` event with `paymentIntent.id` equal to the job's → 200 and `onPaid` called with the jobId
  - `duplicate delivery is ignored`: the same `x-velo-delivery` sent twice → both 200, `onPaid` called once; a different delivery id but the same `event.id` → also ignored
  - `unknown payment intent is acknowledged`: 200, `onPaid` not called
  - `GET job falls back to Velo status`: the job is `awaiting_payment` and the fake `retrieve` returns `{ status: 'paid' }` → the response has `veloStatus: 'paid'` and `onPaid` is called once (the job is marked paid)
  - `unknown job is 404`
- [ ] **Step 3:** `npx vitest run apps/server`. Expected: FAIL.
- [ ] **Step 4:** Implement `jobs.ts`, `velo.ts` and `app.ts`. Budget parse: wrap `toStroops` in try/catch, then require `0n < b <= MAX_JOB_BUDGET`. `jobId = randomUUID()`. The `GET` handler swallows `retrieve` errors (it returns `veloStatus: null`) so a Velo outage never breaks the job page. Both the webhook and the fallback call `if (jobs.markPaid(id)) onPaid(id)`.
- [ ] **Step 5:** `npx vitest run apps/server`. Expected: all pass.
- [ ] **Step 6:** `index.ts`, minimal for now: `readEnv(['VELO_API_KEY','VELO_WEBHOOK_SECRET','WEB_ORIGIN'])`, `new Velo({ apiKey, environment: 'testnet' })`, `onPaid` logs `job paid <id>`, listen on `process.env.PORT ?? 8787`. Add `"start": "tsx src/index.ts"` to the server package.
- [ ] **Step 7: Deploy to Render** (the user creates the service; give them these values): root directory = repo root, build `npm ci`, start `npm -w @tollbooth/server start`, env `NODE_VERSION=24.22.1` plus the env vars. Register `https://<server>/webhooks/velo` in the Velo dashboard. Set `PUBLIC_SERVER_URL`.
- [ ] **Step 8: Live Velo check.** Run `curl -X POST https://<server>/api/jobs -H 'content-type: application/json' -d '{"topic":"t","budget":"1"}'`, open the `checkoutUrl`, and pay on Testnet. Expected: the Render log shows `job paid <id>`. If Velo rejects `asset: 'native'`, try `'XLM'` and set `VELO_ASSET` in `velo.ts` to the one that works (update the test). **If no webhook arrives, stop and report.**
- [ ] **Step 9: Commit** `feat(server): velo checkout, verified webhook, job store`

---

### Task 4: Quote store + proof verifier

**Files:**
- Create: `apps/server/src/quotes.ts`, `apps/server/src/verifier.ts`
- Test: `apps/server/src/quotes.test.ts`, `apps/server/src/verifier.test.ts`

**Interfaces:**
- Consumes: `EndpointName`, `ProofReason`, `QUOTE_TTL_MS`, `NOIR_TESTNET_CONTRACTS`
- Produces:
  - `type StoredQuote = { quoteId: string; endpoint: EndpointName; price: bigint; expiresAt: number; consumed: boolean }`
  - `class QuoteStore { constructor(now?: () => number); issue(endpoint: EndpointName, price: bigint): StoredQuote; get(id: string): StoredQuote | undefined }`. `quoteId = randomUUID()`, `expiresAt = now() + QUOTE_TTL_MS`.
  - `type PaymentEvent = { txHash: string; contractId: string; merchant: string; deviceHash: string; amount: bigint }`
  - `createVerifier(d: { quotes: QuoteStore; merchant: string; deviceHash: string; now?: () => number }): { recordEvent(e: PaymentEvent): void; verify(txHash: string, quoteId: string, endpoint: EndpointName): { ok: true } | { ok: false; reason: ProofReason } }`
  - Check order in `verify` (first failure wins): quote missing or for another endpoint → `unknown_quote`; `consumed` → `consumed_quote`; `now() > expiresAt` → `expired_quote`; hash already used → `reused`; no event → `not_found`; `contractId !== NOIR_TESTNET_CONTRACTS.paymentEscrow` → `wrong_contract`; merchant → `wrong_merchant`; deviceHash (compare lowercase) → `wrong_device`; `amount < price` → `low_amount`. On ok, mark the quote consumed and add the hash to the used set.

- [ ] **Step 1: Write failing tests.** `quotes.test.ts`: `issued quote expires after 2 minutes`, using an injected clock (at `+119_999` ms `get().expiresAt` is still ahead, at `+120_001` it has passed). `verifier.test.ts` builds a good event matching the quote, then one test per row: `valid proof is accepted and consumes the quote`, `second use of the same quote is consumed_quote`, `same hash on a new quote is reused`, `wrong merchant`, `low amount` (price − 1n), `expired quote` (clock past TTL), `not yet indexed is not_found`, `wrong device`, `wrong contract`, `quote for another endpoint is unknown_quote`. Assert the exact `reason` string in each.
- [ ] **Step 2:** `npx vitest run apps/server/src/quotes.test.ts apps/server/src/verifier.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both modules. A `not_found` result must **not** consume the quote (the agent retries).
- [ ] **Step 4:** Same command. Expected: all pass.
- [ ] **Step 5: Commit** `feat(server): single-use quotes and noir proof verifier`

---

### Task 5: Merchant paid API + Noir watch + startup assertions

**Files:**
- Create: `apps/server/src/merchant.ts`, `apps/server/src/mockData.ts`, `apps/server/src/noirWatch.ts`
- Modify: `apps/server/src/index.ts`
- Test: `apps/server/src/merchant.test.ts`

**Interfaces:**
- Consumes: `QuoteStore`, `createVerifier`, `PaymentEvent`, `CATALOG`, `XLM_SAC`, `Quote402`
- Produces:
  - `merchantRouter(d: { quotes: QuoteStore; verifier: Verifier; merchant: string }): Router`, which mounts `GET /api/data/:name`. An unknown name → 404. No `X-Payment` → 402 `Quote402` (price as a stroop string, `asset: XLM_SAC`). With headers `X-Payment: <txHash>` and `X-Quote-Id: <quoteId>` (we add the second header because the server must know which quote a proof redeems) → verify: ok → 200 `{ endpoint, data: mockData(name) }`; else 402 `{ reason }`.
  - `mockData(name: EndpointName): unknown`: fixed, plausible JSON per endpoint (quote: `{ symbol: 'XLM', usd: '0.12' }`, etc.)
  - `startPaymentWatch(noir: NoirAgentClient, verifier: Verifier, merchant: string): () => void`, which calls `noir.watch({ types: ['payment.authorized'], merchant, pollMs: 1000, onEvent, onError: console.error })` and maps each event into `verifier.recordEvent`

- [ ] **Step 1: Write failing tests** (supertest, real `QuoteStore` + `createVerifier`): `no proof returns 402 quote` (checks `price === '1000000'` for quote and `network === 'testnet'`); `valid proof returns data` (call `recordEvent` with a matching event first); `bad proof returns 402 with reason` (`wrong_merchant`); `unknown endpoint is 404`; `report quote is 20000000`.
- [ ] **Step 2:** `npx vitest run apps/server/src/merchant.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `merchant.ts`, `mockData.ts`, `noirWatch.ts`.
- [ ] **Step 4:** Same command. Expected: pass.
- [ ] **Step 5:** Extend `index.ts`: read `MERCHANT_SECRET`, `DEVICE_HASH`; `const noir = new NoirAgentClient()`; `assertTestnetContracts(noir.contracts)`; `if (await noir.getEscrowToken(DEVICE_HASH) !== XLM_SAC) throw new Error('escrow not bound to XLM SAC; run npm run setup')`; mount `merchantRouter`; `startPaymentWatch`. Run `npm run dev:server` locally. Expected: it starts; `curl localhost:8787/api/data/quote` returns 402 JSON.
- [ ] **Step 6: Commit** `feat(server): x402 merchant API verified through noir events`

---

### Task 6: Agent package (plan, decide, paidFetch, run)

**Files:**
- Create: `packages/agent/package.json`, `packages/agent/src/{index,plan,decide,paidFetch,run}.ts`
- Test: `packages/agent/src/agent.test.ts`

**Interfaces:**
- Consumes: `CATALOG`, `EndpointName`, `Quote402`, `Decision`, `PaymentRecord`; `NoirContractError`, `NoirSigner`, `fromStroops` from the SDK
- Produces:
  - `type PlanItem = { endpoint: EndpointName; value: bigint; why: string }`
  - `makePlan(topic: string): PlanItem[]`: deterministic. It always includes `quote` (value 1.5 XLM), `news` (0.5 XLM) and `report` (value 3 XLM, so value never blocks it and the refusal comes from the Noir policy). It includes `weather` with value 0.5 XLM when the topic matches `/weather|travel|climate|farm/i`, else 0.02 XLM (below its 0.05 price, so the trace shows a value skip). Order: quote, weather, news, report.
  - `decide(item: PlanItem, price: bigint, remaining: bigint): { pay: true } | { pay: false; reason: string }`: skip with `over budget: price X > remaining Y` or `low value: worth X < price Y` (formatted with `fromStroops`)
  - `type NoirPort = { checkPayment: NoirAgentClient['checkPayment']; authorizePayment: NoirAgentClient['authorizePayment'] }`
  - `paidFetch(url: string, pay: (q: Quote402) => Promise<string | null>, o?: { fetch?: typeof fetch; retries?: number; delayMs?: number }): Promise<{ status: 'free' | 'paid'; data: unknown; hash?: string } | { status: 'declined' } | { status: 'rejected'; reason: string; hash?: string }>`. Defaults: `retries: 3`, `delayMs: 2000`. It retries the proof only while the reason is `not_found`.
  - `runAgent(p: { topic: string; budget: bigint; baseUrl: string; noir: NoirPort; agent: NoirSigner; deviceHash: string; log: (d: Decision) => void; fetch?: typeof fetch; delayMs?: number }): Promise<{ payments: PaymentRecord[]; spent: bigint; summary: string }>`. For each plan item: `paidFetch` → in `pay`: `decide` (log `skip`, return null) → `checkPayment({ deviceHash, agent: agent.publicKey, asset: q.asset, amount })` (on `!ok` log `refused` with the reason, return null) → `authorizePayment({ agent, deviceHash, merchant: q.merchant, asset: q.asset, amount })`, then return the hash. A thrown `NoirContractError` logs `failed` with `errorName` and that item ends. Log `paid` with the hash on success, then `done` with the summary at the end. The summary lists the endpoints bought, the total spent and the refusals (plain text, one line each).

- [ ] **Step 1: Write failing tests** with a fake `NoirPort` and a fake `fetch` that plays the merchant (402 → 200 after a proof):
  - `makePlan always includes report`; `non-weather topic gives weather low value`
  - `budget skip`: budget 0.15 XLM → quote paid (0.1), news skipped with reason starting `over budget`
  - `policy refusal is logged and not paid`: `checkPayment` returns `{ ok: false, reason: 'over_limit' }` for report → a `refused` decision with reason `over_limit`, and `authorizePayment` is never called for report
  - `success records payment`: quote → a `PaymentRecord` with `price: '1000000'` and the fake hash
  - `NoirContractError fails only that purchase`: `authorizePayment` throws `new NoirContractError('paymentEscrow', 7, 'DuplicateAuth', 'authorize')` once → a `failed` decision with reason containing `DuplicateAuth`, and the next item still runs
  - `gives up after 3 not_found retries`: the fake merchant always answers `not_found` → `rejected` with `not_found`, exactly 3 proof attempts (pass `delayMs: 0`)
- [ ] **Step 2:** `npx vitest run packages/agent`. Expected: FAIL.
- [ ] **Step 3:** Implement. No floats anywhere: `value`, `price` and `remaining` are bigint.
- [ ] **Step 4:** `npx vitest run packages/agent`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(agent): rule-based buyer with decision trace and paidFetch`

---

### Task 7: Agent runner, balances and claim endpoints, end to end

**Files:**
- Create: `apps/server/src/runner.ts`, `apps/server/src/claim.ts`
- Modify: `apps/server/src/index.ts` (wire `onPaid` to the runner, mount the claim router)
- Test: `apps/server/src/runner.test.ts`

**Interfaces:**
- Consumes: `runAgent`, `NoirPort`, `JobStore`, `keypairSigner`, `XLM_SAC`
- Produces:
  - `runJob(jobId: string, d: { jobs: JobStore; noir: NoirPort; agent: NoirSigner; deviceHash: string; baseUrl: string }): Promise<void>`: sets status `running`, appends each `Decision` to `job.trace` as it arrives (so polling shows progress), then `done` with payments and summary. Any thrown error → `failed` plus a final trace entry. It never rejects.
  - `claimRouter(d: { noir: NoirAgentClient; merchant: NoirSigner; deviceHash: string }): Router`: `GET /api/balances → { escrow: string; pending: string }` (stroop strings); `POST /api/claim → { hash, before, after }`; `NothingToClaim` → 409 `{ reason: 'NothingToClaim' }`
- `baseUrl` is `http://127.0.0.1:${PORT}` (the agent calls its own merchant API in-process over HTTP, so the real 402 path is exercised).

- [ ] **Step 1: Write failing tests:** `runJob marks done and stores trace` (fake noir that approves everything, a real merchant app served on an ephemeral port, `recordEvent` called from the fake `authorizePayment`); `runJob marks failed on crash` (the `checkPayment` fake throws a plain `Error`).
- [ ] **Step 2:** `npx vitest run apps/server/src/runner.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `runner.ts` and `claim.ts`. Wire `onPaid: (id) => void runJob(id, …)` in `index.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: the whole suite passes.
- [ ] **Step 5: Live local run.** Add a dev-only trigger guarded by `NODE_ENV !== 'production'`, `POST /api/dev/jobs/:id/start`, which calls `markPaid` then `onPaid`. Create a job via `/api/jobs`, trigger it, and poll `GET /api/jobs/:id`. Expected: quote and news `paid` with real hashes, weather `skip` (low value), report `refused: over_limit`, status `done`; `GET /api/balances` shows pending > 0; `POST /api/claim` returns a hash.
- [ ] **Step 6:** Redeploy Render. Repeat one real Velo checkout. Expected: the agent runs from the webhook alone.
- [ ] **Step 7: Commit** `feat(server): run agent on velo payment; balances and claim`

---

### Task 8: Web app + Vercel deploy

**Files:**
- Create: `apps/web/{package.json,index.html,vite.config.ts,vercel.json}`, `apps/web/src/{main.tsx,App.tsx,StartJob.tsx,JobPage.tsx,api.ts}`

**Interfaces:**
- Consumes: the HTTP API from Tasks 3, 5 and 7; `JobView`, `txLink`, `accountLink`, and `fromStroops` from `@noirx402/agent-sdk` (the README says it runs in the browser)
- Produces: `api.ts` exports `createJob(topic, budget)`, `getJob(id)`, `getBalances()`, `claim()`, all against `import.meta.env.VITE_API_URL`

- [ ] **Step 1:** Scaffold with `npm create vite@latest apps/web -- --template react-ts`, then trim the demo files. `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. Routing: `App` renders `JobPage` when `location.pathname` matches `/jobs/:id`, else `StartJob` (no router dependency).
- [ ] **Step 2:** `StartJob`: topic input, budget input (default `1.5`), a submit button labelled **"Pay job fee (1 XLM) with Velo"**, and inline display of the 400 message. On success `location.href = checkoutUrl`.
- [ ] **Step 3:** `JobPage`: polls `getJob` every 2 s until `done`/`failed`, and `getBalances` every 2 s. It shows the Velo status, the decision trace (action badge + reason + `txLink` when there is a hash), the payments table, refusals highlighted, escrow and merchant-pending balances, the summary, and a **Claim earnings** button that shows before/after. On 404 it shows "Job not found (the server restarted). Start a new job." with a link home.
- [ ] **Step 4:** Run `npm run dev:server` and `npm run dev:web`, then click through with the dev trigger. Expected: the trace fills in live; the links open stellar.expert; Claim updates pending to 0.
- [ ] **Step 5: Deploy.** Create a Vercel project with root `apps/web` and env `VITE_API_URL=https://<server>`. Set Render `WEB_ORIGIN=https://<web>` (CORS + success/cancel URLs). Full live run from the Vercel URL. Expected: checkout → redirect back → agent trace → Claim.
- [ ] **Step 6: Commit** `feat(web): start job, live job page, claim`

---

### Task 9: claim and demo scripts

**Files:**
- Create: `scripts/claim.ts`, `scripts/demo.ts`

**Interfaces:**
- Consumes: the SDK, `runAgent`, `.env`, `txLink`

- [ ] **Step 1:** `claim.ts`: print the pending balance, run `claim` with `keypairSigner(MERCHANT_SECRET)`, then print after + `txLink`. A `NothingToClaim` exits 0 with "nothing to claim".
- [ ] **Step 2:** `demo.ts` (spec §Testing): verify setup state (`getPolicy`, `getEscrowBalance ≥ 2 XLM`, `getEscrowToken === XLM_SAC`, contract assertion; on failure, exit 1 with "run npm run setup"). It then starts the server app in-process on an ephemeral port, runs `runAgent` with topic `stellar weather` and budget 1.5 XLM, runs claim, and prints every `txLink` plus the summary. Velo is skipped here (it needs a human checkout). Print a line that says so.
- [ ] **Step 3:** Run `npm run demo`. Expected: exit 0, ≥ 3 agent tx links + 1 claim link, and an `over_limit` refusal for report.
- [ ] **Step 4: Commit** `feat(scripts): claim and end-to-end testnet demo`

---

### Task 10: README, architecture, screenshots, public repo

**Files:**
- Create: `README.md`, `docs/architecture.md`, `docs/screenshots/*.png`

- [ ] **Step 1:** Write `README.md` in spec §README's exact section order. Mermaid diagram: web → server (Velo checkout/webhook, merchant API, runner) → agent → Noir contracts (3 IDs), Velo. The Noir integration section links each of `execute` (registerDevice / registerAgent / fundEscrow in `scripts/setup.ts`), `checkPayment` and `authorizePayment` (`packages/agent/src/run.ts`), `claim` (`apps/server/src/claim.ts`, `scripts/claim.ts`), `getEscrowToken` and the contract assertion (`apps/server/src/index.ts`), `getPendingBalance`, and `watch` (`apps/server/src/noirWatch.ts`). The Velo section links `velo.ts` for checkout, retrieve and webhook verify. Testnet proof: paste the links printed by `npm run demo` and the live run. Env table: every `.env.example` key, as Name | What it is | Where to get it.
- [ ] **Step 2:** Verify every file link: run `grep -oE '\]\(([^)#]+)#L([0-9]+)\)' README.md` and confirm that each file exists and that the named line contains the named call. Expected: zero broken links.
- [ ] **Step 3:** Screenshots of the start page, the job page mid-run, the refusal and the claim. Record the 2-min demo video (user).
- [ ] **Step 4:** Check that no secret is in git: `git log -p | grep -E 'S[A-Z2-7]{55}'` returns nothing. Create the public GitHub repo and push (user confirms before push).
- [ ] **Step 5: Commit** `docs: judging README, architecture, screenshots`

---

## Not in this plan (deliberately)

- The optional LLM planner (`AGENT_LLM=on`). The spec makes it optional and the rules must stand alone. `AGENT_LLM` stays in `.env.example` and is unused.
- A web test suite. The spec requires none, and the UI is checked by hand in Task 8.
- The Noir webhook relay. We use `watch`, the spec's first option.
