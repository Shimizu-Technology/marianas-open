import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Compute once per build; repeated deploys of the same commit need distinct guards.
const commit = process.env.COMMIT_REF || process.env.GITHUB_SHA || 'local'
const deployment = process.env.DEPLOY_ID || process.env.BUILD_ID || Date.now().toString()

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(`${commit}-${deployment}`),
  },
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    rolldownOptions: {
      preserveEntrySignatures: false,
      output: {
        strictExecutionOrder: true,
        // Rolldown's recursive manual chunks could pull React into the admin group.
        // Match each module explicitly; shared dependencies keep their own chunk.
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'react', test: /node_modules\/(?:react|react-dom|scheduler|react-router|react-router-dom)\//, priority: 50 },
            { name: 'auth', test: /node_modules\/@clerk\//, priority: 40 },
            { name: 'motion', test: /node_modules\/(?:framer-motion|motion-dom|motion-utils)\//, priority: 30 },
            { name: 'analytics', test: /node_modules\/posthog-js\//, priority: 20 },
            { name: 'admin', test: /node_modules\/@dnd-kit\//, priority: 10 },
          ],
        },
      },
    },
  },
})
