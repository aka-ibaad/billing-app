import type { CapacitorConfig } from '@capacitor/cli';

// This wraps the LIVE, hosted version of the app in a native iOS/Android
// shell — it does not bundle a static copy of the site into the app. That's
// a deliberate choice: this Next.js app already runs as a normal server
// (next dev / next start), and switching next.config.ts to
// `output: 'export'` to bundle static files would silently break that
// existing deployment path (next start doesn't work against an export
// build). Pointing at the deployed URL keeps the web app and the native
// wrapper on the same codebase with zero build-mode tradeoffs.
//
// Mobile requires an internet connection — there is no local storage,
// offline queue, or offline mode anywhere in this app (a separate
// offline-first Electron desktop app was considered and explicitly
// shelved — the app stays live-Supabase-only, web + this Capacitor mobile
// shell, no local database option).
//
// Mobile was briefly made view-only (create/edit/delete disabled), then
// that was reversed — mobile now has full read/write, same as web. The
// on/off switch for that feature is still in AppDataContext.tsx
// (`MOBILE_READ_ONLY_ENABLED`, currently false) if it's ever wanted again.
//
// One narrower restriction is still in place: the live/styled invoice
// document preview is web-only (a plain fallback message shows on mobile
// instead) — see InvoicePreview.tsx. That was a separate decision from the
// read/write question and wasn't reversed.
//
// TODO before shipping to a store: replace `server.url` below with your
// real production URL (e.g. https://billing.yourdomain.com). Until then,
// this points at localhost for local development against `next dev` —
// note that only works when testing on the iOS Simulator / Android
// Emulator on the same machine, not on a physical device.
const config: CapacitorConfig = {
  appId: 'com.acmecorp.bespokebilling',
  appName: 'Bespoke Billing',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    // Matches the manifest's theme_color / the dark-theme sidebar so the
    // native status bar doesn't flash white behind the app on cold start.
    backgroundColor: '#050505',
  },
};

export default config;
