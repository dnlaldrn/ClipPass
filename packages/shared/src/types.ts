import type { EndpointName } from './catalog'

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
  endpoint?: EndpointName
  price?: string
  reason: string
  hash?: string
}

export type PaymentRecord = { endpoint: EndpointName; price: string; hash: string; decision: string }

export type JobStatus = 'awaiting_payment' | 'paid' | 'running' | 'done' | 'failed'

export type JobView = {
  jobId: string
  topic: string
  budget: string
  status: JobStatus
  veloStatus: string | null
  checkoutUrl: string
  trace: Decision[]
  payments: PaymentRecord[]
  summary: string | null
}
