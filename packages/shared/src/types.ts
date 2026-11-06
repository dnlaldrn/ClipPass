import type { AssetType, Mood } from './catalog'

export type Quote402 = {
  quoteId: string
  price: string
  asset: string
  merchant: string
  network: 'testnet'
  expiresAt: string
}

export type ProofReason =
  | 'not_found' | 'unknown_quote' | 'consumed_quote' | 'expired_quote' | 'reused'
  | 'wrong_contract' | 'wrong_merchant' | 'wrong_device' | 'low_amount'

export type DecisionAction = 'plan' | 'skip' | 'refused' | 'paid' | 'failed' | 'done'

export type Decision = {
  at: string
  action: DecisionAction
  assetId?: string
  assetType?: AssetType
  /** The asset's catalog title, so the page can name assets it never licensed. */
  title?: string
  price?: string
  reason: string
  hash?: string
}

/** One licensed asset: `artist` is the display name, `artistAddress` the account the agent paid. */
export type License = {
  assetId: string
  assetType: AssetType
  title: string
  artist: string
  artistAddress: string
  price: string
  hash: string
  decision: string
}

export type JobStatus = 'awaiting_payment' | 'paid' | 'running' | 'done' | 'failed'

export type JobView = {
  jobId: string
  script: string
  mood: Mood
  budget: string
  status: JobStatus
  veloStatus: string | null
  checkoutUrl: string
  trace: Decision[]
  licenses: License[]
  summary: string | null
}
