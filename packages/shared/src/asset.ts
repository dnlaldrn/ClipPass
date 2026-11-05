import { Asset, Networks } from '@stellar/stellar-sdk'

/** Native XLM's Stellar Asset Contract on Testnet. */
export const XLM_SAC: string = Asset.native().contractId(Networks.TESTNET)
