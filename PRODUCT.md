# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary visitors are hackathon judges evaluating a submission, often watching on a projector, a shared screen or a 2-minute demo video. They need to see an AI agent make real payment decisions and to verify the payments on-chain in one click. The story they are shown is a short-form creator's: someone who needs two or three licensed assets for one reel and does not want a monthly stock subscription.

## Product Purpose

ClipPass is an AI agent that licenses stock media per reel. A creator describes a reel (a script of up to 500 characters and a mood) and sets a license budget of 2 to 5 XLM. The agent plans one music track, three b-roll clips and two sound effects, picks the cheapest asset that matches the script and mood, and pays each artist per use from a Noir card escrow on Stellar Testnet. Every asset arrives with a license tied to a Stellar transaction. Success is a judge watching a reel go from script to a license sheet of 6 assets from 4 artists, each with a payment link, plus a visible card refusal of the 2 XLM exclusive-rights track.

## Positioning

The agent spends on its own, inside limits it cannot exceed. Each 402 quote names the artist's own Stellar account, the agent pays that account directly through its constrained Noir key, and the server verifies the payment on-chain before it releases the license. The card's 1 XLM per-payment cap is enforced by the Noir contract, not by the app, so the exclusive track is refused on every run. The payment transaction is the license receipt.

## Operating Context

- Flow: start page (script, mood, budget) → Velo checkout for the flat 1 XLM reel project fee → job page that polls every 2 seconds while the agent works (about a minute on Testnet) → license sheet and the agent's decision trace → "Pay out artists", where each artist claims their pending earnings with their own key.
- Lanes: Music, B-roll, SFX, Exclusive. Price ranges: SFX 0.03–0.07, B-roll 0.08–0.15, Music 0.15–0.30, Exclusive 2 XLM (above the 1 XLM card limit).
- Agent decisions shown to the visitor: plan, skip (over budget, quote above listed price, lane used up), refused (by the card policy, e.g. `over_limit`), paid (with the pick reason, e.g. "picked Wok Sizzle over Market Crowd: same match, 0.02 cheaper"), failed, done (summary).
- Every payment, payout and account links to stellar.expert (Testnet).
- Local demos run through a dev route that starts a reel without Velo; `npm run demo` prints the same flow in a terminal.

## Capabilities and Constraints

- Stellar Testnet only; no real money moves.
- Media is mocked by design: a 14-asset catalog from 4 fictional studios (Lowtide Loops, Paper Lantern Films, Kestrel Studio, Foley Fern); preview and download links use the reserved `clippass.example` domain. There are no real audio or video files to play.
- Reels live in server memory; a server restart clears them and the job page must say so.
- Reels run one at a time (one agent key).
- Moods: upbeat, chill, dramatic, cinematic.
- Stack: Vite + React 18 SPA in `apps/web`, deployed on Vercel; API is Express on Render. The web bundle must not import the Stellar SDK; shared catalog values are mirrored in `apps/web/src/mirror.ts`, guarded by a test.
- Optional local Ollama planner (`AGENT_LLM`) tags b-roll and SFX slots; music always keeps the creator's mood.

## Brand Commitments

- Name: ClipPass. The repo began as Tollbooth; that name must not appear in the product UI.
- Voice: plain, factual, short sentences; states what happened and why (for example "The card's policy refused it: over_limit").
- Built on Noir (`@noirx402/agent-sdk`), Velo (`@carts1024/velo-sdk`) and Stellar Testnet; payment pattern inspired by x402. Credit these accurately.

## Evidence on Hand

- Real Testnet run (README "Testnet proof"): 6 licenses from 4 artists, 0.63 XLM, Neon Crown refused `over_limit`, 4 artist payouts, all with stellar.expert links.
- Card setup transactions and the four artist account links (README).
- No testimonials, users, customers, press, pricing or metrics exist. Do not invent any.

## Product Principles

1. The agent decides; the human pays once. No human click ever triggers an asset payment.
2. Every claim is verifiable: a price, a refusal or a payment always shows its reason or its transaction.
3. The card limit is the hero constraint. The refusal is a feature to show, not an error to hide.
4. Artists are paid directly, per use; the license sheet names who was paid for what.
5. Honest about the demo: Testnet, mocked media, in-memory reels, all stated plainly.
