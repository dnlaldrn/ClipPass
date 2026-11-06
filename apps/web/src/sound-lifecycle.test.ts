function audioMock() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn((_at?: number) => {}), stop: vi.fn((_at?: number) => {}), frequency: param(), gain: param(), onended: null, buffer: null, loop: false, type: '' })
  const sources: ReturnType<typeof node>[] = [], gains: ReturnType<typeof node>[] = []
  const context = {
    currentTime: 0, sampleRate: 8000, state: 'running', destination: {}, resume: vi.fn(async () => {}),
    createGain: vi.fn(() => { const n = node(); gains.push(n); return n }), createBiquadFilter: vi.fn(node),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    createBufferSource: vi.fn(() => { const n = node(); sources.push(n); return n }),
    createOscillator: vi.fn(() => { const n = node(); sources.push(n); return n }),
  }
  const Constructor = vi.fn(function () { return context })
  vi.stubGlobal('AudioContext', Constructor)
  return { context, Constructor, sources, gains }
}
beforeEach(() => { vi.resetModules(); vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} }) })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

test('audio waits for a gesture, uses a 0.3 master, and keeps every cue under 700ms', async () => {
  const { Constructor, sources, gains } = audioMock()
  const { sound } = await import('./sound')
  sound.play('paid'); sound.startHum()
  expect(Constructor).not.toHaveBeenCalled()
  sound.unlock()
  await Promise.resolve()
  sound.stopHum()
  expect(gains[0].gain.value).toBe(0.3)
  for (const cue of ['tick', 'press', 'advance', 'paid', 'refused', 'done', 'payout'] as const) {
    const before = sources.length
    sound.play(cue)
    expect(sources.length).toBeGreaterThan(before)
    for (const source of sources.slice(before)) expect(source.stop.mock.calls[0][0]).toBeLessThan(0.7)
  }
  const count = sources.length
  sound.setEnabled(false)
  sound.play('paid'); sound.startHum()
  expect(sources).toHaveLength(count)
})

test('hum is idempotent, stops on mute, resumes only while wanted, and stops explicitly', async () => {
  const { sources } = audioMock()
  const { sound } = await import('./sound')
  sound.unlock(); sound.startHum()
  const count = sources.length
  sound.startHum()
  expect(sources).toHaveLength(count)
  sound.setEnabled(false)
  expect(sources[0].stop).toHaveBeenCalled()
  sound.setEnabled(true)
  expect(sources.length).toBeGreaterThan(count)
  sound.stopHum()
  const stopped = sources.length
  sound.setEnabled(false); sound.setEnabled(true)
  expect(sources).toHaveLength(stopped)
})

test('failed context creation and a rejected resume stay silent and leave the toggle locked', async () => {
  vi.stubGlobal('AudioContext', vi.fn(function () { throw Error('unsupported') }))
  let sound = (await import('./sound')).sound
  expect(() => { sound.unlock(); sound.play('tick'); sound.startHum(); sound.stopHum() }).not.toThrow()
  vi.resetModules()
  const { context } = audioMock()
  context.state = 'suspended'
  context.resume.mockRejectedValue(Error('gesture required'))
  sound = (await import('./sound')).sound
  sound.unlock()
  await Promise.resolve()
  expect(sound.isUnlocked()).toBe(false)
})
