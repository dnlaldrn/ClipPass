import { TESTNET } from '@noirx402/agent-sdk'
import {
  assertTestnetContracts, NOIR_TESTNET_CONTRACTS, POLICY_MAX, MIN_JOB_BUDGET, ASSETS, ARTISTS, MOODS, assetById, readEnv, XLM_SAC, txLink,
} from './index'

test('SDK TESTNET defaults equal our pinned IDs', () => {
  expect(() => assertTestnetContracts(TESTNET.contracts)).not.toThrow()
})

test('mismatch throws naming the key', () => {
  expect(() => assertTestnetContracts({ ...NOIR_TESTNET_CONTRACTS, paymentEscrow: 'CX' }))
    .toThrow('paymentEscrow')
})

test('asset ids are unique and every artist exists', () => {
  expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length)
  for (const a of ASSETS) expect(ARTISTS[a.artist], a.id).toBeDefined()
  expect(ASSETS).toHaveLength(14)
})

test('only the exclusive is over the card limit, and every budget can reach it', () => {
  const [ex] = ASSETS.filter((a) => a.type === 'exclusive')
  expect(ex.price > POLICY_MAX).toBe(true)
  expect(MIN_JOB_BUDGET >= ex.price).toBe(true)
  for (const a of ASSETS.filter((a) => a.type !== 'exclusive')) expect(a.price < POLICY_MAX, a.id).toBe(true)
})

test('music tags are exactly the moods', () => {
  const music = new Set(ASSETS.filter((a) => a.type === 'music').flatMap((a) => a.tags))
  expect([...music].sort()).toEqual([...MOODS].sort())
})

test('assetById', () => {
  expect(assetById('s-sizzle')).toMatchObject({ title: 'Wok Sizzle', artist: 'fern', price: 500_000n })
  expect(assetById('nope')).toBeUndefined()
})

test('readEnv names all missing keys', () => {
  expect(() => readEnv(['A', 'B'], { A: 'x' })).toThrow(/B/)
  expect(readEnv(['A'], { A: 'x' })).toEqual({ A: 'x' })
})

test('XLM_SAC is a contract id', () => expect(XLM_SAC).toMatch(/^C[A-Z2-7]{55}$/))

test('txLink points at testnet stellar.expert', () => {
  expect(txLink('ab')).toBe('https://stellar.expert/explorer/testnet/tx/ab')
})
