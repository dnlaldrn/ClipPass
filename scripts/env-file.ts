import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const FILE = '.env'

/** Set KEY=value lines in dotenv text: replace keys that exist, append the rest, keep everything else. */
export function mergeDotEnv(text: string, updates: Record<string, string>): string {
  const lines = text.split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''))
  const left = new Map(Object.entries(updates))
  const out = lines.map((line) => {
    const key = line.match(/^([A-Z0-9_]+)=/)?.[1]
    if (!key || !left.has(key)) return line
    const v = left.get(key)!
    left.delete(key)
    return `${key}=${v}`
  })
  for (const [k, v] of left) out.push(`${k}=${v}`)
  return out.join('\n') + '\n'
}

export function loadDotEnv(): void {
  if (existsSync(FILE)) process.loadEnvFile(FILE)
}

export function upsertDotEnv(updates: Record<string, string>): void {
  const text = existsSync(FILE) ? readFileSync(FILE, 'utf8') : ''
  writeFileSync(FILE, mergeDotEnv(text, updates))
  Object.assign(process.env, updates)
}
