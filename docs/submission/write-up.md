# ClipPass write-up

For the submission form's short write-up. Paste as is, or trim.

## The problem

Short-form creators need two or three licensed assets for a reel, but stock media is sold as a monthly subscription. When a music claim hits, they rarely have clean proof of what they paid for. Small artists, meanwhile, earn tiny pooled royalties instead of being paid for each use.

## How the agent works

A creator describes a reel, picks a mood and sets a budget of 2 to 5 XLM. The agent turns that into four slots: one exclusive track, one music track, one b-roll clip and one sound effect. For each slot it ranks unused assets by matching tags, then by price, and records why it chose one over the next.

Each asset answers `402 Payment Required` with its own price and its artist's Stellar address. The agent skips anything over the remaining budget or above the catalog's listed price. Then it checks the card policy and pays. No human click triggers an asset payment.

Every reel also tries a 2 XLM exclusive track. That's above the card's 1 XLM per-payment cap, so the Noir contract refuses it with `over_limit`. The limit is enforced on-chain, not by the app.

## The payment flow through Velo and Noir

1. **Velo:** the creator pays a flat 1 XLM project fee through a Velo checkout. Velo's signed `payment.succeeded` webhook starts the agent. If the webhook is late, the server checks the payment status directly.
2. **Noir setup:** the owner registers a card, sets the agent's policy (XLM only, 1 XLM per payment, 30-day expiry) and funds the escrow.
3. **Noir payment:** the agent calls `checkPayment`, then `authorizePayment` to the artist's address, using its own constrained key.
4. **Verification:** the server watches `payment.authorized` events and releases the license only if the payee, device, amount and contract match, and the transaction and quote are unused.
5. **Payout:** each artist collects their earnings with `claim`, signed with their own key.

## Proof

A reel licenses 3 assets from 3 artists on Stellar Testnet, with a link to every transaction. The media is mocked by design, and the payments are real Testnet transactions. See the Testnet proof section in the README.
