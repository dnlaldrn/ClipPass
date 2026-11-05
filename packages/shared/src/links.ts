const BASE = 'https://stellar.expert/explorer/testnet'
export const txLink = (hash: string) => `${BASE}/tx/${hash}`
export const accountLink = (g: string) => `${BASE}/account/${g}`
export const contractLink = (c: string) => `${BASE}/contract/${c}`
