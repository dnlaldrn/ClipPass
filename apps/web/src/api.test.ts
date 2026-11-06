import { ApiError, createDevJob } from './api'

const reply = (status: number, body?: object) =>
  new Response(body ? JSON.stringify(body) : 'Cannot POST', { status })

afterEach(() => vi.unstubAllGlobals())

test('createDevJob posts the reel to the dev route', async () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => reply(200, { jobId: 'j1' }))
  vi.stubGlobal('fetch', fetch)
  await expect(createDevJob('a reel', 'chill', '2.5')).resolves.toEqual({ jobId: 'j1' })
  const [url, init] = fetch.mock.calls[0]
  expect(url).toMatch(/\/api\/dev\/jobs$/)
  expect(init.method).toBe('POST')
  expect(JSON.parse(String(init.body))).toEqual({ script: 'a reel', mood: 'chill', budget: '2.5' })
})

test('createDevJob explains how to turn the dev route on', async () => {
  vi.stubGlobal('fetch', async () => reply(404))
  const err = await createDevJob('a reel', 'chill', '2.5').catch((e) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect(err.message).toMatch(/DEV_ROUTES=1/)
})

test('createDevJob keeps the server’s message for other errors', async () => {
  vi.stubGlobal('fetch', async () => reply(400, { error: 'Budget must be an XLM amount from 2 to 5.' }))
  await expect(createDevJob('a reel', 'chill', 'abc')).rejects.toThrow('Budget must be an XLM amount from 2 to 5.')
})
