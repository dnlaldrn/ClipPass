import request from 'supertest'
import { Router } from 'express'
import { createApp } from './app'

test('unhandled sync and async errors are logged and return safe JSON', async () => {
  const error = new Error('internal detail that must not reach the visitor')
  const r = Router()
  r.get('/api/sync', () => { throw error })
  r.get('/api/async', async () => { throw error })
  const app = createApp({ webOrigin: '*', routers: [r] })
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    for (const path of ['/api/sync', '/api/async']) {
      const res = await request(app).get(path)
      expect(res.status).toBe(500)
      expect(res.type).toBe('application/json')
      expect(res.body).toEqual({ error: 'Something went wrong on the server. Try again.' })
    }
    expect(quiet).toHaveBeenCalledWith('server request failed', error)
  } finally { quiet.mockRestore() }
})

test('malformed JSON returns the specified 400 error', async () => {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const app = createApp({ webOrigin: '*', routers: [] })
    const res = await request(app).post('/api/jobs').set('content-type', 'application/json').send('{')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'That request was not valid JSON.' })
  } finally { quiet.mockRestore() }
})

test('unknown API paths return JSON 404 and health still works', async () => {
  const app = createApp({ webOrigin: '*', routers: [] })
  for (const path of ['/api/nope', '/api/nested/nope']) {
    const res = await request(app).get(path)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found.' })
  }
  expect((await request(app).get('/health')).body).toEqual({ ok: true })
})
