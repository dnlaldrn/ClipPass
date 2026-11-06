# What only you and Daniel can do

Submissions close **Sat Nov 7, 12:00 PM (UTC+8)**. Work in this order, and start early enough to fix a Velo problem.

1. **Review and merge** `fix/handbook-compliance` into `main`. README line links only match after this.
2. **Daniel makes the repo public** (GitHub, Settings, General, Danger Zone). Requirement 5. It needs admin access.
3. **Get a Testnet Velo API key** at velo-build.dev. Sign in with a Stellar wallet, create a project, generate the key.
4. **Deploy** using [docs/deploy.md](../deploy.md). Render for the API, Vercel for the site. Requirement 6.
   - Use your own `.env` values. Never commit them.
   - Never set `DEV_ROUTES` on Render.
   - Use an always-on plan for judging, or reels vanish when the server sleeps.
5. **Test one real checkout. This is the biggest open risk.** It has never run with a real key.
   - Pay the fee and confirm the reel starts from the webhook.
   - If Velo rejects the `native` asset, stop and bring me the exact error.
6. **Check the live site on a phone** and open `/sample` in a private window.
7. **Listen to the sound.** Nobody on the AI team can hear it. Turn it on and run a reel.
8. **Record the 2-minute video** using [demo-script.md](demo-script.md). Keep the file as your backup for the live pitch.
9. **Share the pitch deck** from its Share menu, or export a PDF. Add your team name and live URL on the last slide.
10. **Fill the README top block:** Live website, Demo video, Pitch deck, Team as `Name (Discord handle)`.
11. **Confirm everyone registered** on the Google Form by the Nov 4 deadline.
12. **Submit** at https://forms.gle/hQ73PnsR1w2YwAq57 with the repo link, video, deck, [write-up](write-up.md), live URL, team and a Stellar Expert link.

## Worth doing

- Ask in #noir-sdk-and-extension whether `apps/server/src/rpcShim.ts` is fine under "only through the SDK". It only restores one field on RPC responses, and the README discloses it.
- Top up escrow before judging by running `npm run setup` once with your production keys. It adds 20 XLM only when escrow is under 10 XLM.
