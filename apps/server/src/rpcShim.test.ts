import { Contract, xdr } from '@stellar/stellar-sdk'
import { NoirAgentClient } from '@noirx402/agent-sdk'
import { NOIR_TESTNET_CONTRACTS } from '@clippass/shared'
import { restoreSuccessFlag } from './rpcShim'
import { backfillPayments } from './noirWatch'
import { ActivityLog } from './activity'

// The real payment.authorized event from Testnet tx 2a19e1e2…, exactly as RPC v30 returns it:
// no inSuccessfulContractCall field.
const raw = {
  id: '0023944923711565824-0000000000', type: 'contract', ledger: 5575112, ledgerClosedAt: '2026-11-05T17:20:00Z',
  txHash: '2a19e1e219c3e7309461513b6f30572951f20e1ea0aa5ff5af35de774bdf91b7',
  contractId: new Contract(NOIR_TESTNET_CONTRACTS.paymentEscrow),
  topic: ['AAAADwAAAAlhdXRob3JpemUAAAA=', 'AAAADQAAACAcNatBHrfbKpdJ4vC1F7mAQqJixjwJFQN7Pg8KPaIf0A==',
    'AAAAEgAAAAAAAAAANXcsUA9f1HMIk99gXbor+2WMYpjznaMTD877FkLsSdI='].map((b) => xdr.ScVal.fromXDR(b, 'base64')),
  value: xdr.ScVal.fromXDR('AAAACgAAAAAAAAAAAAAAAAAPQkA=', 'base64'),
}

function clientWithRpc() {
  const noir = new NoirAgentClient()
  Object.assign(noir.server, {
    getLatestLedger: async () => ({ sequence: 5575112 }),
    getEvents: async () => ({ events: [{ ...raw }], cursor: (5575138n << 32n).toString(), latestLedger: 5575138 }),
  })
  return noir
}

test('without the shim the SDK drops RPC v30 events (documents the upstream bug)', async () => {
  expect((await clientWithRpc().getEvents({ startLedger: 1 })).events).toHaveLength(0)
})

test('with the shim the SDK decodes payment.authorized', async () => {
  const noir = restoreSuccessFlag(clientWithRpc())
  const [e] = (await noir.getEvents({ startLedger: 1 })).events
  expect(e).toMatchObject({
    type: 'payment.authorized', amount: 1_000_000n, txHash: raw.txHash,
    merchant: 'GA2XOLCQB5P5I4YISPPWAXN2FP5WLDDCTDZZ3IYTB7HPWFSC5RE5EMUC',
    deviceHash: '1c35ab411eb7db2a9749e2f0b517b98042a262c63c0915037b3e0f0a3da21fd0',
  })
})

test('activity backfill uses the restored SDK client and deduplicates decoded RPC events', async () => {
  const noir = restoreSuccessFlag(clientWithRpc())
  const activity = new ActivityLog()
  const payees = { lowtide: 'GA2XOLCQB5P5I4YISPPWAXN2FP5WLDDCTDZZ3IYTB7HPWFSC5RE5EMUC', lantern: 'GLAN', kestrel: 'GKES', fern: 'GFERN' }
  await backfillPayments(noir, '1c35ab411eb7db2a9749e2f0b517b98042a262c63c0915037b3e0f0a3da21fd0', (event) => activity.recordPayment(event, payees))
  expect(activity.list()).toEqual([expect.objectContaining({
    id: raw.txHash, hash: raw.txHash, at: raw.ledgerClosedAt, kind: 'paid', amount: '1000000', artist: 'Lowtide Loops',
  })])
})
