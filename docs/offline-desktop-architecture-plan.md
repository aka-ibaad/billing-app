# Bespoke Billing — Offline Desktop, Online Mobile, and Paywall Architecture Plan

> **SHELVED (desktop portion only) — do not implement sections 1b–5 below.** After this plan was written, the user decided to keep the app as it is now: web + the Capacitor mobile shell, live Supabase only, no offline mode and no local database option anywhere. The Electron desktop app, the `DataProvider` abstraction, the SQLite schema, and the sync engine were never built and should not be — this section is kept only as a historical record of what was considered and explicitly turned down, so a future agent doesn't rebuild it without knowing that was already decided against.
>
> **Still current:** mobile is read-only/online (implemented, see `AGENT_HANDOFF.md`), the live invoice document preview is web-only (implemented), and section 6 (admin-controlled paywall/entitlements) is still a live, unbuilt idea — it wasn't tied to the desktop plan and hasn't been shelved.

This is a design document, not code. Nothing described here has been built yet — it's meant to get agreement on the shape of the system before I start touching source files, since this is a genuinely large change (offline engine, native packaging, sync, entitlements) and getting the data model wrong early is expensive to undo later.

A note on what I can and can't do in this session: I have file read/write access to the project but no shell or build tools available (no `npm install`, no compiler, no way to actually produce a `.exe` or `.apk`). I can write every source file, config, and script this plan calls for, but the actual `npm run build` / Electron packaging / app-store submission steps need to be run by you (or in a proper CI environment), and I'll hand you the exact commands when we get there.

## 1. The shape of the system

Three things need to coexist, each with a different relationship to the network:

**Desktop (Windows, via Electron)** — offline-first. The app must fully work with no internet connection: create/edit/delete clients, invoices, products, expenses, and view reports, all against a local database on the user's machine. When a connection is available, it syncs up to and down from Supabase in the background.

**Mobile (iOS/Android, via Capacitor — already scaffolded in this repo)** — online-only and **view-only**. No local database, no create/edit/delete of any kind — every mutating action is disabled and the app only reads live from Supabase. This is now implemented: `AppDataContext.tsx` exposes an `isReadOnly` flag (true whenever `Capacitor.isNativePlatform()` is true), every mutating function throws if called while it's true as a defense-in-depth backstop, and every page hides its create/edit/delete UI behind that same flag with a "read-only on mobile" banner in its place.

**Web (current Next.js app on Vercel)** — stays exactly as it is today, always online, direct-to-Supabase (the migration we just finished).

Supabase remains the single source of truth for anything that isn't sitting unsynced on someone's desktop. The desktop app is the only place that needs real offline-first engineering; mobile is now settled as read-only/online, and web doesn't change from what exists right now.

## 1b. Desktop: cloud mode or local mode, user's choice

Updated decision: the desktop app isn't offline-only — it offers **both** modes, and the user picks, either during first-run setup or later in Settings:

- **Cloud mode** — behaves exactly like the web app today: every read/write goes straight to Supabase (`SupabaseDataProvider`, see below), no local database involved. Good default for someone who's always online and just wants the native window/feel described in section 2 below.
- **Local mode** — the full offline-first SQLite + sync engine described in sections 3-5. Good for anyone who wants to keep working with no connection (spotty internet, fieldwork, etc.).

This choice is a **per-install setting**, not a one-time irreversible decision — switching from cloud to local (or back) means either starting a local database from a fresh pull of Supabase, or, when going local-to-cloud, doing one final push-then-switch so nothing written locally is lost. That switch flow is worth its own small UI ("Switching to Local Mode will download a copy of your data to this computer" / "Switching to Cloud Mode will upload any changes made on this computer first") — a checkbox in Settings isn't enough on its own, it needs that one confirmation step to avoid silent data loss.

Practically, this doesn't change the architecture below at all — it just means `SupabaseDataProvider` and `SqliteDataProvider` (section 3) are both real, live options inside the Electron build, selected by the user's setting rather than one of them existing only for mobile/web. The `DataProvider` abstraction was already designed with exactly this kind of swap in mind.

## 2. Desktop shell: Electron

You asked for my recommendation — Electron over Tauri, for one practical reason: it lets desktop-only code (the local SQLite database, file system access, native menus/tray icon) run in plain Node.js, in the same language and mostly the same libraries as the rest of this codebase. Tauri would require learning and maintaining a parallel Rust codebase for anything touching the local database or filesystem, which is a real ongoing cost for a small team. Electron's downsides — bigger install size, more RAM — matter much less for a billing/invoicing desktop tool than they would for, say, a game or a CPU-bound tool.

