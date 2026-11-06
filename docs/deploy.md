# Deploying ClipPass (Render + Vercel)

Follow these steps to deploy the Express API on Render and the React web app on Vercel against Stellar Testnet.

1. **Generate keys and Testnet state locally:** Run `npm run setup` from the repo root. This funds the accounts on Stellar Testnet, registers the device and agent policy, tops up the XLM escrow, and writes the generated secrets (`OWNER_SECRET`, `AGENT_SECRET`, `ARTIST_LOWTIDE_SECRET`, `ARTIST_LANTERN_SECRET`, `ARTIST_KESTREL_SECRET`, `ARTIST_FERN_SECRET`, `DEVICE_UID`, and `DEVICE_HASH`) to your local `.env` file.
2. **Create the Render web service:** Create a new Blueprint service on Render from [`render.yaml`](../render.yaml) at the repo root (Node `24.22.1` from [`.nvmrc`](../.nvmrc), build command `npm ci`, start command `npm -w @clippass/server start`, health check `/health`). Paste the secret values from your local `.env` into Render's environment settings (`AGENT_SECRET`, `ARTIST_LOWTIDE_SECRET`, `ARTIST_LANTERN_SECRET`, `ARTIST_KESTREL_SECRET`, `ARTIST_FERN_SECRET`, `DEVICE_HASH`). Never commit `.env` or any keys to the repository. Render injects `PORT` automatically.
3. **Create the Vercel project:** Import the repository into Vercel with the Root Directory set to `apps/web` and Framework Preset set to `Vite`. Set the Install Command to run from the repo root (for example, `cd ../.. && npm ci`) so npm workspaces (`@clippass/shared`, etc.) resolve properly. Set the `VITE_API_URL` environment variable in Vercel to your Render service URL (with no trailing slash).
4. **Configure cross-origin URLs on Render:** Set `WEB_ORIGIN` on Render to your deployed Vercel origin (with no trailing slash, as required by CORS and Velo checkout redirects).
5. **Get a Testnet Velo API key:** Obtain a Testnet API key at `velo-build.dev` and paste it into `VELO_API_KEY` on Render.
6. **Configure the Velo webhook:** Register the webhook URL `<render-url>/webhooks/velo` in Velo, copy its webhook signing secret, and set `VELO_WEBHOOK_SECRET` on Render.
7. **Test one real checkout:** Open the Vercel URL, submit a reel brief to open a real Velo Testnet checkout, complete payment, and confirm that the job transitions to `paid` and `done` with on-chain license transactions and artist payouts.

## Production Warnings & Notes

- **Never set `DEV_ROUTES` on Render:** Setting `DEV_ROUTES=1` enables `/api/dev/jobs`, which starts paid agent runs without a Velo checkout. On a public server, anyone could call that endpoint and drain the card's XLM escrow.
- **In-memory reel state:** Jobs (`JobStore`) and 402 quotes (`QuoteStore`) live entirely in server memory by design. If a free-tier Render instance sleeps or restarts, in-flight or previously completed reels in memory are lost, so switch `plan` in `render.yaml` to an always-on plan for judging.
