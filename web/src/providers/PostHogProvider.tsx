import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogEnabled = Boolean(POSTHOG_KEY && POSTHOG_KEY !== 'YOUR_POSTHOG_KEY');

let postHogInitialized = false;
let postHogDisabledLogged = false;
let initialCapturedPath: string | null = null;

const PostHogReadyContext = createContext(false);

function usePostHogReady() {
  return useContext(PostHogReadyContext);
}

export function PostHogPageView() {
  const location = useLocation();
  const posthogClient = usePostHog();
  const isPostHogReady = usePostHogReady();
  const lastCapturedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogClient || !isPostHogEnabled || !isPostHogReady) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    // Initial pageview is captured once in provider init. Skip duplicate on first effect run.
    if (lastCapturedPathRef.current === null && initialCapturedPath === currentPath) {
      lastCapturedPathRef.current = currentPath;
      return;
    }

    if (lastCapturedPathRef.current === currentPath) return;

    posthogClient.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
      $hash: location.hash,
      area: location.pathname.startsWith('/admin') ? 'admin' : 'public',
    });

    lastCapturedPathRef.current = currentPath;
  }, [location.pathname, location.search, location.hash, posthogClient, isPostHogReady]);

  return null;
}

function PostHogIdentitySync() {
  const posthogClient = usePostHog();
  const { isSignedIn, userId, isLoading } = useAuthContext();
  const isPostHogReady = usePostHogReady();
  const prevSignedInRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!posthogClient || !isPostHogEnabled || !isPostHogReady || isLoading) return;

    const prevSignedIn = prevSignedInRef.current;

    if (isSignedIn && userId) {
      posthogClient.identify(userId, {
        user_id: userId,
      });
      prevSignedInRef.current = true;
      return;
    }

    // Only reset on actual sign-out transitions, not on first anonymous page load.
    if (prevSignedIn === true && !isSignedIn) {
      posthogClient.reset();
    }

    prevSignedInRef.current = false;
  }, [posthogClient, isPostHogReady, isLoading, isSignedIn, userId]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(postHogInitialized);

  useEffect(() => {
    if (!isPostHogEnabled) {
      if (import.meta.env.DEV && !postHogDisabledLogged) {
        console.info('PostHog not configured - analytics disabled');
        postHogDisabledLogged = true;
      }
      return;
    }

    if (typeof window === 'undefined') return;

    if (postHogInitialized) {
      if (!initialCapturedPath) {
        initialCapturedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      }
      setIsReady(true);
      return;
    }

    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: '2025-11-30',
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
      });

      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        $search: window.location.search,
        $hash: window.location.hash,
        area: window.location.pathname.startsWith('/admin') ? 'admin' : 'public',
      });

      initialCapturedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      postHogInitialized = true;
      setIsReady(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('PostHog init failed:', error);
      }
    }
  }, []);

  if (!isPostHogEnabled) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogReadyContext.Provider value={isReady}>
        <PostHogIdentitySync />
        {children}
      </PostHogReadyContext.Provider>
    </PHProvider>
  );
}

export { usePostHog };
