import { readFileSync } from 'node:fs'

test('page head describes ClipPass, not the old data agent', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  expect(html).toContain('<title>ClipPass</title>')
  expect(html).toMatch(/<meta name="description" content="[^"]*stock media[^"]*"/)
  expect(html).not.toMatch(/API call/i)
})
