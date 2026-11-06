import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StartJob } from './StartJob'
import { Identicon } from './Identicon'
import { CountUp } from './CountUp'
import { DEMO_REEL } from './reel/demo'
import { MOODS } from './mirror'
import { txLink, xlm } from './format'

test('the composer comes before the replay and explains the fee alongside native controls', () => {
  const html = renderToStaticMarkup(createElement(StartJob, { navigate: () => {} }))
  expect(html).toContain('<h1 id="composer-title">Describe your reel</h1>')
  expect(html).toContain('Continue to Velo checkout · 1 XLM')
  expect(html).toContain('You pay the 1 XLM project fee.')
  expect(html.indexOf('Continue to Velo checkout')).toBeLessThan(html.indexOf('Recorded Testnet run'))
  expect(html.indexOf('Continue to Velo checkout')).toBeLessThan(html.indexOf('Midnight Market'))
  expect(html).not.toContain('<select')
  expect(html).not.toContain('class="intro"')
  expect(html.match(/type="radio"/g)).toHaveLength(4)
  for (const mood of MOODS) expect(html).toMatch(new RegExp(`type="radio"[^>]*name="mood"[^>]*value="${mood}"`))
  expect(html).toMatch(/type="range"[^>]*min="2"[^>]*max="5"[^>]*step="0.1"/)
  expect(html).toContain('maxLength="500"')
})

test('replay retains every price, refusal reason and payment link in its accessible DOM', () => {
  const html = renderToStaticMarkup(createElement(StartJob, { navigate: () => {} }))
  for (const frame of DEMO_REEL) {
    expect(html).toContain(frame.title)
    expect(html).toContain(`${xlm(frame.price!)} XLM`)
    if (frame.hash) expect(html).toContain(`href="${txLink(frame.hash)}"`)
    if (frame.note) expect(html).toContain(frame.note)
  }
})

test('identicons are deterministic, mirrored and decorative', () => {
  const address = 'GBLSA47JDN23GF6TGNQQLNOAQOWU7Y43EXGHNLPZY6MALYTCNLK2BQVK'
  const first = renderToStaticMarkup(createElement(Identicon, { address }))
  expect(first).toBe(renderToStaticMarkup(createElement(Identicon, { address })))
  expect(first).toContain('aria-hidden="true"')
  const cells = [...first.matchAll(/<rect[^>]*x="(\d)"[^>]*y="(\d)"[^>]*fill="([^"]+)"/g)].map(([, x, y, fill]) => [Number(x), Number(y), fill] as const)
  expect(cells.length).toBeGreaterThan(0)
  for (const [x, y, fill] of cells) expect(cells).toContainEqual([4 - x, y, fill])
})

test('amount labels preserve exact bigint money even above Number precision', () => {
  const value = '90071992547409931'
  const html = renderToStaticMarkup(createElement(CountUp, { value }))
  expect(html).toContain('9007199254.7409931')
  expect(html).toContain(`aria-label="${xlm(value)}"`)
})
