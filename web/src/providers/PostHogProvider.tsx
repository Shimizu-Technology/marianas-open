import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useLocation } from 'react-router-dom';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogEnabled = Boolean(POSTHOG_KEY && POSTHOG_KEY !== 'YOUR_POSTHOG_KEY');

let postHogInitialized = false;
let postHogDisabledLogged = false;
let initialCapturedPath: string | null = null;

const PostHogReadyContext = createContext(false);
const PostHogInitialPageviewCapturedContext = createContext(false);

function usePostHogReady() {
  return useContext(PostHogReadyContext);
}

function useInitialPageviewCaptured() {
  return useContext(PostHogInitialPageviewCapturedContext);
}

export function PostHogPageView() {
  const location = useLocation();
  const posthogClient = usePostHog();
  const isPostHogReady = usePostHogReady();
  const initialPageviewCaptured = useInitialPageviewCaptured();
  const lastCapturedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogClient || !isPostHogEnabled || !isPostHogReady) return;

    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    // If provider already captured the initial pageview in posthog.init loaded callback,
    // skip only when this effect is still on that exact initial URL.
    if (
      initialPageviewCaptured &&
      lastCapturedPathRef.current === null &&
      initialCapturedPath === currentPath
    ) {
      lastCapturedPathRef.current = currentPath;
      return;
    }

    if (lastCapturedPathRef.current === currentPath) return;

    posthogClient.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
      $hash: location.hash,
    });

    lastCapturedPathRef.current = currentPath;
  }, [location.pathname, location.search, location.hash, posthogClient, isPostHogReady, initialPageviewCaptured]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(postHogInitialized);
  const [initialPageviewCaptured, setInitialPageviewCaptured] = useState(postHogInitialized);

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
      if (!initialCapturedPath && typeof window !== 'undefined') {
        initialCapturedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      }
      setInitialPageviewCaptured(true);
      setIsReady(true);
      return;
    }

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2025-11-30',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      loaded: (ph) => {
        ph.capture('$pageview', {
          $current_url: window.location.href,
          $pathname: window.location.pathname,
          $search: window.location.search,
          $hash: window.location.hash,
        });
        initialCapturedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        postHogInitialized = true;
        setInitialPageviewCaptured(true);
        setIsReady(true);
      },
    });
  }, []);

  if (!isPostHogEnabled) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogReadyContext.Provider value={isReady}>
        <PostHogInitialPageviewCapturedContext.Provider value={initialPageviewCaptured}>
          {children}
        </PostHogInitialPageviewCapturedContext.Provider>
      </PostHogReadyContext.Provider>
    </PHProvider>
  );
}

export { usePostHog };
