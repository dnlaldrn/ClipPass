import type { Mood } from '@clippass/shared'
import { laneTags, type Slot } from './plan'

export type Planner = (script: string, mood: Mood, slots: Slot[]) => Promise<Slot[]>

/**
 * Local model (Ollama) that reads the script and picks one tag per music, b-roll and sfx slot.
 * Tags are limited to each lane's vocabulary (schema enum, re-checked on the reply). The exclusive slot is never
 * sent, so every reel still reaches the card's over-limit refusal. Any failure returns the rule slots unchanged.
 */
export function ollamaPlanner(o: { model: string; url?: string; timeoutMs?: number; fetch?: typeof fetch }): Planner {
  const url = (o.url ?? 'http://localhost:11434').replace(/\/$/, '')
  const doFetch = o.fetch ?? fetch
  return async (script, mood, slots) => {
    const seen: Record<string, number> = {}
    // schema keys: music, broll1..3, sfx1..2; null for the exclusive
    const keys = slots.map((s) => (s.type === 'exclusive' ? null : s.type === 'music' ? 'music' : `${s.type}${(seen[s.type] = (seen[s.type] ?? 0) + 1)}`))
    const props = Object.fromEntries(keys.flatMap((k, i) => (k ? [[k, {
      type: 'object',
      properties: { tag: { type: 'string', enum: laneTags(slots[i].type) }, why: { type: 'string' } },
      required: ['tag', 'why'],
    }]] : [])))
    const lanes = [...new Set(slots.filter((s) => s.type !== 'exclusive').map((s) => s.type))]
    const prompt = [
      `You pick stock media for a short video reel. Mood: ${mood}. Script: "${script.slice(0, 500)}".`,
      'For each slot, choose the one tag that best fits the script, and say why in under 15 words.',
      ...lanes.map((t) => `- ${t} tags: ${laneTags(t).join(', ')}`),
      'Use different b-roll and sfx tags where the script allows.',
    ].join('\n')
    try {
      const res = await doFetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(o.timeoutMs ?? 30_000),
        body: JSON.stringify({
          model: o.model,
          stream: false,
          options: { temperature: 0 },
          format: { type: 'object', properties: props, required: Object.keys(props) },
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) throw new Error(`ollama ${res.status}`)
      const out = JSON.parse(((await res.json()) as { message?: { content?: string } }).message?.content ?? '')
      return slots.map((s, i) => {
        const r = keys[i] ? out?.[keys[i]!] : undefined
        if (typeof r?.tag !== 'string' || !laneTags(s.type).includes(r.tag) || typeof r.why !== 'string') return s
        return { ...s, tags: [r.tag], why: `${o.model}: ${r.why.slice(0, 120)}` }
      })
    } catch (e) {
      console.warn(`planner fell back to rules: ${e instanceof Error ? e.message : String(e)}`)
      return slots
    }
  }
}
