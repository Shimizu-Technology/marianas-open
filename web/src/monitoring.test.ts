import { afterEach, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { initMonitoring, reportError } from './monitoring'

vi.mock('@sentry/react', () => ({ init: vi.fn(), captureException: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

it('does not initialize a client or report anything without a DSN', () => {
  vi.stubEnv('VITE_SENTRY_DSN', '')
  initMonitoring()
  reportError(new Error('test'))
  expect(Sentry.init).not.toHaveBeenCalled()
  expect(Sentry.captureException).not.toHaveBeenCalled()
})

it('sets release and privacy options when explicitly enabled', () => {
  vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.com/1')
  initMonitoring()
  expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ release: 'test-build', dataCollection: expect.objectContaining({ userInfo: false, httpBodies: [], cookies: false }) }))
  reportError(new Error('test'))
  expect(Sentry.captureException).toHaveBeenCalledOnce()
})
