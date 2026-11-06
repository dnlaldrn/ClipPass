import { Icon } from './Icon'

export function ReelMissing() {
  return <div className="notice"><h1>Reel not found (the server restarted). Start a new reel.</h1><p>Reels live in the server’s memory, so a restart clears them. Payments that already happened stay on Testnet.</p><a className="button" href="/">Start a new reel</a></div>
}

export function ServerDown({ onRetry }: { onRetry: () => void }) {
  return <div className="job-alert" role="alert"><p className="error"><Icon name="failed" /> The server isn’t answering.</p><button type="button" onClick={onRetry}>Retry</button></div>
}

export function NotFound() {
  return <div className="notice"><h1>Nothing on this frame.</h1><p>That page doesn’t exist.</p><a className="button" href="/">Back to start</a></div>
}
