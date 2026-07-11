# Marianas Open web application

React/TypeScript frontend for the public Marianas Open platform and its lazy-loaded administration console.

```bash
npm install
npm run dev
```

Use `npm run lint` and `npm run build` before shipping. `VITE_API_URL` selects the Rails API and `VITE_CLERK_PUBLISHABLE_KEY` enables invite-only admin authentication. See `src/services/api.ts` for the typed API contract and `src/pages/admin` for the operating console.
