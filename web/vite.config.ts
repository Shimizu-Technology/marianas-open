import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id)) return 'react'
          if (id.includes('node_modules/@clerk/')) return 'auth'
          if (id.includes('node_modules/framer-motion/')) return 'motion'
          if (id.includes('node_modules/posthog-js/')) return 'analytics'
          if (id.includes('node_modules/@dnd-kit/')) return 'admin'
          return undefined
        },
      },
    },
  },
})
