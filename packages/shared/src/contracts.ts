import type { NoirContracts } from '@noirx402/agent-sdk'

/** The deployed 2026-10-24 Testnet contracts. The SDK's TESTNET defaults must equal these. */
export const NOIR_TESTNET_CONTRACTS: NoirContracts = {
  deviceRegistry: 'CAC4KOLHDLDYDWBOKXNKRN5KVHO56PLOIFXDLTBUWGVN6GVDEB7FQHU5',
  agentRegistry: 'CCMZDSPTLX7IIJWCYEUM5DJUHOSOYSTHGK777S2TXZWEMC5ZZGPJ3EBV',
  paymentEscrow: 'CC7EAW5FNJEDBS7THM5IT6XIOHO4AOYMLXT3KSZ3HWUIKEACTW7E5BFS',
}

export function assertTestnetContracts(actual: NoirContracts): void {
  for (const key of Object.keys(NOIR_TESTNET_CONTRACTS) as (keyof NoirContracts)[]) {
    if (actual[key] !== NOIR_TESTNET_CONTRACTS[key]) {
      throw new Error(`Noir contract mismatch: ${key} is ${actual[key]}, expected ${NOIR_TESTNET_CONTRACTS[key]}`)
    }
  }
}
