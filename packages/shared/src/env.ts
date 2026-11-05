export function readEnv<K extends string>(
  keys: readonly K[],
  src: Record<string, string | undefined> = process.env,
): Record<K, string> {
  const missing = keys.filter((k) => !src[k])
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`)
  return Object.fromEntries(keys.map((k) => [k, src[k]!])) as Record<K, string>
}
