import { useEffect, type ReactNode } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useLocation } from 'react-router-dom';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isPostHogEnabled = Boolean(POSTHOG_KEY && POSTHOG_KEY !== 'YOUR_POSTHOG_KEY');

let postHogInitialized = false;
let postHogDisabledLogged = false;

export function PostHogPageView() {
  const location = useLocation();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (!posthogClient || !isPostHogEnabled) return;

    posthogClient.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: location.pathname,
      $search: location.search,
    });
  }, [location.pathname, location.search, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isPostHogEnabled) {
      if (import.meta.env.DEV && !postHogDisabledLogged) {
        console.info('PostHog not configured - analytics disabled');
        postHogDisabledLogged = true;
      }
      return;
    }

    if (typeof window === 'undefined' || postHogInitialized) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2025-11-30',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
    });

    postHogInitialized = true;
  }, []);

  if (!isPostHogEnabled) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { usePostHog };
