import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify('test-build') },
  // Keep durable photo batches and full admin journeys within a small jsdom pool.
  test: { environment: 'jsdom', restoreMocks: true, maxWorkers: 2, testTimeout: 15000 },
})
