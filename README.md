<div align="center">

# 🎬 ClipPass

### An AI agent for short-form creators that licenses stock media for each reel and pays every artist per use on Stellar Testnet, inside a card limit it cannot exceed.

<br/>

[![Live website](https://img.shields.io/badge/▶_Live_website-clippass.vercel.app-111111?style=for-the-badge&logo=vercel&logoColor=white)](https://clippass.vercel.app)
[![Demo video](https://img.shields.io/badge/🎥_Demo_video-2_min-E50914?style=for-the-badge)](https://drive.google.com/file/d/1mu6MamAPaJziIpwkmjhGZtsRPoO5Isff/view?usp=drive_link)
[![Pitch deck](https://img.shields.io/badge/📊_Pitch_deck-Canva-00C4CC?style=for-the-badge&logo=canva&logoColor=white)](https://canva.link/57e2wzvuxz13ape)

![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7D00FF?style=flat-square&logo=stellar&logoColor=white)
![x402](https://img.shields.io/badge/pattern-x402-FF6B00?style=flat-square)
![Noir SDK](https://img.shields.io/badge/@noirx402/agent--sdk-0.3.0-222?style=flat-square)
![Velo SDK](https://img.shields.io/badge/@carts1024/velo--sdk-0.1.0--alpha.4-222?style=flat-square)
![Node](https://img.shields.io/badge/Node-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tests](https://img.shields.io/badge/tests-163_passing-2EA44F?style=flat-square&logo=vitest&logoColor=white)

<br/>

<img src="docs/screenshots/start.png" alt="ClipPass start page" width="820"/>

<br/>

**Team:** Daniel Aldreen Manjares ([dnlaldrn](https://github.com/dnlaldrn)) · Gadiel Manalo ([mvpwin](https://github.com/mvpwin))

</div>

---

## 😩 Problem

Short-form creators pay monthly stock media subscriptions, but many need only two or three assets a month. When a reel gets muted or demonetized over a music claim, they rarely have clean proof of what they paid for and when. Small artists earn tiny pooled royalties instead of being paid for each use.

## 💡 Solution

ClipPass gives an agent a constrained key on a Noir card. The owner sets the policy once: which key may spend, which asset, a cap per payment (1 XLM) and an expiry, all backed by an escrow. The creator pays a flat 1 XLM reel project fee through a Velo checkout, then the agent does the rest. It reads the script, plans one music track, one b-roll clip and one sound effect, and buys each one from a stock library that answers `402 Payment Required` with that asset's price. Each payment is made out to the artist's own Stellar account, and the transaction is the license receipt.

Every reel also tries a 2 XLM exclusive-rights track. That is above the card's 1 XLM cap, so you can watch the card refuse the agent.

> [!TIP]
> **The demo in one line:** "This reel uses 3 assets from 3 artists. Here is the payment proof for every one. The agent tried an exclusive track and the card said no."

---

## 🤖 How the agentic payment works

| | Step |
|:-:|---|
| 1️⃣ | **A human pays for the project, not the media.** `POST /api/jobs` checks the script (1 to 500 characters), the mood and the budget, then creates a Velo checkout session for the 1 XLM fee. When Velo's signed `payment.succeeded` webhook arrives, the server starts the agent. No human click ever triggers a Noir payment. |
| 2️⃣ | **The agent plans the reel.** It turns the script and mood into four slots: the exclusive first, then music, one b-roll and one SFX. That keeps a reel to three on-chain payments, since each one waits for Stellar to confirm. Script words are matched to each lane's tags, so "rainy" matches `rain` ([plan.ts](packages/agent/src/plan.ts#L13)). With `AGENT_LLM` set, a local Ollama model reads the script and picks one tag for each b-roll and SFX slot, limited to each lane's tag list. Music always keeps the mood you chose ([llm.ts](packages/agent/src/llm.ts#L12)). The exclusive slot is never sent to the model, so the card refusal always shows. |
| 3️⃣ | **The agent picks the cheapest match.** For each slot it ranks the unused assets by matching tags, then by price, and writes down why: "picked Wok Sizzle over Market Crowd: same match, 0.02 cheaper". It never licenses the same asset twice in one reel ([pick.ts](packages/agent/src/pick.ts#L6)). |
| 4️⃣ | **Each asset starts with a 402.** `GET /api/assets/:id` answers `{ quoteId, price, asset, merchant, network, expiresAt }`, where `merchant` is that artist's address. The quote is random, single use and valid for 2 minutes ([merchant.ts](apps/server/src/merchant.ts#L11)). |
| 5️⃣ | **The agent decides.** It skips anything over the remaining budget, or quoted above the catalog's listed price ([decide.ts](packages/agent/src/decide.ts#L5)). Otherwise it asks Noir `checkPayment`. If the card would refuse (`over_limit`, `expired`, `insufficient_escrow`, ...), it logs the reason and does not pay. |
| 6️⃣ | **The agent pays the artist with its own key.** It calls `authorizePayment` to the artist's address with `keypairSigner(AGENT_SECRET)` and retries the request with `X-Payment: <tx hash>` and `X-Quote-Id` ([run.ts](packages/agent/src/run.ts#L61)). |
| 7️⃣ | **The library verifies through Noir.** The server watches `payment.authorized` events for our device. It accepts a proof only if the payment went to the artist named on the quote, the device matches, the amount is at least the quoted price, the event came from the payment_escrow contract, and both the tx hash and the quote are unused and unexpired ([verifier.ts](apps/server/src/verifier.ts#L32)). Then it returns the license. |
| 8️⃣ | **Artists collect.** "Pay out artists" claims each artist's pending balance with that artist's own key ([claim.ts](apps/server/src/claim.ts#L8)). The job page shows the license sheet (asset, artist, price, tx link) and every decision the agent made. |

> [!NOTE]
> All amounts are `bigint` stroops, converted only with the SDK's `toStroops` and `fromStroops`. Media is mocked by design. The catalog is 14 assets from 4 fictional studios ([catalog.ts](packages/shared/src/catalog.ts#L20)), and preview and download links use the reserved `clippass.example` domain. The payments are real Testnet payments.

---

## 🏗️ Architecture

```mermaid
flowchart LR
  user([Creator]) -->|script, mood, budget| web[apps/web: Vite + React]
  web -->|redirect| velo[(Velo checkout)]
  velo -->|signed webhook| server
  web -->|poll reel, balances| server
  subgraph server[apps/server: Express]
    jobs[Velo routes + job store]
    runner[Agent runner]
    library[Stock library API + verifier]
    watch[Noir watch, by device]
    payout[Balances + artist payouts]
  end
  jobs --> runner --> agent[packages/agent]
  agent -->|402 + X-Payment| library
  agent -->|checkPayment / authorizePayment to artist| noir[(Noir contracts, Stellar Testnet)]
  noir -->|payment.authorized| watch --> library
  payout -->|claim, one per artist| noir
```

There's a sequence diagram of one licensed asset in [docs/architecture.md](docs/architecture.md).

---

## 🔐 Noir integration

- **SDK:** `@noirx402/agent-sdk` 0.3.0, constructed as `new NoirAgentClient()` with no overrides.
- **Contracts:** the deployed 2026-10-24 Testnet contracts, which are the SDK's built-in defaults. The server and every script assert this at startup ([contracts.ts](packages/shared/src/contracts.ts#L10), [index.ts](apps/server/src/index.ts#L31)).

| Contract | Address |
|---|---|
| device_registry | `CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5` |
| agent_registry | `CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV` |
| payment_escrow | `CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS` |

| SDK call | Where |
|---|---|
| `execute` → `registerDevice` | [scripts/setup.ts:55](scripts/setup.ts#L55) |
| `execute` → `registerAgent` (XLM SAC, 1 XLM cap, 30-day expiry) | [scripts/setup.ts:69](scripts/setup.ts#L69) |
| `execute` → `fundEscrow` | [scripts/setup.ts:77](scripts/setup.ts#L77) |
| `checkPayment` | [packages/agent/src/run.ts:55](packages/agent/src/run.ts#L55) |
| `authorizePayment` (payee = the quote's artist) | [packages/agent/src/run.ts:61](packages/agent/src/run.ts#L61) |
| `claim` (one per artist, signed by that artist) | [apps/server/src/claim.ts:18](apps/server/src/claim.ts#L18), used by [scripts/claim.ts:13](scripts/claim.ts#L13) and `scripts/demo.ts` |
| `getEscrowToken` (startup asset check) | [apps/server/src/index.ts:32](apps/server/src/index.ts#L32) |
| `getPendingBalance`, `getEscrowBalance` | [apps/server/src/claim.ts:56](apps/server/src/claim.ts#L56) |
| `watch` (`payment.authorized`, filtered by `deviceHash`) | [apps/server/src/noirWatch.ts:19](apps/server/src/noirWatch.ts#L19) |

We use `watch`, so `startWebhookRelay` and `verifyWebhookSignature` aren't needed.

> [!WARNING]
> **SDK compatibility note.** SDK 0.3.0 throws away any RPC event without `inSuccessfulContractCall`. Stellar RPC v23 and later (Testnet runs v30) no longer send that field and only return events from successful calls. Without a fix, `watch`, `getEvents` and `startWebhookRelay` see nothing on Testnet today. [rpcShim.ts](apps/server/src/rpcShim.ts#L10) puts the flag back on the RPC response so the SDK's own decoder and `watch` work unchanged. Its test replays a real Testnet event to show both the bug and the fix ([rpcShim.test.ts](apps/server/src/rpcShim.test.ts#L1)).

---

## 💳 Velo integration

- **SDK:** `@carts1024/velo-sdk` pinned to exactly `0.1.0-alpha.4`, server side only.
- **What Velo does:** it takes the human's 1 XLM reel project fee and tells the server when it is paid. It never touches the agent's license payments.
- **Checkout:** `velo.checkout.sessions.create` for the 1 XLM reel project fee, with an idempotency key per reel ([velo.ts:72](apps/server/src/velo.ts#L72)).
- **Status:** `velo.paymentIntents.retrieve`, used as a fallback when the webhook is late ([velo.ts:101](apps/server/src/velo.ts#L101)).
- **Webhooks:** `Velo.webhooks.verify` on the raw body. Bad signatures get a 400, and duplicates are dropped by `x-velo-delivery` and by event id ([velo.ts:114](apps/server/src/velo.ts#L114)). The client is constructed in [index.ts:36](apps/server/src/index.ts#L36).

---

## ⛓️ Testnet proof

One reel from `npm run demo` (script "Rain at a night market in Manila, street food sizzle, crowd chatter", mood chill, budget 2.5 XLM), recorded on Nov 7 with the rules planner.

**License sheet, 3 assets from 3 artists, 0.35 XLM:**

| Asset | Artist | Price | License tx |
|---|---|---|---|
| 🎵 Low Tide Lo-fi (music) | Lowtide Loops | 0.18 XLM | [70bbd504…](https://stellar.expert/explorer/testnet/tx/70bbd5046ad853e82ec58cfec9d9eb739caa67e30244c3f1c82af9ec73823b29) |
| 🎞️ Night Market Lights (b-roll) | Paper Lantern Films | 0.12 XLM | [c447ac39…](https://stellar.expert/explorer/testnet/tx/c447ac39ac2554ea62965895dbe3f93e000aee6e94b7e7a8abd2539364ed8da5) |
| 🔊 Wok Sizzle (SFX) | Foley Fern | 0.05 XLM | [ebe9a228…](https://stellar.expert/explorer/testnet/tx/ebe9a228a72ac51437f3f60957b3536b6d8f7bcabf6ba8d6b80b75e1c6a119ba) |

> [!CAUTION]
> 🚫 Neon Crown (exclusive rights, 2 XLM) was refused by the card policy (`over_limit`), so no transaction exists for it.

<details>
<summary><b>💸 Artist payouts</b>, each signed by the artist's own key</summary>

<br/>

Each claim also collected earnings from earlier reels, so the amounts are larger than this reel's licenses:

- Lowtide Loops, 0.9 XLM: https://stellar.expert/explorer/testnet/tx/73afc85ed40164a9b658fa0fa4b6dd59460411b9cb8c86b9cfdad48489060683
- Paper Lantern Films, 0.45 XLM: https://stellar.expert/explorer/testnet/tx/7815d7e87fcc188b0833764309b35d254f9b8450d8c19e52c19959cd2b94fbb0
- Kestrel Studio, 0.08 XLM: https://stellar.expert/explorer/testnet/tx/ed06740e1436dab9a7584819167b34eb1489bd29b1bebeaf0da4900c14410292
- Foley Fern, 0.13 XLM: https://stellar.expert/explorer/testnet/tx/96029a4bd6285aab0ad390244d43613b0c0918630f69ccf897f66892ea8b5286

</details>

<details>
<summary><b>🎨 Artist accounts</b></summary>

<br/>

- Lowtide Loops: https://stellar.expert/explorer/testnet/account/GBLSA47JDN23GF6TGNQQLNOAQOWU7Y43EXGHNLPZY6MALYTCNLK2BQVK
- Paper Lantern Films: https://stellar.expert/explorer/testnet/account/GAGVLOURGZCBDHWT25URFH5J425LXMSCK5XZDW3P6UY64Z5BV4W3PC4C
- Kestrel Studio: https://stellar.expert/explorer/testnet/account/GA6ZWR7MMMXYRXO7YVFOZP4Z7BUM4ILLZFUGLFQDJEJGRXTWZTTQR4TA
- Foley Fern: https://stellar.expert/explorer/testnet/account/GB6VFK2RH5SKE4W4TBU5YM2UAARLUR676XOJ22LL3X5ITH4KSBVZFHLI

</details>

<details>
<summary><b>🪪 Card setup</b></summary>

<br/>

- registerDevice: https://stellar.expert/explorer/testnet/tx/3815d6413d3be7c49db9a11f92212c5ad1c49e50071cccbbf44d82b10d7d7b8c
- registerAgent: https://stellar.expert/explorer/testnet/tx/bb89266fe7e566a35e84f120434a9d38ddeeef571083f52b2f4dd0dda6e57e18
- fundEscrow: https://stellar.expert/explorer/testnet/tx/633ce0b13008c537086cd8b1b460772cd71d60bdba8d0b99b42d855d717d7007
- agent account: https://stellar.expert/explorer/testnet/account/GDH3XMBBEGNPBDSYU3GDUVV432P3PTY6GVQBSCKBKYVMVZHCHP47T2A5

</details>

---

## 📁 Repo structure

```
apps/web/        Vite + React site: start a reel, Library, Artists, Activity, Sample reel, license sheet, receipts, artist payouts
apps/server/     Express: stock library 402 API, Velo checkout + webhook, Noir watch, agent runner, artist payouts
packages/agent/  plan, pick, decide, paidFetch, runAgent (all Noir payment calls), optional Ollama planner
packages/shared/ asset catalog, artists, moods, contract IDs + assertion, XLM SAC, types, env reader
scripts/         setup.ts (rebuild Testnet state), claim.ts (pay out artists), demo.ts
docs/            architecture, screenshots, design specs and plans
```

---

## 🚀 Run it locally

**1. Prerequisites.**
   - Node 24.22.1 or a later 24.x (`.nvmrc`).
   - Wallet: none to install. `npm run setup` creates the owner, agent and artist keys. To pay a real Velo checkout, you also need a Stellar Testnet wallet that holds the 1 XLM fee.
   - Testnet XLM: `npm run setup` gets it from friendbot.

**2. Install at the root.**

   ```bash
   npm install
   ```

**3. Copy `.env.example` to `.env` and fill it in.**

   ```bash
   cp .env.example .env
   npm run setup        # creates and funds the owner, agent and 4 artist accounts, registers the card, funds escrow; writes .env
   ```

   Then set `WEB_ORIGIN=http://localhost:5173` and add `VELO_API_KEY` and `VELO_WEBHOOK_SECRET`. The table below says where each value comes from. `npm run setup` is idempotent. Rerun it after a Testnet reset.

**4. Start it.**

   ```bash
   npm run dev:server   # API on :8787 (needs VELO_* and WEB_ORIGIN in .env)
   npm run dev:web      # site on :5173 (calls http://localhost:8787 unless VITE_API_URL is set)
   ```

   Other commands:

   ```bash
   npm test             # 163 unit tests
   npm run demo         # one reel end to end on Testnet, then artist payouts; prints every link
   npm run claim        # pay out every artist with pending earnings
   ```

> [!TIP]
> To try the site locally without a Velo checkout, set `DEV_ROUTES=1` in `.env`, give `VELO_API_KEY` and `VELO_WEBHOOK_SECRET` any placeholder value (the server won't start without them, and only the Velo checkout needs real ones), and click **Run test reel without Velo (local only)** on the start page. That button exists only in the `npm run dev:web` build, never in production. You can also start a reel with `curl -X POST localhost:8787/api/dev/jobs -H 'content-type: application/json' -d '{"mood":"chill","budget":"2.5"}'` (the script defaults to the demo script). Reels run one at a time because they all pay with the same agent key.

---

## ⚙️ Environment variables

<details open>
<summary><b>Show all variables</b></summary>

<br/>

| Name | What it is | Where to get it |
|---|---|---|
| `OWNER_SECRET` | Card owner's Testnet secret key | Written by `npm run setup` |
| `AGENT_SECRET` | The agent's constrained key (server only) | Written by `npm run setup` |
| `ARTIST_LOWTIDE_SECRET`, `ARTIST_LANTERN_SECRET`, `ARTIST_KESTREL_SECRET`, `ARTIST_FERN_SECRET` | Each artist's account, which receives license payments and claims them (server only) | Written by `npm run setup` |
| `DEVICE_UID` | Demo card UID (no NFC hardware) | `npm run setup` picks one on a fresh clone and writes it to `.env` |
| `DEVICE_HASH` | SHA-256 of `DEVICE_UID`, the card's Noir ID | Written by `npm run setup` |
| `VELO_API_KEY` | Velo API key (server only) | Velo dashboard |
| `VELO_WEBHOOK_SECRET` | Velo webhook signing secret (server only) | Velo dashboard, webhook settings |
| `WEB_ORIGIN` | Public URL of the site (CORS, checkout return URLs) | `http://localhost:5173` locally, your Vercel URL when deployed |
| `VITE_API_URL` | API URL baked into the site at build time | Your Render URL. Without it the site calls `http://localhost:8787` |
| `DEV_ROUTES` | `1` turns on `POST /api/dev/jobs`, which starts a reel without a Velo checkout. Local only. ⚠️ Never set it on Render, because anyone could spend the card's escrow | Set it yourself in your local `.env` |
| `PORT` | Port the API listens on | Defaults to `8787` |
| `NODE_ENV` | Set to `production` on Render so error responses don't include stack traces | Render environment settings |
| `AGENT_LLM` | Ollama model that reads the script and tags each slot (e.g. `qwen2.5:3b-instruct`). Empty: rules only. If Ollama is down, the agent falls back to the rules | `ollama pull qwen2.5:3b-instruct` |
| `OLLAMA_URL` | Ollama address | Defaults to `http://localhost:11434` |

</details>

**Deploying:** see [docs/deploy.md](docs/deploy.md).

---

## 📸 Screenshots

<table>
<tr>
<td width="50%" valign="top">

**Start page:** the lane board shows each lane's top price against the card's 1 XLM limit.

![Start page](docs/screenshots/start.png)

</td>
<td width="50%" valign="top">

**A finished reel**, started locally with the dev trigger: the license sheet with Testnet links, the exclusive refused by the card, and the agent's decisions.

![Job page](docs/screenshots/job.png)

</td>
</tr>
</table>

---

## 🔭 What's next

- [ ] Real catalogs: let artists upload media and set their own per-use price.
- [ ] Several libraries competing on price for the same mood and scene.
- [ ] Persistent reels, so a server restart doesn't clear them.
- [ ] Upstream the RPC v23+ event fix to `@noirx402/agent-sdk`.

## 🙏 Credits

Built on [Noir](https://github.com/noirx402/noir) (`@noirx402/agent-sdk`), Velo (`@carts1024/velo-sdk`), the Stellar SDK (`@stellar/stellar-sdk`) and Stellar Testnet. x402 is the payment pattern. The site uses React, Vite and three.js, with Archivo and DotGothic16 from Fontsource. The server uses Express. Tooling: tsx and Vitest. The repo began as Tollbooth, a pay-per-call data agent; the demo card's `DEVICE_UID` keeps that name on purpose, because changing it would register a new device and escrow.

<div align="center">
<br/>

**[🌐 Try ClipPass](https://clippass.vercel.app)** · **[🎥 Watch the demo](https://drive.google.com/file/d/1mu6MamAPaJziIpwkmjhGZtsRPoO5Isff/view?usp=drive_link)** · **[📊 See the deck](https://canva.link/57e2wzvuxz13ape)**

</div>
