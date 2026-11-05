import { StartJob } from './StartJob'
import { JobPage } from './JobPage'

export function App() {
  const jobId = location.pathname.match(/^\/jobs\/([\w-]+)$/)?.[1]
  return (
    <>
      <header className="sign">
        <a href="/" className="sign-title">Tollbooth</a>
        <p className="sign-sub">An AI agent that pays for each API call itself, inside a card limit it can’t exceed.</p>
      </header>
      <main>{jobId ? <JobPage jobId={jobId} /> : <StartJob />}</main>
      <footer>Stellar Testnet only, so no real money moves. The agent pays through Noir; the job fee goes through Velo.</footer>
    </>
  )
}
