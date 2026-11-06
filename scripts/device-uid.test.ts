import { chooseDeviceUid } from './device-uid'

test('configured value wins for both new and existing owners', () => {
  const random = vi.fn(() => 'abcdef01')
  for (const ownerIsNew of [true, false]) {
    expect(chooseDeviceUid({ configured: 'MY-DEVICE', ownerIsNew, random })).toBe('MY-DEVICE')
  }
  expect(random).not.toHaveBeenCalled()
})

test('empty string counts as not configured', () => {
  expect(chooseDeviceUid({ configured: '', ownerIsNew: true, random: () => 'abcdef01' })).toBe('CLIPPASS-ABCDEF01')
})

test('new owner gets a unique value that is not the default', () => {
  const random = vi.fn().mockReturnValueOnce('abcdef01').mockReturnValueOnce('23456789')
  const first = chooseDeviceUid({ configured: undefined, ownerIsNew: true, random })
  const second = chooseDeviceUid({ configured: undefined, ownerIsNew: true, random })
  expect(first).toBe('CLIPPASS-ABCDEF01')
  expect(second).toBe('CLIPPASS-23456789')
  expect(first).toMatch(/^CLIPPASS-[0-9A-F]{8}$/)
  expect(first).not.toBe('TOLLBOOTH-DEMO-0001')
  expect(second).not.toBe(first)
})

test('existing owner keeps the default', () => {
  const random = vi.fn(() => 'abcdef01')
  for (const configured of [undefined, '']) {
    expect(chooseDeviceUid({ configured, ownerIsNew: false, random })).toBe('TOLLBOOTH-DEMO-0001')
  }
  expect(random).not.toHaveBeenCalled()
})
