import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  title?: string
}

interface State {
  error: Error | null
}

/** Keeps Command shell visible when a page throws — blank white screens become recoverable. */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Command page crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl space-y-3 rounded-xl border border-critical/30 bg-white p-6">
          <h1 className="text-lg font-semibold text-ink">{this.props.title ?? 'This page could not be shown'}</h1>
          <p className="text-sm text-muted">
            Something failed while loading this screen. The rest of Command is still available — try another page or refresh.
          </p>
          <p className="rounded-lg bg-critical/10 px-3 py-2 font-mono text-xs text-critical">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-midnight px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
