import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from './vite.config';

// Explicitly invoked, development-only fixture harness. Never used by the build.
export default mergeConfig(base, {
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:5394') },
  resolve: { alias: { '@clerk/clerk-react': fileURLToPath(new URL('./qa/photos/clerk.ts', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5394, strictPort: true },
});
