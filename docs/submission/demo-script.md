# ClipPass demo video: 2-minute script

**Before recording**
- Deploy the site and use the live URL, not localhost.
- Start with a real Velo checkout if it's working. If not, record locally with the test reel button and say so.
- Check the card has at least 3 XLM in escrow.
- A reel takes about a minute on Testnet. Speed that section up in editing and say so on screen.
- Keep sound on. The sound design carries part of this.

| Time | On screen | Say |
|---|---|---|
| 0:00 to 0:12 | Start page, reel moving | "Creators pay monthly stock subscriptions for two or three clips. Artists earn pennies from pooled royalties. ClipPass replaces that with an AI agent that pays each artist per use." |
| 0:12 to 0:30 | Type a script and watch tags appear. Pick a mood. Slide the budget | "I describe the reel and set a budget. The page previews the tags the agent will match. I've given it a Noir card with a hard limit of 1 XLM per payment." |
| 0:30 to 0:42 | Click Start reel, show Velo checkout | "I pay one flat project fee through Velo. Velo's signed webhook starts the agent. From here, no human touches a payment." |
| 0:42 to 1:05 | Job page, frames developing, first paid rows | "Each asset answers 402 with its price and the artist's own address. The agent picks the cheapest match, checks the card, and pays that artist directly." |
| 1:05 to 1:22 | The refused frame and pencil ring | "Here's the part I care about. The agent tried a 2 XLM exclusive track. The card said no. That limit lives in the Noir contract, so the agent can't get around it." |
| 1:22 to 1:40 | Finished license sheet, click one transaction to Stellar Expert | "Six assets from four artists. Every license is a real Testnet transaction, and here's the proof." |
| 1:40 to 1:52 | Click Pay out artists, payout links appear | "Artists collect with their own keys." |
| 1:52 to 2:00 | Reel on screen | "ClipPass. The agent spends on its own, inside limits it can't exceed." |

## Live pitch backup (5 minutes plus 3 of Q&A)

- Bring a laptop with the demo running and this video downloaded, in case the network fails.
- Likely questions:
  - **Is the media real?** No, it's mocked by design. The payments are real Testnet transactions.
  - **Who pays the Velo fee?** The creator, once per reel.
  - **What stops the agent overspending?** The per-payment cap in the Noir contract, plus its own budget check.
  - **Why does `rpcShim.ts` exist?** The Noir SDK dropped events on current Stellar RPC, so we restore one field on the response. All payments still go through the SDK.
