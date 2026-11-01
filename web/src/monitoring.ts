import * as Sentry from '@sentry/react'

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: __BUILD_ID__,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      queues: false,
      databaseQueryData: false,
    },
    // No replay or performance integrations: error reporting only.
    ignoreErrors: [
      /^ResizeObserver loop limit exceeded$/,
      /^ResizeObserver loop completed with undelivered notifications\.$/,
    ],
  })
}

export function reportError(error: unknown, componentStack?: string | null) {
  if (!import.meta.env.VITE_SENTRY_DSN?.trim()) return
  Sentry.captureException(error, { contexts: { react: { componentStack } } })
}
