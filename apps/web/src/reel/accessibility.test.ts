import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Reel } from './Reel'
import { DEMO_REEL } from './demo'
import { txLink, xlm } from '../format'
test('the decorative canvas keeps every demo price, refusal and receipt in the DOM', () => {
  const html = renderToStaticMarkup(createElement(Reel, { frames: DEMO_REEL, mode: 'replay', label: 'Testnet replay' }))
  for (const frame of DEMO_REEL) {
    if (frame.price) expect(html).toContain(xlm(frame.price) + ' XLM.')
    if (frame.hash) expect(html).toContain(txLink(frame.hash))
    if (frame.note) expect(html).toContain(frame.note)
  }
  expect(html).toContain('aria-hidden="true"')
})
