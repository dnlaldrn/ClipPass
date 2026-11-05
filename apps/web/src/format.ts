/** Stroop string → exact XLM string (7 decimals, trailing zeros trimmed). Kept local so the page doesn't bundle the Stellar SDK. */
export function xlm(stroops: string): string {
  const s = BigInt(stroops)
  const whole = s / 10_000_000n
  const frac = (s % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}

export const txLink = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
