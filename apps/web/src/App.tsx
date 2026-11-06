import { StartJob } from './StartJob'
import { JobPage } from './JobPage'
import { Edge } from './Edge'

export function App() {
  const jobId = location.pathname.match(/^\/jobs\/([\w-]+)$/)?.[1]
  return (
    <>
      <header className="top">
        <div className="brand">
          <a href="/" className="wordmark" aria-label="ClipPass home">Clip<span>Pass</span></a>
          <p className="tagline">An AI agent that licenses stock media for each reel and pays every artist per use, inside a card limit it can’t exceed.</p>
        </div>
        <p className="network"><Edge>Stellar Testnet · no real money moves</Edge></p>
      </header>
      <main>{jobId ? <JobPage jobId={jobId} /> : <StartJob />}</main>
      <footer>
        <p>Stellar Testnet only, so no real money moves. The agent pays artists through Noir; the project fee goes through Velo.</p>
        <p>The media is mocked by design: 14 fictional assets from 4 studios. The payments are real Testnet transactions.</p>
      </footer>
    </>
  )
}
