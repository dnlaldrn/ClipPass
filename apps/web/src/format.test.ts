import { xlm } from './format'

test('formats stroop strings as exact XLM', () => {
  expect(xlm('1000000')).toBe('0.1')
  expect(xlm('20000000')).toBe('2')
  expect(xlm('193400000')).toBe('19.34')
  expect(xlm('1')).toBe('0.0000001')
  expect(xlm('0')).toBe('0')
})
