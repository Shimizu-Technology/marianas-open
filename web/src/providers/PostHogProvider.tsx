import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PostHog } from 'posthog-js';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
export const isPostHogEnabled = Boolean(POSTHOG_KEY && POSTHOG_KEY !== 'YOUR_POSTHOG_KEY');

const PostHogContext = createContext<PostHog | undefined>(undefined);
let clientPromise: Promise<PostHog> | undefined;
export function usePostHog() { return useContext(PostHogContext); }

function loadClient() {
  clientPromise ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2025-11-30',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
    });
    return posthog;
  }).catch(error => { clientPromise = undefined; throw error; });
  return clientPromise;
}

export function PostHogPageView() {
  const location = useLocation();
  const client = usePostHog();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!client) return;
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (lastPath.current === path) return;
    client.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
      $hash: location.hash,
      area: location.pathname.startsWith('/admin') ? 'admin' : 'public',
    });
    lastPath.current = path;
  }, [location, client]);
  return null;
}

// Rendered within the lazy admin auth boundary, where Clerk's user state is available.
export function PostHogIdentitySync() {
  const client = usePostHog();
  const { isSignedIn, userId, isLoading } = useAuthContext();
  const previousSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (!client || isLoading) return;
    if (isSignedIn && userId) client.identify(userId, { user_id: userId });
    // A fresh admin mount can follow sign-out in another tab or a prior visit.
    else if (previousSignedIn.current === true || client.get_property('$user_id')) client.reset();
    previousSignedIn.current = isSignedIn;
  }, [client, isLoading, isSignedIn, userId]);
  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<PostHog>();
  useEffect(() => {
    if (!isPostHogEnabled) return;
    let cancelled = false;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      loadClient().then(value => { if (!cancelled) setClient(value); }).catch(error => {
        if (import.meta.env.DEV) console.error('PostHog init failed:', error);
      });
    };
    // Two frames guarantee a paint opportunity before scheduling SDK download and init.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(load, { timeout: 3000 });
        else timer = setTimeout(load, 200);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      clearTimeout(timer);
    };
  }, []);
  return <PostHogContext.Provider value={client}>{children}</PostHogContext.Provider>;
}
