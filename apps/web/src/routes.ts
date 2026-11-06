export type Route =
  | { name: 'start' | 'library' | 'artists' | 'activity' | 'sample' | 'sampleReceipt' | 'notFound' }
  | { name: 'job' | 'receipt'; id: string }

export const NAV = [
  { href: '/', label: 'New reel' },
  { href: '/library', label: 'Library' },
  { href: '/artists', label: 'Artists' },
  { href: '/activity', label: 'Activity' },
  { href: '/sample', label: 'Sample reel' },
]

const STATIC = new Map<string, Route>([
  ['/', { name: 'start' }], ['/library', { name: 'library' }], ['/artists', { name: 'artists' }], ['/activity', { name: 'activity' }],
  ['/sample', { name: 'sample' }], ['/sample/receipt', { name: 'sampleReceipt' }],
])

const clean = (path: string) => path.replace(/\/+$/, '') || '/'

export function matchRoute(pathname: string): Route {
  const path = clean(pathname)
  const page = STATIC.get(path)
  if (page) return page
  const job = path.match(/^\/jobs\/([\w-]+)(\/receipt)?$/)
  if (job) return { name: job[2] ? 'receipt' : 'job', id: job[1] }
  return { name: 'notFound' }
}

export function navActive(pathname: string, href: string): boolean {
  const path = clean(pathname)
  return path === href || path.startsWith(href + '/')
}

type ClickLike = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }

/** New-tab, new-window and download gestures stay with the browser. */
export const isPlainClick = (e: ClickLike) =>
  !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

/** The in-app URL for a link, or null when the browser should follow it. */
export function appUrl(link: { href: string; target: string; download: string }, origin: string): string | null {
  if ((link.target && link.target !== '_self') || link.download) return null
  const url = new URL(link.href, origin)
  return url.origin === origin ? url.pathname + url.search + url.hash : null
}
