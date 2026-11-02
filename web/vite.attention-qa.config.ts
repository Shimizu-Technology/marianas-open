import { mergeConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import base from './vite.config'

// Explicit development fixture harness, excluded from production build entries.
export default mergeConfig(base, {
  define: { 'import.meta.env.VITE_POSTHOG_DASHBOARD_URL': JSON.stringify('https://us.posthog.com/project/123/dashboard/456') },
  resolve: { alias: { '@clerk/clerk-react': fileURLToPath(new URL('./qa/photos/clerk.ts', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5395, strictPort: true },
})