Practically, this means:

- A new top-level `electron/` folder in the repo: a `main.ts` (the Electron main process — creates the app window, owns the SQLite connection, handles the sync scheduler) and a `preload.ts` (the security bridge that exposes a narrow, safe API to the web page — never raw Node access).
- The existing Next.js app gets built as a static export (or run as a local server Electron points at) and loaded into the Electron window essentially unchanged for anything that's pure UI.
- The parts of the app that currently call Supabase directly (inside `AppDataContext.tsx`) need a **data-access layer swap**: when running inside Electron, reads/writes go to whichever provider the user picked (section 1b) — local SQLite via the preload bridge, or straight to Supabase. The component code (pages, forms) doesn't need to know or care which backend it's talking to — this is the most important design decision below.

**"Should look like a PC app, not a website."** Settled requirement: a resizable native window (not a fixed-size wrapper), with the app's layout actually responding to whatever size the user drags the window to — the same responsive CSS this app already has for mobile/tablet/desktop breakpoints just needs to keep working at arbitrary Electron window widths, which it should by default since nothing in the current layout is hardcoded to a browser chrome assumption. Concretely, this means: `resizable: true` (the default) on the `BrowserWindow`, a sensible `minWidth`/`minHeight` so the layout doesn't break at absurdly small sizes, native window controls (minimize/maximize/close) instead of anything mimicking a browser's UI, a real app icon and taskbar presence, and no visible address bar or browser chrome — Electron doesn't show one by default, which already gets most of the way there.

## 3. The data-access abstraction (why this matters most)

Right now, every page calls `useAppData()` and that context talks straight to Supabase. If Electron support just meant "sometimes call Supabase, sometimes call SQLite," every one of those ~15 call sites would need to know which environment it's in. That's fragile and it's exactly the kind of thing that causes subtle bugs later (a form that works on web but silently fails offline).

The fix is to introduce one interface — call it `DataProvider` — with methods like `addClient`, `updateInvoice`, `deleteExpense`, etc., matching what `AppDataContext` already exposes today. Two implementations satisfy it:

- `SupabaseDataProvider` — what `AppDataContext.tsx` already does today (used on web and mobile).
- `SqliteDataProvider` — same method signatures, but reads/writes the local database through the Electron preload bridge, and separately queues a sync record for anything that changed.

`AppDataContext` picks the right provider once, based on `typeof window !== 'undefined' && window.electronAPI` (a flag the preload script exposes only when running inside Electron), and every page keeps working exactly as it does now, with zero changes to the ~15 files updated in the last migration. This is the same reason that migration preserved the context's public shape — it pays off again here.

## 4. Local database schema (SQLite)

The local SQLite schema mirrors the Supabase relational schema table-for-table (`clients`, `products`, `invoices`, `invoice_items`, `expenses`, `settings`, `notifications`) with three additions needed only for sync bookkeeping:

- `_dirty` (boolean) — set to `true` on any local insert/update/delete, cleared once that row is confirmed synced to Supabase.
- `_updated_at` (timestamp) — last local modification time, used for conflict resolution (see below).
- `_deleted` (boolean) — soft-delete flag. Deletes are marked, not physically removed, until the deletion itself has synced — otherwise a delete that happens offline can't be told apart from a row that simply hasn't synced yet.

