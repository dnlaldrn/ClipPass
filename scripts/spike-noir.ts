// Day-one gate: one live checkPayment + authorizePayment + claim round trip on Testnet.
import { Keypair } from '@stellar/stellar-sdk'
import { NoirAgentClient, keypairSigner, toStroops, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, readEnv, XLM_SAC, txLink } from '@clippass/shared'
import { loadDotEnv } from './env-file'

function expect(cond: boolean, what: string): void {
  if (!cond) { console.error(`FAIL: ${what}`); process.exit(1) }
  console.log(`ok: ${what}`)
}

async function main() {
  loadDotEnv()
  const env = readEnv(['AGENT_SECRET', 'MERCHANT_SECRET', 'DEVICE_HASH'])
  const noir = new NoirAgentClient()
  assertTestnetContracts(noir.contracts)
  const agent = keypairSigner(env.AGENT_SECRET)
  const merchant = Keypair.fromSecret(env.MERCHANT_SECRET).publicKey()
  const deviceHash = env.DEVICE_HASH
  const small = toStroops('0.01')

  const okCheck = await noir.checkPayment({ deviceHash, agent: agent.publicKey, asset: XLM_SAC, amount: small })
  expect(okCheck.ok, `checkPayment 0.01 → ${JSON.stringify(okCheck)}`)
  const big = await noir.checkPayment({ deviceHash, agent: agent.publicKey, asset: XLM_SAC, amount: toStroops('2') })
  expect(!big.ok && big.reason === 'over_limit', `checkPayment 2 → ${JSON.stringify(big)}`)

  const { hash } = await noir.authorizePayment({ agent, deviceHash, merchant, asset: XLM_SAC, amount: small })
  console.log(`authorizePayment ${txLink(hash)}`)
  const pending = await noir.getPendingBalance(merchant)
  expect(pending >= small, `merchant pending ${fromStroops(pending)} XLM`)

  const claimed = await noir.claim({ merchant: keypairSigner(env.MERCHANT_SECRET), token: XLM_SAC })
  console.log(`claim ${txLink(claimed.hash)}`)
  expect((await noir.getPendingBalance(merchant)) === 0n, 'pending is 0 after claim')
}

main().catch((e) => { console.error(e); process.exit(1) })
