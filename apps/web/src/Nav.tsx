import { NAV, navActive } from './routes'

export function Nav({ path }: { path: string }) {
  return <nav className="site-nav" aria-label="Main">
    {NAV.map(l => <a key={l.href} href={l.href} aria-current={navActive(path, l.href) ? 'page' : undefined}>{l.label}</a>)}
  </nav>
}
