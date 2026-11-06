import { useEffect, useState } from 'react'
import { StartJob } from './StartJob'
import { JobPage } from './JobPage'
import { Edge } from './Edge'
import { SoundToggle } from './SoundToggle'
export function App() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const change = () => setPath(location.pathname)
    window.addEventListener('popstate', change)
    return () => window.removeEventListener('popstate', change)
  }, [])
  const navigate = (url: string) => { history.pushState(null, '', url); setPath(location.pathname); window.scrollTo(0, 0) }
  const jobId = path.match(/^\/jobs\/([\w-]+)$/)?.[1]
  return <>
    <header className="top">
      <a href="/" className="wordmark" aria-label="ClipPass home">Clip<span>Pass</span></a>
      <div className="header-tools"><p className="network"><span className="live-dot" aria-hidden="true" /><Edge>STELLAR TESTNET</Edge></p><SoundToggle jobPage={!!jobId} /></div>
    </header>
    <main>{jobId ? <JobPage key={jobId} jobId={jobId} /> : <StartJob navigate={navigate} />}</main>
    <footer><Edge>TESTNET ONLY · MOCKED MEDIA · REELS RESET ON RESTART · NOIR + VELO</Edge></footer>
  </>
}
