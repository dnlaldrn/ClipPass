import type { Activity, Catalog, JobView } from '@clippass/shared'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
    .catch(() => { throw new ApiError(0, 'The server isn’t answering. Try again.') })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error ?? body.reason ?? `Request failed (${res.status})`)
  return body as T
}

export type Balances = { escrow: string; artists: { id: string; name: string; address: string; pending: string }[] }
export type Payout = { artist: string; name: string; amount: string; hash: string }

export const createJob = (script: string, mood: string, budget: string) =>
  call<{ jobId: string; checkoutUrl: string }>('/api/jobs', { method: 'POST', body: JSON.stringify({ script, mood, budget }) })
/** Local test reel without Velo. The route answers 404 unless the server runs with DEV_ROUTES=1. */
export const createDevJob = (script: string, mood: string, budget: string) =>
  call<{ jobId: string }>('/api/dev/jobs', { method: 'POST', body: JSON.stringify({ script, mood, budget }) }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) throw new ApiError(404, 'Test reels are off. Set DEV_ROUTES=1 in .env and restart the server.')
    throw e
  })
export const getJob = (id: string) => call<JobView>(`/api/jobs/${id}`)
export const getBalances = () => call<Balances>('/api/balances')
export const getCatalog = () => call<Catalog>('/api/catalog')
export const getActivity = () => call<Activity>('/api/activity')
export const claim = () => call<{ claims: Payout[] }>('/api/claim', { method: 'POST' })
