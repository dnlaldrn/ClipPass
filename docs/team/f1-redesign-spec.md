# F1: less copy, more product (spec from the UI Director)

Refinement inside the Edge-Code Reel world in `DESIGN.md`. Same palette, fonts, square corners, no shadows, no cards, reel stays the hero. The site reads like a web3 product, not an article: data, controls and motion carry the meaning. Sentences of explanation go.

Rules that still hold: red only for refusals and failures. Yellow only on black. Every price, refusal reason and tx link stays in the DOM. No emoji or unicode icons: draw icons as inline SVG, 2px square-capped strokes. No new npm dependencies. No eyebrow labels above headings. Do not invent data. `PRODUCT.md` honesty holds: Testnet, mocked media and in-memory reels stay stated, in few words.

## Shared

- **Header:** wordmark only (drop the tagline). Right side: network badge `STELLAR TESTNET` with a small live dot, and the sound toggle.
- **Footer:** one edge-print line: `TESTNET ONLY · MOCKED MEDIA · REELS RESET ON RESTART · NOIR + VELO`. Must wrap cleanly on phones.
- **`src/Identicon.tsx`:** deterministic 5x5 mirrored square grid from a hash of the address, in acetate and print on frame black. Decorative, `aria-hidden`.
- **`src/Address.tsx`:** short `GBXW…BQVK` in edge print, a copy button (icon, `aria-label`, swaps to a check for 1.2s), and an explorer link icon. Add `accountLink` use from `format.ts`.
- **`src/Hash.tsx`:** same treatment for tx hashes.
- **`src/CountUp.tsx`:** tabular number rolling from old to new value over 450ms with exponential ease-out. Exact final value from `xlm()`. No float math for the final text. Static under reduced motion.

## Start page (`StartJob.tsx`)

Remove the `.intro` paragraph, the hint, and the long caption. Target: under 40 words of visible prose outside the form labels, footer and gauge.

- **Hero:** `h1` becomes `Your reel, licensed by an agent.` One line under it: `Set a budget. It pays every artist per use.`
- **Reel:** unchanged, with one compact link under it: `Real Testnet replay` with an external-link icon, using the existing `txLink(DEMO_REEL[1].hash!)`. Keep the `Neon Crown, 2 XLM: refused by card, over_limit` pencil line.
- **Live strip:** `src/ChainStrip.tsx`, a rule-drawn row of 3 stats from `getBalances()`: `CARD ESCROW` (CountUp), `CARD LIMIT 1 XLM`, `ARTISTS 4`. If the API is down, escrow shows `—` and the page still works. No polling faster than 10s, and stop when the tab is hidden.
- **Pipeline:** `src/Pipeline.tsx` replaces the explanation: four nodes joined by a line, each with a drawn icon and an edge label: `402 QUOTE`, `AGENT PICKS`, `CARD CHECK`, `PAID + LICENSED`. A small acetate square travels along the line in a 4s loop, and each node lights as it passes. Only runs in view. Under reduced motion it's static with all nodes lit. On phones it becomes a vertical line. `aria-label` carries the plain sentence.
- **Form as a console** (keep the existing `submit` logic and the dev-only `startTestReel` button):
  - Script: black leader textarea with a character counter in edge print (`67/500`).
  - **Live tags:** under the script, chips for tags the agent would match, using the same prefix rule as `packages/agent/src/plan.ts`. Add `BROLL_TAGS` and `SFX_TAGS` to `src/mirror.ts`, and extend `mirror.test.ts` to guard them against `laneTags`. Export `matchTags(script)` from `src/format.ts` with a test. Chips pop in with a shutter tick. Empty state shows `USING MOOD`.
  - Mood: a radio group styled as four square segments (real `input type=radio`, keyboard arrows work), not a `<select>`.
  - Budget: a range input from 2 to 5, step 0.1, custom square thumb and acetate fill, with the value in large tabular type. Still sends a string like `2.5`.
  - Button: `Start reel · 1 XLM`. Small edge line under it: `CHECKOUT BY VELO`.
