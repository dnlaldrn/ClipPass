// Rebuilds ClipPass's Testnet state. Idempotent: safe to rerun, including after a Testnet reset.
import { createHash, randomBytes } from 'node:crypto'
import { Keypair } from '@stellar/stellar-sdk'
import { NoirAgentClient, keypairSigner, toStroops, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, XLM_SAC, POLICY_MAX, ARTISTS, accountLink, txLink, type ArtistId } from '@clippass/shared'
import { artistEnvKey } from '../apps/server/src/artists'
import { loadDotEnv, upsertDotEnv } from './env-file'
import { chooseDeviceUid } from './device-uid'

const ESCROW_TOPUP = toStroops('20')
const ESCROW_FLOOR = toStroops('10')
const POLICY_DAYS = 30
const RENEW_WITHIN_MS = 7 * 24 * 3600 * 1000

function keypair(name: string): Keypair {
  const secret = process.env[name]
  if (secret) return Keypair.fromSecret(secret)
  const kp = Keypair.random()
  upsertDotEnv({ [name]: kp.secret() })
  return kp
}

async function friendbot(g: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${g}`)
  if (res.ok) return console.log(`  funded ${g}`)
  const body = await res.text()
  // shortcut: friendbot answers 400 for an account that already exists; we treat that as funded.
  if (res.status === 400 && /already|exist|createAccountAlreadyExist/i.test(body)) return
  throw new Error(`friendbot failed for ${g}: ${res.status} ${body.slice(0, 200)}`)
}

async function main() {
  loadDotEnv()
  const ownerIsNew = !process.env.OWNER_SECRET
  const owner = keypair('OWNER_SECRET')
  const agent = keypair('AGENT_SECRET')
  const artists = (Object.keys(ARTISTS) as ArtistId[]).map((id) => ({ name: ARTISTS[id].name, kp: keypair(artistEnvKey(id)) }))
  const uid = chooseDeviceUid({ configured: process.env.DEVICE_UID, ownerIsNew, random: () => randomBytes(4).toString('hex') })
  const deviceHash = createHash('sha256').update(uid).digest('hex')
  upsertDotEnv({ DEVICE_UID: uid, DEVICE_HASH: deviceHash })

  console.log('Funding accounts with friendbot…')
  for (const kp of [owner, agent, ...artists.map((a) => a.kp)]) await friendbot(kp.publicKey())

  const noir = new NoirAgentClient()
  assertTestnetContracts(noir.contracts)
  const ownerSigner = keypairSigner(owner.secret())
  const sent: string[] = []

  const deviceOwner = await noir.getDeviceOwner(deviceHash)
  if (deviceOwner && deviceOwner !== owner.publicKey()) {
    throw new Error('device hash owned by another wallet; change DEVICE_UID')
  }
  if (!deviceOwner) {
    const { hash } = await noir.execute(ownerSigner, { kind: 'registerDevice', deviceHash, agent: agent.publicKey() })
    sent.push(hash)
    console.log(`registerDevice ${txLink(hash)}`)
  } else console.log('device already registered')

  const policy = await noir.getPolicy(deviceHash)
  const stale = !policy
    || policy.agent !== agent.publicKey()
    || policy.asset !== XLM_SAC
    || policy.maxAmount !== POLICY_MAX
    || (policy.expiresAt !== null && policy.expiresAt.getTime() - Date.now() < RENEW_WITHIN_MS)
  if (stale) {
    const expiresAt = new Date(Date.now() + POLICY_DAYS * 24 * 3600 * 1000)
    const { hash } = await noir.execute(ownerSigner, {
      kind: 'registerAgent', deviceHash, agent: agent.publicKey(), asset: XLM_SAC, maxAmount: POLICY_MAX, expiresAt,
    })
    sent.push(hash)
    console.log(`registerAgent ${txLink(hash)}`)
  } else console.log('agent policy already registered')

  const escrow = await noir.getEscrowBalance(deviceHash)
  if (escrow < ESCROW_FLOOR) {
    const { hash } = await noir.execute(ownerSigner, { kind: 'fundEscrow', deviceHash, token: XLM_SAC, amount: ESCROW_TOPUP })
    sent.push(hash)
    console.log(`fundEscrow ${txLink(hash)}`)
  } else console.log(`escrow already funded (${fromStroops(escrow)} XLM)`)

  console.log(`
owner    ${owner.publicKey()}  ${accountLink(owner.publicKey())}
agent    ${agent.publicKey()}  ${accountLink(agent.publicKey())}
${artists.map((a) => `${a.name.padEnd(20)} ${a.kp.publicKey()}  ${accountLink(a.kp.publicKey())}`).join('\n')}
deviceHash ${deviceHash}
escrow   ${fromStroops(await noir.getEscrowBalance(deviceHash))} XLM
${sent.length} transaction(s) sent. Secrets are in .env (gitignored).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