A `better-sqlite3` (synchronous, fast, well-supported in Electron's main process) database file lives in the OS's app-data folder (e.g. `%APPDATA%/BespokeBilling/data.db` on Windows), separate from anything the installer touches, so it survives app updates.

## 5. Sync engine and conflict resolution

Sync runs on three triggers: app startup (if online), reconnect (a `navigator.onLine` listener), and every N minutes while the app is open. It is not "always on" in the sense of a live socket — this is a periodic reconcile, which is simpler and more predictable to reason about and debug than real-time sync.

**Direction 1 — push local changes up.** Every row with `_dirty = true` gets pushed to Supabase (insert/update/delete as appropriate). On success, `_dirty` is cleared and, for soft-deleted rows, the local row is now actually removed.

**Direction 2 — pull remote changes down.** Fetch everything from Supabase with `updated_at` newer than the last successful sync timestamp, and upsert it into SQLite.

**Conflict rule:** last-write-wins by timestamp, compared field-by-field is not worth the complexity for this app — whole-row last-write-wins is simpler and matches how most small-business tools handle this (a merchant is very unlikely to be editing the same invoice on their desktop and phone in the same minute). If both a local and remote change exist for the same row since the last sync, the one with the later timestamp wins and the other is discarded. This should be stated clearly in the UI ("Last saved wins if edited in two places") rather than hidden — worth a short note in Settings.

One correctness detail that needs to be decided now rather than discovered later: **invoice numbers.** If two people (or one person on two offline devices) create an invoice while both offline, they could pick the same next number. The safest fix is to stop trusting a locally-computed "next number" as final — either generate invoice numbers as a client-side UUID-based sequence that's cosmetically formatted (e.g. prefix + short random suffix) instead of a strict incrementing counter, or accept that the number is provisional and can be resequenced on next sync if a collision is detected. I'd recommend the first option; it avoids ever needing to silently renumber a document a merchant may have already printed or sent.

## 6. Paywall / entitlements (admin-controlled)

The `settings.plan` column already exists (`'free' | 'pro'`) but nothing gates on it today. The plan:

- Add an `entitlements` table in Supabase: `merchant_id`, `feature_key` (text, e.g. `'multi_user'`, `'pdf_watermark_removal'`, `'unlimited_invoices'`), `enabled` (boolean), `granted_by` (admin's user id), `granted_at`. This is more flexible than a single `plan` string — it lets you flip individual features per merchant rather than only whole-plan tiers, and it gives you an audit trail of which admin granted what, which the earlier production-readiness audit already flagged as missing (no audit log existed anywhere in the app).
- A small `getEntitlements(merchantId)` helper, callable from both the app (to decide what UI to show/gate) and from `AppDataContext`'s load — entitlements load once at session start alongside settings.
- Gate in two layers, not one: hide/disable the feature in the UI (good UX, prevents confusion) **and** check it again in any server action or RLS policy that performs the gated action (so a technically inclined free user can't just re-enable a hidden button via devtools). The audit already flagged that most of this app's server actions don't validate input server-side, so this is a good moment to close that gap for anything paywall-relevant specifically.
- Admin dashboard gets a new small panel per merchant — a list of feature toggles, each a simple approve/revoke action calling a new `setEntitlement(merchantId, featureKey, enabled)` server action, mirroring how `approveUser`/`suspendUser` already work.
- This doesn't require deciding real payment processing right now (Stripe integration, etc.) — entitlements can be granted manually by you at first, and wired to real payment/subscription events later without changing the underlying table shape.

## 7. Suggested build order

Roughly in the order that de-risks the largest unknowns first, since each phase produces something testable rather than one giant change:

1. **Data-access abstraction** — introduce the `DataProvider` interface and refactor `AppDataContext` to use it, with `SupabaseDataProvider` as the only implementation initially (web/mobile behavior unchanged, this is pure refactor). This alone should be shippable and verifiable before anything Electron-specific exists.
2. **SQLite schema + `SqliteDataProvider`** — build and unit-test the local data layer in isolation, without Electron packaging yet (can run against a plain Node script).
3. **Sync engine** — push/pull logic against a real (or staging) Supabase project, tested with deliberately-induced conflicts.
4. **Electron shell** — window, preload bridge, packaging config, wiring the existing Next.js UI into it, plus the cloud/local mode picker from section 1b.
5. **Entitlements table + admin UI + gating** — independent of the above, could actually happen in parallel or before desktop work if you want the paywall sooner.
6. **Mobile packaging** — lowest new-engineering item since Capacitor is already configured and mobile stays online-only/read-only; this is mostly build/signing/store-submission work rather than new app logic.

## 8. Open questions worth deciding before starting implementation

- **Multi-device conflict UX**: is silent last-write-wins acceptable, or do you want the app to warn ("this invoice was also edited on your phone — keep desktop or server version?") for at least the invoice/expense tables where money is involved? This changes the sync engine's complexity meaningfully.
- **Distribution**: unsigned Electron installers trigger Windows SmartScreen warnings on first run. Are you planning to get a code-signing certificate, or is "click through a warning once" acceptable for now?
- **Feature list for the paywall**: which specific features get gated (multi-user seats? unlimited invoices? removing a watermark? PDF export limits?) — the `entitlements` table design above works for any of these, but naming the actual feature keys needs user input.
- **Mobile store timeline**: does mobile packaging (App Store/Play Store submission, which involves developer accounts, signing, and review time on Apple's side) happen in the same push as desktop, or after desktop ships?
- **Default desktop mode**: should a fresh install default to Cloud mode or Local mode? (Recommend defaulting to Cloud — it's the lower-risk, already-proven path — and letting the user opt into Local mode explicitly.)

Once these are settled, start on step 1 above, which is safe to build and verify without touching anything Electron- or mobile-specific yet.
