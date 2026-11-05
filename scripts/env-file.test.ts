import { mergeDotEnv } from './env-file'

test('upsert replaces existing keys, appends new ones, keeps comments', () => {
  const before = '# keep me\nA=1\nB=2\n'
  expect(mergeDotEnv(before, { B: '3', C: '4' })).toBe('# keep me\nA=1\nB=3\nC=4\n')
})

test('upsert into empty file', () => {
  expect(mergeDotEnv('', { A: '1' })).toBe('A=1\n')
})
