// Each artist collects everything the agent has paid them: noir.claim with that artist's signer.
import { NoirAgentClient, fromStroops } from '@noirx402/agent-sdk'
import { assertTestnetContracts, txLink } from '@clippass/shared'
import { loadArtists } from '../apps/server/src/artists'
import { payOutArtists } from '../apps/server/src/claim'
import { loadDotEnv } from './env-file'

loadDotEnv()
const artists = loadArtists()
const noir = new NoirAgentClient()
assertTestnetContracts(noir.contracts)

const claims = await payOutArtists(noir, artists)
for (const c of claims) console.log(`${c.name}: ${fromStroops(BigInt(c.amount))} XLM ${txLink(c.hash)}`)
if (!claims.length) console.log('nothing to claim')
