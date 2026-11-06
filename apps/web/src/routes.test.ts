import { appUrl, isPlainClick, matchRoute, navActive } from './routes'

test('every page has a route and unknown paths reach the 404', () => {
  expect(matchRoute('/')).toEqual({ name: 'start' })
  for (const name of ['library', 'artists', 'activity', 'sample']) expect(matchRoute('/' + name)).toEqual({ name })
  expect(matchRoute('/sample/receipt')).toEqual({ name: 'sampleReceipt' })
  expect(matchRoute('/library/')).toEqual({ name: 'library' })
  for (const path of ['/nope', '/jobs', '/jobs/', '/jobs/a/b', '/jobs/a/receipt/x', '/sample/x', '/constructor']) expect(matchRoute(path)).toEqual({ name: 'notFound' })
})

test('job routes keep their id', () => {
  expect(matchRoute('/jobs/abc-1_2')).toEqual({ name: 'job', id: 'abc-1_2' })
  expect(matchRoute('/jobs/abc-1_2/')).toEqual({ name: 'job', id: 'abc-1_2' })
  expect(matchRoute('/jobs/abc/receipt')).toEqual({ name: 'receipt', id: 'abc' })
})

test('a nav link is active on its page and below it, never on a sibling prefix', () => {
  expect(navActive('/sample', '/sample')).toBe(true)
  expect(navActive('/sample/receipt', '/sample')).toBe(true)
  expect(navActive('/samples', '/sample')).toBe(false)
  expect(navActive('/', '/library')).toBe(false)
})

test('only plain left-clicks are intercepted', () => {
  const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false }
  expect(isPlainClick(plain)).toBe(true)
  for (const change of [{ button: 1 }, { button: 2 }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }])
    expect(isPlainClick({ ...plain, ...change })).toBe(false)
})

test('external, new-tab and download links stay with the browser', () => {
  const origin = 'https://clippass.test'
  const link = (o = {}) => ({ href: origin + '/library?x=1#y', target: '', download: '', ...o })
  expect(appUrl(link(), origin)).toBe('/library?x=1#y')
  expect(appUrl(link({ target: '_self' }), origin)).toBe('/library?x=1#y')
  expect(appUrl(link({ target: '_blank' }), origin)).toBeNull()
  expect(appUrl(link({ download: 'a.json' }), origin)).toBeNull()
  expect(appUrl(link({ href: 'https://stellar.expert/x' }), origin)).toBeNull()
})
