import { TESTNET } from '@noirx402/agent-sdk'
import {
  assertTestnetContracts, NOIR_TESTNET_CONTRACTS, CATALOG, POLICY_MAX, readEnv, XLM_SAC, txLink,
} from './index'

test('SDK TESTNET defaults equal our pinned IDs', () => {
  expect(() => assertTestnetContracts(TESTNET.contracts)).not.toThrow()
})

test('mismatch throws naming the key', () => {
  expect(() => assertTestnetContracts({ ...NOIR_TESTNET_CONTRACTS, paymentEscrow: 'CX' }))
    .toThrow('paymentEscrow')
})

test('report is above the policy cap, the rest below', () => {
  expect(CATALOG.report.price > POLICY_MAX).toBe(true)
  for (const k of ['quote', 'weather', 'news'] as const) expect(CATALOG[k].price <= POLICY_MAX).toBe(true)
})

test('readEnv names all missing keys', () => {
  expect(() => readEnv(['A', 'B'], { A: 'x' })).toThrow(/B/)
  expect(readEnv(['A'], { A: 'x' })).toEqual({ A: 'x' })
})

test('XLM_SAC is a contract id', () => expect(XLM_SAC).toMatch(/^C[A-Z2-7]{55}$/))

test('txLink points at testnet stellar.expert', () => {
  expect(txLink('ab')).toBe('https://stellar.expert/explorer/testnet/tx/ab')
})
