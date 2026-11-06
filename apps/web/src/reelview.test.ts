import { readFileSync } from 'node:fs'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { JobView } from '@clippass/shared'
import { ChainStrip } from './ChainStrip'
import { ErrorBoundary } from './ErrorBoundary'
import { Nav } from './Nav'
import { Receipt } from './ReceiptPage'
import { ReelView } from './ReelView'
import { SamplePage } from './SamplePage'
import { MEDIA_NOTE } from './receipt'
import { SAMPLE_JOB } from './sample'

const view = (job: JobView, props = {}) => renderToStaticMarkup(createElement(ReelView, { job, receiptHref: '/r', ...props }))
const unpaid = (veloStatus: string | null): JobView => ({ ...SAMPLE_JOB, status: 'awaiting_payment', veloStatus, trace: [], licenses: [], summary: null })

test('ReelView has no sound and no fetching of its own', () => {
  const source = readFileSync(new URL('./ReelView.tsx', import.meta.url), 'utf8')
  expect(source).not.toMatch(/\.\/sound|getJob|getBalances|useEffect/)
})

test('the sample shows its one line, its receipt link, and no payout or live balances', () => {
  const html = renderToStaticMarkup(createElement(SamplePage))
  expect(html).toContain('Recorded Testnet reel. Nothing here spends.')
  expect(html).toContain('href="/sample/receipt"')
  expect(html).not.toContain('Pay out artists')
  expect(html).not.toContain('Card escrow')
  expect(html).not.toContain('LICENSED')
})

test('the payout button appears only with payout props', () => {
  const payout = { payouts: null, claiming: false, error: null, onClaim() {} }
  expect(view(SAMPLE_JOB, { payout, balances: null })).toContain('Pay out artists')
})

test('the receipt link waits for a license', () => {
  expect(view(SAMPLE_JOB)).toContain('href="/r"')
  expect(view(unpaid(null))).not.toContain('href="/r"')
})

test('a dead checkout says so and links to a new reel', () => {
  for (const status of ['failed', 'expired', 'cancelled']) {
    const html = view(unpaid(status))
    expect(html).toContain(`Checkout ${status}. The agent never started.`)
    expect(html).toContain('href="/"')
    expect(html).not.toContain('The agent starts once Velo')
  }
  expect(view(unpaid('pending'))).toContain('The agent starts once Velo')
})

test('a paid reel in the queue says it is waiting', () => {
  expect(view({ ...SAMPLE_JOB, status: 'paid' })).toContain('Waiting for the agent. Another reel may be finishing first.')
})

test('the receipt lists each asset, the total, the refusal and the mocked-media line', () => {
  const html = renderToStaticMarkup(createElement(Receipt, { job: SAMPLE_JOB, backHref: '/sample' }))
  for (const l of SAMPLE_JOB.licenses) for (const text of [l.title, l.artist, l.terms, l.hash]) expect(html).toContain(text)
  for (const text of ['Nov 6, 2026', '0.63 XLM', 'chill', 'over_limit', MEDIA_NOTE, 'Save as PDF', 'Download JSON', 'href="/sample"']) expect(html).toContain(text)
  expect(html.split(MEDIA_NOTE)).toHaveLength(2)
})

test('the active nav link is marked and every link is a real anchor', () => {
  const html = renderToStaticMarkup(createElement(Nav, { path: '/artists' }))
  for (const href of ['/library', '/artists', '/activity', '/sample']) expect(html).toContain(`href="${href}"`)
  expect(html.match(/aria-current="page"/g)).toHaveLength(1)
  expect(html).toContain('href="/artists" aria-current="page"')
})

test('ChainStrip shows the loading mark, not the failure mark, before any answer', () => {
  const html = renderToStaticMarkup(createElement(ChainStrip))
  expect(html).toContain('…')
  expect(html).not.toContain('—')
})

test('the error boundary replaces a crashed page with a way home', () => {
  const boundary = new ErrorBoundary({ children: null })
  boundary.state = ErrorBoundary.getDerivedStateFromError()
  const html = renderToStaticMarkup(boundary.render() as ReactElement)
  expect(html).toContain('href="/"')
  expect(html).toContain('This page broke.')
})
