import { StartJob } from './StartJob'
import { JobPage } from './JobPage'

export function App() {
  const jobId = location.pathname.match(/^\/jobs\/([\w-]+)$/)?.[1]
  return (
    <>
      <header className="top">
        <a href="/" className="wordmark" aria-label="ClipPass home">Clip<span>Pass</span></a>
        <p className="tagline">An AI agent that licenses stock media for each reel and pays every artist per use, inside a card limit it can’t exceed.</p>
      </header>
      <main>{jobId ? <JobPage jobId={jobId} /> : <StartJob />}</main>
      <footer>Stellar Testnet only, so no real money moves. The agent pays artists through Noir; the project fee goes through Velo.</footer>
    </>
  )
}
