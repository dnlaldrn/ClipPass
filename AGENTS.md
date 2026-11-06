# ClipPass team file

The single source of truth for every AI working in this repo. Only the orchestrator edits this file. Workers read it, do their one task, and report back.

## Mission

Make ClipPass ready to be judged at the Velo x Noir Agentic Payment Hackathon, without going live. Submissions close **Sat Nov 7, 12:00 PM (UTC+8)**. Work lands on branch `fix/handbook-compliance`.

## Hard limits

- Never deploy, make the repo public, submit a form or post anywhere.
- Never push. Never touch `main`. Workers do not commit: leave your changes in your worktree and the orchestrator reviews and commits them.
- Never read, copy or print `.env` or any secret. Never commit a key.
- Never use `GEMINI_API_KEY` or the Gemini API.
- Testnet only. No invented users, metrics, testimonials or partners.
- Edit only the files your task owns. Anything else you notice goes in your report.

## Project facts

- npm workspaces monorepo: `apps/web` (Vite + React 18), `apps/server` (Express), `packages/agent`, `packages/shared`, `scripts/`.
- Node `>=24.22.1 <25`. Install with `npm ci`.
- Payments go only through `@noirx402/agent-sdk` on the Testnet contracts in `packages/shared/src/contracts.ts`. Velo is `@carts1024/velo-sdk`, server side only.
- All amounts are `bigint` stroops, converted with `toStroops` and `fromStroops`.
- The web bundle must not import the Stellar SDK. Shared values are mirrored in `apps/web/src/mirror.ts`.
- Product truth is `PRODUCT.md`. Visual truth is `DESIGN.md`. The hackathon format rules for `README.md` are in task D1.
- The UI never says "Tollbooth". The `DEVICE_UID` default keeps that name on purpose.

**Definition of Done:** `npm test`, `npx tsc -p tsconfig.json --noEmit`, `npx tsc -p apps/web/tsconfig.json --noEmit` and `npm -w @clippass/web run build` all pass.

## Team and routing

Tested on Nov 6. Each tool answered a one-line prompt from an empty folder.

| Role | Model | Runs through |
|---|---|---|
| Orchestrator, UI Director, Asset Orchestrator | Claude Opus 5.5 | Claude Code session |
| UI Engineer, Feature Developer | OpenAI Sol 6.1 | `codex exec -m gpt-6.1-sol -c 'windows.sandbox="unelevated"' --sandbox workspace-write` with stdin closed |
| Feature Developer, independent reviewer | Claude subagents | Claude Code Agent tool |
| E2E Tester | OpenAI Terra 6.1 | `codex exec -m gpt-6.1-terra` |
| Repo Architect, Validator | Gemini 4 Argon | `agy --model gemini-4-argon-medium` |
| Vector work | GPT Image 2.6 unavailable here | Hand-written SVG by Claude |
| Bulk images | Nano Banana 2 unverified | Only via `agy` or a browser, never the API |

## Task board

| ID | Task | Owner | Status | Files owned |
|---|---|---|---|---|
| B1 | Fresh-clone setup picks a unique `DEVICE_UID`; add `PORT` to `.env.example` | Sol 6.1 | Merged | `scripts/setup.ts`, new test in `scripts/`, `.env.example` |
| B2 | Deploy readiness, no deploying | Gemini 4 Argon | Merged | `render.yaml`, `docs/deploy.md` |
| D1 | README in the handbook format | Claude | Merged | `README.md`, `scripts/readme-links.test.ts` |
| F1 | Site redesign: far less copy, more real UI, motion, sound | Claude directs, Sol 6.1 builds | Merged | `apps/web/**`, `DESIGN.md` |
| F2-A | Server: JSON errors, balance cache, low escrow, license body, catalog, activity | Sol 6.1 | Merged | `apps/server`, `packages/agent`, `packages/shared` |
| F2-B | Web core: error states, routes, sample reel, receipt | Claude subagent | Merged | `App.tsx`, `JobPage.tsx`, `api.ts`, new view files |
| F2-C | Library, Artists, Activity pages | Sol 6.1 | Merged | `apps/web/src/pages/*`, `apps/web/src/pages.css` |
| S1 | Write-up, demo script, pitch deck, logo | Claude | Queued | `docs/submission/**` |
| Q1 | End-to-end browser test | Terra 6.1 | Queued | None; reports only |
| R1 | Independent review of the full diff | Claude subagent | Queued | None; reports only |

## Decision and handoff log

Newest first.

- **Nov 6:** Sol cannot run vitest or vite in its sandbox (esbuild `spawn EPERM`). It writes tests and runs `tsc`; the orchestrator runs the rest. It also cannot open a browser, so the orchestrator reviews every screen.
- **Nov 6:** Scope for F2 is in `docs/team/f2-spec.md`. Code freeze is 8:00 AM.

- **Nov 6:** Codex can exit with code 0 having done nothing. The default Windows sandbox failed to start on this machine, so use the unelevated setting and always check the diff, not the exit code.
- **Nov 6:** The owner asked for a less wordy site with more UI, motion and sound, so F1 grew from visual QA to a redesign pass inside the existing Edge-Code Reel world.
- **Nov 6:** `node_modules` must be reinstalled after moving a checkout, because npm's workspace links store absolute paths.
- **Nov 6:** No Gemini API, by request. The Gemini CLI has only the API key, so Gemini runs through `agy`.
