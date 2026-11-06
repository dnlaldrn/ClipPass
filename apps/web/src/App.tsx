import { useCallback, useEffect, useState } from 'react'
import { StartJob } from './StartJob'
import { JobPage } from './JobPage'
import { Edge } from './Edge'
import { SoundToggle } from './SoundToggle'
import { ErrorBoundary } from './ErrorBoundary'
import { Nav } from './Nav'
import { NotFound } from './Notices'
import { JobReceipt, Receipt } from './ReceiptPage'
import { SamplePage } from './SamplePage'
import { Activity, Artists, Library } from './pages'
import { appUrl, isPlainClick, matchRoute, type Route } from './routes'
import { SAMPLE_JOB } from './sample'

function Page({ route, navigate }: { route: Route; navigate: (url: string) => void }) {
  switch (route.name) {
    case 'start': return <StartJob navigate={navigate} />
    case 'job': return <JobPage key={route.id} jobId={route.id} />
    case 'receipt': return <JobReceipt key={route.id} jobId={route.id} />
    case 'library': return <Library />
    case 'artists': return <Artists />
    case 'activity': return <Activity />
    case 'sample': return <SamplePage />
    case 'sampleReceipt': return <Receipt job={SAMPLE_JOB} backHref="/sample" />
    case 'notFound': return <NotFound />
  }
}

export function App() {
  const [path, setPath] = useState(location.pathname)
  const [lightTheme, setLightTheme] = useState(() => {
    try { return localStorage.getItem('clippass.homeTheme') === 'light' } catch { return false }
  })
  const navigate = useCallback((url: string) => { history.pushState(null, '', url); setPath(location.pathname); window.scrollTo(0, 0) }, [])
  useEffect(() => {
    const change = () => setPath(location.pathname)
    // Every same-origin <a href> stays a real link and moves through navigate on a plain click.
    const click = (e: MouseEvent) => {
      if (!isPlainClick(e) || !(e.target instanceof Element)) return
      const link = e.target.closest('a')
      const url = link && appUrl(link, location.origin)
      if (url) { e.preventDefault(); navigate(url) }
    }
    window.addEventListener('popstate', change)
    document.addEventListener('click', click)
    return () => { window.removeEventListener('popstate', change); document.removeEventListener('click', click) }
  }, [navigate])
  const route = matchRoute(path)
  useEffect(() => {
    document.documentElement.classList.toggle('music-dark', !lightTheme)
    return () => document.documentElement.classList.remove('music-dark')
  }, [lightTheme])
  return <>
    <header className="top">
      <a href="/" className="wordmark" aria-label="ClipPass home">Clip<span>Pass</span></a>
      <Nav path={path} />
      <div className="header-tools"><p className="network"><span className="live-dot" aria-hidden="true" /><Edge>STELLAR TESTNET</Edge></p>
        <button className="theme-toggle" type="button" onClick={() => {
          setLightTheme(!lightTheme)
          try { localStorage.setItem('clippass.homeTheme', lightTheme ? 'dark' : 'light') } catch {}
        }}>{lightTheme ? 'Dark mode' : 'Light mode'}</button>
        <SoundToggle jobPage={route.name === 'job'} />
      </div>
    </header>
    <ErrorBoundary key={path}><main><Page route={route} navigate={navigate} /></main></ErrorBoundary>
    <footer><Edge>TESTNET ONLY · MOCKED MEDIA · REELS RESET ON RESTART · NOIR + VELO</Edge></footer>
  </>
}