- **Gauge:** keep `Lanes`, compact, under the form.

## Job page (`JobPage.tsx`)

- **Header:** keep the headline logic, script line and facts strip, but numbers use CountUp. Add a **budget meter** under the facts: spent of budget, bar in acetate, sum of `licenses[].price` as bigint. Keep the existing Velo row.
- **License sheet:** each row gets an Identicon before the artist, the artist as an `Address`-style link, and a `Hash` for proof. New rows **develop**: `clip-path` wipe left to right plus brightness from 0.3 to 1 over 500ms, with a short warm background flash that settles.
- **Agent log** (rename `How the agent decided`): a vertical timeline with a status icon per line.
  - The `plan` line shows slot chips (the seven lanes in order) and hides its long sentence inside `<details>` labelled `Full plan`.
  - Paid lines show only the part of `reason` before the first `;`, so `within budget and card policy` drops. The tx link stays.
  - Refused line: `over_limit` in edge print with the pencil ring, which **draws itself** (stroke-dashoffset, 600ms) and then stays.
  - `done` line: split the summary into its three lines, as a compact result.
  - While running, a pulsing `AGENT WORKING` row sits at the end. Lines enter with a 200ms fade and small rise.
- **Payout:** when `balances` shows pending earnings, list each artist with Identicon, name and amount above the button. Payout takes a minute, so while `claiming` show an indeterminate acetate sweep across the list and `Paying out…`. On success each row swaps to a payout link. Drop the explanatory hint.
- **Finish moment:** when status flips to `done` during a session, a `LICENSED` edge-print stamp scales in beside the headline once (not on reload of a finished reel), with the done sound.

## Sound (`src/sound.ts`)

All synthesised with Web Audio, no audio files. The sound world is a film projector and editing bench. Master gain 0.3, gentle, nothing harsh, every cue under 700ms except the hum.

- Cues: `tick` (filtered noise click, for chips, segments, slider steps), `press` (button shutter), `advance` (sprocket clack: low thump plus two noise clicks), `paid` (advance plus a warm two-note chime), `refused` (dull low thud plus a short bandpassed scratch like a grease pencil), `done` (three rising warm notes), `payout` (quick ascending ticks), `hum` (start and stop: very quiet filtered noise with a slow flutter, only while the agent runs).
- API: `sound.play(name)`, `sound.setEnabled(bool)`, `sound.enabled()`, `sound.startHum()`, `sound.stopHum()`, `sound.unlock()`. Lazily creates the `AudioContext`. Never throws: if audio isn't available, every call is a silent no-op.
- `src/SoundToggle.tsx`: speaker icon button with `aria-pressed` and label. Saved in `localStorage` in try/catch. **On by default**, but audio only starts after a user gesture (browser rule). Call `unlock()` on the first pointer or key event. If still locked on the job page, the toggle gently pulses until pressed.
- Job page: compare the previous and new `trace` length and play one cue per new decision by action, spaced 150ms if several arrive in one poll. Don't replay history on load: the first poll only records the count. Start the hum while running, and stop on done, failed or unmount.
- Make the test-reel button navigate without a full reload (`history.pushState` plus App state) so audio stays unlocked. The Velo flow keeps `location.href`.
- Respect the toggle everywhere. Reduced motion does not mute sound.

## Motion rules

Focal moment stays the reel. DOM motion only explains state. Use `cubic-bezier(0.16, 1, 0.3, 1)`. No bounce. Content visible by default if JS animation fails. Keyframes are CSS where possible. The current reduced-motion block kills only transitions, so extend it to cover animations, keeping colour and opacity state changes.

## Done means

- Definition of Done in `AGENTS.md` passes, with tests for `matchTags`, the tag mirror, and the sound preference and no-audio fallback.
- Works at 375px and 1440px with no horizontal page scroll.
- Keyboard: all controls reachable, visible focus, radios and slider work.
- `DESIGN.md` updated with the new components, a Sound section and the motion rules.
- Nothing else changes: no server, agent or README edits. If you need one, say so in your report instead.
