'use client';

import { useEffect } from 'react';

// Registers the offline-shell service worker (public/sw.js). Split into its
// own client component rather than an inline script in layout.tsx so it
// doesn't block hydration and can safely bail out on unsupported browsers.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Registering in development would cache the dev server's unminified,
    // frequently-changing output and fight with hot reload, so this only
    // runs against a production build.
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the app works fine without offline support, it just
      // won't be available without a network connection.
    });
  }, []);

  return null;
}
