import type { JobView } from '@clippass/shared'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? body.reason ?? `Request failed (${res.status})`)
  return body as T
}

export const createJob = (topic: string, budget: string) =>
  call<{ jobId: string; checkoutUrl: string }>('/api/jobs', { method: 'POST', body: JSON.stringify({ topic, budget }) })
export const getJob = (id: string) => call<JobView>(`/api/jobs/${id}`)
export const getBalances = () => call<{ escrow: string; pending: string }>('/api/balances')
export const claim = () => call<{ hash: string; before: string; after: string }>('/api/claim', { method: 'POST' })
