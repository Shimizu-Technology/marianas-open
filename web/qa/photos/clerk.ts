// Only the dedicated QA Vite config aliases Clerk. Production has no bypass.
export function useAuth() { return { userId: 'd4-synthetic-staff', sessionId: 'd4-synthetic-session', isLoaded: true, isSignedIn: true }; }
export function useUser() { return { user: { id: 'd4-synthetic-staff' }, isLoaded: true, isSignedIn: true }; }
