# ClipPass demo video: 2-minute script

**Before recording**
- Use the live site, https://clippass.vercel.app, not localhost. Redeploy first if `main` has moved since the last deploy.
- Open the site a minute early. The Render server sleeps when idle and takes about a minute to wake up.
- Pay the Velo checkout with Freighter. Noir isn't in Velo's wallet list.
- Check the card has at least 3 XLM in escrow.
- Set up the Noir extension as Foley Fern and do one dry run of the claim before recording.
- Don't press **Pay out artists** before the Noir claim shot. The server holds a copy of Foley Fern's key and would collect the earnings first.
- Keep sound on. The sound design carries part of this.

**Fast-forward plan.** A reel makes three real Testnet payments, one after another, and each waits for Stellar to confirm it. That's 15 to 40 seconds per payment. Record the whole reel in real time, then in editing:
- Keep the refusal and the first payment at real speed.
- Speed up the other two payments to about 10 seconds, with the real factor on screen (for example "8× speed").
- Return to real speed for the license sheet.
- Never cut a payment out. Only speed up the waiting.

| Time | On screen | Say |
|---|---|---|
| 0:00 to 0:10 | Start page | "Creators pay monthly stock subscriptions for two or three clips. Artists earn pennies from pooled royalties. ClipPass replaces that with an AI agent that pays each artist per use." |
| 0:10 to 0:22 | Type the reel prompt, open Mood and Budget, watch the matched tags appear | "I describe the reel and set a budget. The agent gets a Noir card with a hard limit of 1 XLM per payment." |
| 0:22 to 0:32 | Click **Velo checkout · 1 XLM**, pay with Freighter | "I pay one flat project fee through Velo. Velo's signed webhook starts the agent. From here, no human touches a payment." |
| 0:32 to 0:44 | Job page: the refused exclusive frame, real speed | "First, the agent tries a 2 XLM exclusive track. The card says no. That limit lives in the Noir contract, so the agent can't get around it." |
| 0:44 to 1:04 | The first paid asset, real speed | "Each asset answers 402 with its price and the artist's own address. The agent checks the card, pays that artist directly and waits for Stellar to confirm." |
| 1:04 to 1:14 | The other two payments, sped up, speed label on screen | "Two more real payments, sped up. Only the waiting is cut." |
| 1:14 to 1:32 | Finished license sheet, click one transaction to Stellar Expert | "Three assets from three artists. Every license is a real Testnet transaction, and here's the proof. The creator keeps the receipt." |
| 1:32 to 1:52 | Open the Noir extension as Foley Fern, show the waiting payment, press Claim | "Foley Fern made the sound effect. The payment is waiting in the studio's own Noir wallet, and the studio claims it there." |
| 1:52 to 2:00 | Reel on screen | "ClipPass. The agent spends on its own, inside limits it can't exceed." |

## Live pitch backup (5 minutes plus 3 of Q&A)

- Bring a laptop with the demo running and this video downloaded, in case the network fails.
- Run one reel before the judges arrive and keep its finished page open, so nobody waits through a live reel. Keep the Sample reel page open as the instant version.
- Likely questions:
  - **Is the media real?** No, it's mocked by design. The payments are real Testnet transactions.
  - **Who pays the Velo fee?** The creator, once per reel.
  - **What stops the agent overspending?** The per-payment cap in the Noir contract, plus its own budget check.
  - **Why does a reel take a few minutes?** It makes three real payments in order, and each waits for Stellar to confirm. They can't run in parallel because they all come from one agent account.
  - **Does only the artist hold their key?** Not in the demo. The server keeps a copy so Pay out artists works for every artist. In the real product, each artist would claim from their own wallet only.
  - **Why does `rpcShim.ts` exist?** The Noir SDK dropped events on current Stellar RPC, so we restore one field on the response. All payments still go through the SDK.
