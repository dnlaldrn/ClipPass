import { fromStroops, toStroops } from '@noirx402/agent-sdk'
import { CATALOG, type EndpointName } from '@tollbooth/shared'
import type { PlanItem } from './plan'

export type Planner = (topic: string, plan: PlanItem[]) => Promise<PlanItem[]>

const SCORED: EndpointName[] = ['quote', 'weather', 'news']
const MAX_VALUE = toStroops('5')

/**
 * Local model (Ollama) that rewrites how much each data call is worth for the topic.
 * The report keeps its rule value so every job still reaches the card's over-limit refusal.
 * Any failure (Ollama down, timeout, bad JSON) returns the rule plan unchanged.
 */
export function ollamaPlanner(o: { model: string; url?: string; timeoutMs?: number; fetch?: typeof fetch }): Planner {
  const url = (o.url ?? 'http://localhost:11434').replace(/\/$/, '')
  const doFetch = o.fetch ?? fetch
  return async (topic, plan) => {
    const prompt = [
      `You are a research agent with a small XLM budget. Topic: "${topic.slice(0, 200)}".`,
      'For each paid data call, say how much it is worth to THIS topic in XLM (0 to 5) and why, in under 15 words.',
      ...SCORED.map((e) => `- ${e}: ${CATALOG[e].description}, costs ${fromStroops(CATALOG[e].price)} XLM`),
      'Rate a call below its cost if it would not help this topic.',
    ].join('\n')
    const item = { type: 'object', properties: { value: { type: 'number' }, why: { type: 'string' } }, required: ['value', 'why'] }
    try {
      const res = await doFetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
        body: JSON.stringify({
          model: o.model,
          stream: false,
          options: { temperature: 0 },
          format: { type: 'object', properties: Object.fromEntries(SCORED.map((e) => [e, item])), required: SCORED },
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`ollama ${res.status}`)
      const scores = JSON.parse(((await res.json()) as { message?: { content?: string } }).message?.content ?? '')
      return plan.map((p) => {
        const s = scores?.[p.endpoint]
        if (!SCORED.includes(p.endpoint) || typeof s?.value !== 'number' || !Number.isFinite(s.value) || typeof s.why !== 'string') return p
        const value = toStroops(Math.min(Math.max(s.value, 0), 5).toFixed(7))
        return { ...p, value: value > MAX_VALUE ? MAX_VALUE : value, why: `${o.model}: ${s.why.slice(0, 120)}` }
      })
    } catch (e) {
      console.warn(`planner fell back to rules: ${e instanceof Error ? e.message : String(e)}`)
      return plan
    }
  }
}
