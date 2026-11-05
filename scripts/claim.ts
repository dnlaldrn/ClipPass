// Merchant collects everything the agent has paid it: noir.claim with the merchant signer.
import { NoirAgentClient, NoirContractError, keypairSigner, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, readEnv, XLM_SAC, txLink } from '@tollbooth/shared'
import { loadDotEnv } from './env-file'

loadDotEnv()
const env = readEnv(['MERCHANT_SECRET'])
const noir = new NoirAgentClient()
assertTestnetContracts(noir.contracts)
const merchant = keypairSigner(env.MERCHANT_SECRET)

const before = await noir.getPendingBalance(merchant.publicKey)
console.log(`pending before: ${fromStroops(before)} XLM`)
try {
  const { hash } = await noir.claim({ merchant, token: XLM_SAC })
  console.log(`claim ${txLink(hash)}`)
  console.log(`pending after: ${fromStroops(await noir.getPendingBalance(merchant.publicKey))} XLM`)
} catch (e) {
  if (e instanceof NoirContractError && e.errorName === 'NothingToClaim') console.log('nothing to claim')
  else throw e
}
