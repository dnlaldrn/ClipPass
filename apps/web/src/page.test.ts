import { existsSync, readFileSync } from 'node:fs'

test('the page names a favicon that exists', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const href = html.match(/<link rel="icon"[^>]*href="\/([^"]+)"/)?.[1]
  expect(href).toBeTruthy()
  expect(existsSync(new URL(`../public/${href}`, import.meta.url))).toBe(true)
})

test('page head describes ClipPass, not the old data agent', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  expect(html).toContain('<title>ClipPass</title>')
  expect(html).toMatch(/<meta name="description" content="[^"]*stock media[^"]*"/)
  expect(html).not.toMatch(/API call/i)
})
