afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
test('sound defaults on and never creates audio before a gesture', async () => {
  const AudioContext = vi.fn()
  vi.stubGlobal('AudioContext', AudioContext)
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() })
  const { sound } = await import('./sound')
  expect(sound.enabled()).toBe(true)
  sound.play('tick'); sound.startHum(); sound.stopHum()
  expect(AudioContext).not.toHaveBeenCalled()
})
test('sound preference is read, saved and respected when unlocking', async () => {
  const storage = { getItem: vi.fn(() => 'off'), setItem: vi.fn() }
  const AudioContext = vi.fn()
  vi.stubGlobal('localStorage', storage); vi.stubGlobal('AudioContext', AudioContext)
  const { sound } = await import('./sound')
  expect(sound.enabled()).toBe(false)
  sound.unlock(); sound.play('paid'); sound.startHum(); sound.stopHum()
  expect(AudioContext).not.toHaveBeenCalled()
  sound.setEnabled(true)
  expect(storage.setItem).toHaveBeenLastCalledWith('clippass.sound', 'on')
  sound.setEnabled(false)
  expect(sound.enabled()).toBe(false)
  expect(storage.setItem).toHaveBeenLastCalledWith('clippass.sound', 'off')
})
test('all audio APIs are silent no-ops without Web Audio or storage', async () => {
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('localStorage', { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } })
  const { sound } = await import('./sound')
  expect(sound.enabled()).toBe(true)
  expect(() => {
    sound.unlock(); sound.setEnabled(true)
    for (const cue of ['tick', 'press', 'advance', 'paid', 'refused', 'done', 'payout'] as const) sound.play(cue)
    sound.startHum(); sound.stopHum(); sound.setEnabled(false)
  }).not.toThrow()
})
test('a rejected audio resume never escapes as an unhandled failure', async () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} })
  vi.stubGlobal('AudioContext', class {
    destination = {}; state = 'suspended'; currentTime = 0
    createGain() { return { gain: { value: 0 }, connect() {} } }
    resume() { return Promise.reject(new Error('blocked')) }
  })
  const { sound } = await import('./sound')
  expect(() => { sound.unlock(); sound.startHum(); sound.stopHum() }).not.toThrow()
  await Promise.resolve()
})
