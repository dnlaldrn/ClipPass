import { Router } from 'express'
import { NoirContractError, type NoirAgentClient, type NoirSigner } from '@noirx402/agent-sdk'
import { ARTISTS, XLM_SAC, type ArtistId } from '@clippass/shared'

const IDS = Object.keys(ARTISTS) as ArtistId[]

/** Each artist with earnings claims them with their own key (artists collect; not an agent payment). */
export async function payOutArtists(
  noir: Pick<NoirAgentClient, 'getPendingBalance' | 'claim'>,
  artists: Record<ArtistId, NoirSigner>,
  onClaim?: () => void,
): Promise<{ artist: ArtistId; name: string; amount: string; hash: string }[]> {
  const claims = []
  for (const id of IDS) {
    const pending = await noir.getPendingBalance(artists[id].publicKey)
    if (pending === 0n) continue
    try {
      const { hash } = await noir.claim({ merchant: artists[id], token: XLM_SAC })
      onClaim?.()
      claims.push({ artist: id, name: ARTISTS[id].name, amount: pending.toString(), hash })
    } catch (e) {
      if (!(e instanceof NoirContractError && e.errorName === 'NothingToClaim')) throw e
    }
  }
  return claims
}

/** Escrow and per-artist balances, and "Pay out artists". */
export function claimRouter(d: { noir: NoirAgentClient; artists: Record<ArtistId, NoirSigner>; deviceHash: string }): Router {
  const r = Router()
  type Balances = { escrow: string; artists: { id: ArtistId; name: string; address: string; pending: string }[] }
  let cached: Balances | undefined
  let refreshedAt = 0
  let generation = 0
  let inFlight: Promise<Balances> | undefined
  const refresh = (): Promise<Balances> => {
    if (inFlight) return inFlight
    const startedGeneration = generation
    const request = readBalances().then((value) => {
      if (generation === startedGeneration) { cached = value; refreshedAt = Date.now() }
      return value
    }).finally(() => { if (inFlight === request) inFlight = undefined })
    inFlight = request
    return request
  }
  const invalidate = () => { generation++; cached = undefined; inFlight = undefined }
  async function readBalances(): Promise<Balances> {
    const [escrow, ...pending] = await Promise.all([
      d.noir.getEscrowBalance(d.deviceHash),
      ...IDS.map((id) => d.noir.getPendingBalance(d.artists[id].publicKey)),
    ])
    return {
      escrow: escrow.toString(),
      artists: IDS.map((id, i) => ({ id, name: ARTISTS[id].name, address: d.artists[id].publicKey, pending: pending[i].toString() })),
    }
  }
  r.get('/api/balances', async (_req, res) => {
    if (!cached) return res.json(await refresh())
    if (Date.now() - refreshedAt >= 10_000) {
      void refresh().catch((error) => console.error('balance refresh failed', error))
    }
    res.json(cached)
  })
  r.post('/api/claim', async (_req, res) => {
    const claims = await payOutArtists(d.noir, d.artists, invalidate)
    if (!claims.length) return res.status(409).json({ reason: 'NothingToClaim' })
    res.json({ claims })
  })
  return r
}
