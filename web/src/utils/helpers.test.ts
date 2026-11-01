import { afterEach, expect, it, vi } from 'vitest'
import { formatDate } from './dates'
import { normalizeExternalUrl, resolveMediaUrl } from './images'

afterEach(() => vi.unstubAllEnvs())

it('resolves API media paths and development uploads without rewriting CDN URLs', () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/v1')
  expect(resolveMediaUrl('/rails/active_storage/blobs/test')).toBe('https://api.example.com/rails/active_storage/blobs/test')
  expect(resolveMediaUrl('http://localhost:3000/uploads/photo.jpg')).toBe('https://api.example.com/uploads/photo.jpg')
  expect(resolveMediaUrl('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg')
  expect(resolveMediaUrl(null)).toBeNull()
})

it('formats calendar dates without UTC shifting and marks missing dates', () => {
  expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  expect(formatDate(null)).toBe('—')
})

it('rejects executable external links and adds HTTPS to bare domains', () => {
  expect(normalizeExternalUrl('javascript:alert(1)')).toBeNull()
  expect(normalizeExternalUrl(' example.com ')).toBe('https://example.com')
})
