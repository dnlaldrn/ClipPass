import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error(error) }
  render() {
    if (!this.state.failed) return this.props.children
    return <main><div className="notice" role="alert"><h1>This page broke.</h1><p>Payments already made stay on Testnet.</p><a className="button" href="/">Back to start</a></div></main>
  }
}
