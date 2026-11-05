import { devRoutesEnabled } from './dev'

test('dev routes are off unless DEV_ROUTES=1, even when NODE_ENV is unset', () => {
  expect(devRoutesEnabled({})).toBe(false)
  expect(devRoutesEnabled({ NODE_ENV: 'development' })).toBe(false)
  expect(devRoutesEnabled({ DEV_ROUTES: 'true' })).toBe(false)
  expect(devRoutesEnabled({ DEV_ROUTES: '1' })).toBe(true)
})
