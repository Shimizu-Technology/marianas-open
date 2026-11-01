import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { reportError } from '../monitoring'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="flex min-h-dvh items-center justify-center bg-navy-900 px-6 py-12 text-text-primary">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface p-6 sm:p-10">
          <p className="mb-4 font-heading text-sm font-semibold uppercase tracking-widest text-gold">Marianas Open</p>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">Let’s get you back to the action.</h1>
          <p className="mb-8 text-base leading-relaxed text-text-secondary">This page couldn’t load. Reload to try again, or return to the home page.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-lg bg-gold px-6 py-3 font-semibold text-navy-900 hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Reload page</button>
            <a href="/" className="min-h-12 rounded-lg border border-white/20 px-6 py-3 text-center font-semibold hover:bg-surface-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Home</a>
          </div>
        </div>
      </main>
    )
  }
}
