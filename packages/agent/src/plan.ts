import { toStroops } from '@noirx402/agent-sdk'
import type { EndpointName } from '@tollbooth/shared'

export type PlanItem = { endpoint: EndpointName; value: bigint; why: string }

const WEATHERISH = /weather|travel|climate|farm/i

/**
 * Deterministic plan: what to try buying and what each call is worth to this topic.
 * report goes first so the over-cap policy refusal is reached before the budget is spent.
 */
export function makePlan(topic: string): PlanItem[] {
  const weatherMatters = WEATHERISH.test(topic)
  return [
    { endpoint: 'report', value: toStroops('3'), why: 'a deep report would answer the whole topic' },
    { endpoint: 'quote', value: toStroops('1.5'), why: 'market price is core to any research brief' },
    weatherMatters
      ? { endpoint: 'weather', value: toStroops('0.5'), why: 'the topic depends on weather' }
      : { endpoint: 'weather', value: toStroops('0.02'), why: 'weather is barely relevant to this topic' },
    { endpoint: 'news', value: toStroops('0.5'), why: 'recent headlines add context' },
  ]
}
