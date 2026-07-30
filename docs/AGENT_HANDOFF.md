# Agent Handoff — Bespoke Billing

Read this first if you're picking up this project in a new session. It's written so a fresh agent with no memory of prior conversations can understand what this app is, what's been done, what's mid-flight, and what to do next.

## What this app is

"Bespoke Billing" — a multi-tenant SaaS billing/invoicing app for merchants (create clients, invoices, products, expenses; track order status; generate PDF/image invoices). Built on Next.js 16 (Turbopack, App Router) with Supabase for auth + database, deployed on Vercel. There's an admin role that approves/suspends/rejects merchant signups from a separate `/admin/dashboard`. A Capacitor wrapper exists for mobile (iOS/Android). PWA support exists for installable web (`manifest.json`, `sw.js`).

The user (Aliya) runs this from Cowork with the project folder mounted at `E:\Billing App`. She is not a developer — explanations should stay practical and avoid assuming she'll read raw diffs or run arbitrary shell commands without exact instructions.

## Critical environment facts, read before doing anything

- **This project's own `AGENTS.md`** warns: "This is NOT the Next.js you know — breaking changes, different conventions from training data. Read `node_modules/next/dist/docs/` before writing code." Take this seriously — e.g., the middleware file is `src/proxy.ts`, not the conventional `middleware.ts`.
- **Session shell access varies.** Every session so far writing this doc had *no* shell/build access (`Not enough disk space to set up the workspace` or similar) — meaning no `npm install`, no `npm run build`, no typecheck, no way to actually delete a file or run a compiler. **Check whether you have shell access before assuming you don't** — if you do, you can finally run the build/typecheck that's been missing this whole project, which would be extremely valuable (nothing in this codebase has ever been verified to compile).
- **No Supabase credentials/DB access.** Only SQL migration *files* can be written; the user runs them herself via the Supabase SQL Editor (project: `aka-ibaad's Org` → `Billing App` → `main`, marked PRODUCTION).
- File tools (Read/Write/Edit) work against `E:\Billing App` directly regardless of shell availability — that's how all prior work got done.

## Read these next (in `docs/` alongside this file)

1. **`production-readiness-audit.md`** — full audit of gaps (security, testing, monetization, etc.) as of the pre-Supabase-migration codebase, with a note on what's since been fixed.
2. **`supabase-migration-report.md`** — what changed when the app moved from localStorage to Supabase as the real data store, plus the full camelCase↔snake_case field-mapping reference for every table.
3. **`offline-desktop-architecture-plan.md`** — the design (not yet implemented) for the Electron desktop app, read-only mobile, and admin-controlled paywall. This is the current frontier of the project — read it fully before touching anything Electron/sync/paywall-related.

## What's done (verified by direct file inspection, not by running the app)

- Full bug-fix pass: navigation links, notification stale-closure bug, RSC/Server-Component build error (`admin/dashboard`), login error persisting across refresh, `manifest.json`/`sw.js` being redirected to `/login` by middleware, admin dashboard UI polish.
- Loading states on every mutating button app-wide (prevents double-submit/spam).
- **Supabase migration** (see `supabase-migration-report.md`): `AppDataContext.tsx` fully rewritten to read/write Supabase directly (no more localStorage for business data). All ~15 call sites across `dashboard/*` pages updated to `await` the now-async context methods. Admin dashboard now aggregates real stats from `clients`/`invoices` instead of the old `user_data_sync` JSON blob. Migration SQL (`supabase_migration_002_settings_notifications.sql`, repo root) has been run successfully against production.
- Old sync mechanism (`src/utils/sync.ts`, `src/app/api/sync/route.ts`) is stubbed to no-ops, not physically deleted (no shell access to `rm` them at the time). Safe to delete.
- Password visibility toggle (`src/components/PasswordInput.tsx`) applied to login, signup, and the admin password-reset field.
- **Mobile read-only was built, then reversed.** `AppDataContext.tsx` briefly made mobile view-only (create/edit/delete disabled, `ReadOnlyBanner` shown across `clients`/`invoices`/`products`/`expenses`/`settings`/`RevenueGoalWidget`/`FloatingQuickCreate`/`CommandPalette`/`dashboard/page.tsx`), then the user asked for full read/write on mobile again. Rather than undo all that UI work, a single flag was added: `MOBILE_READ_ONLY_ENABLED` (currently `false`) in `AppDataContext.tsx`, right above `const isReadOnly = MOBILE_READ_ONLY_ENABLED && Capacitor.isNativePlatform();`. All the `isReadOnly`-gated UI across the app is still wired up and correct — flipping that one constant back to `true` re-enables mobile view-only mode exactly as it was, with no other changes needed. **Current behavior: mobile has full read/write, same as web.**
- **Live invoice document preview is web-only, but exports/Share still work on mobile.** `InvoicePreview.tsx` returns a plain "available on the web app" placeholder instead of the full styled document when `Capacitor.isNativePlatform()` is true — *unless* a new `forceRender` prop is passed, which bypasses that placeholder. This matters: PDF export, image export, and the new Share feature (below) all capture a hidden, off-screen, always-`forceRender`'d copy of the invoice (`draftCaptureRef` for the live builder draft, `shareCaptureRef` for a saved invoice being shared) — never the visible on-screen preview panel. That's what keeps exports/Share producing a real invoice image on mobile even though the visible preview correctly shows the "web only" message there. If you ever touch `InvoicePreview.tsx` or the capture logic in `invoices/page.tsx`, preserve this split — collapsing it back to one render path will silently break mobile exports again.
- **Share button (manual sharing, not automated email).** There's no customer-account concept in this app — a shopkeeper's clients never log into it — so invoices/quotations are shared manually via the device's native share sheet (Web Share API, `navigator.share` with files) rather than an automated email send. Falls back to downloading the image if the browser doesn't support file sharing. Available on the create/edit builder (shares the current draft), the desktop invoices table (per row), and the mobile swipe-card list. See `shareCanvasImage`/`shareDraft`/`handleShareSavedInvoice` in `invoices/page.tsx`.
- **Quotations reuse invoice branding and are now visually distinct.** `documentType: 'quotation'` already went through the same `InvoicePreview` component as invoices (same logo/letterhead/watermark/signature/footer from Settings) — that part was already correct. Polished further: quotations now say "PREPARED FOR" instead of "BILL TO", "Estimated Total" instead of "Total Due", and hide the invoice-only advance-payment/remaining-balance breakdown. Quick-create shortcuts for quotations were added to `FloatingQuickCreate.tsx` and `CommandPalette.tsx` (previously only invoices/receipts had shortcuts; quotation was only reachable via a dropdown inside the invoice builder).
- **The offline Electron desktop plan was designed then explicitly shelved** — see the section below before doing anything with `offline-desktop-architecture-plan.md`.
- **"Buildable now, no new cost" feature batch (largely complete).** Off the user's full feature checklist, the following were identified as buildable without new paid services and have been implemented:
  - **Product stock/quantity tracking** — opt-in per product (`trackStock`), `stockQuantity`/`lowStockThreshold` fields, +/- adjust buttons on the Products page, low-stock warning icon. Deliberately **not** auto-deducted on invoice creation (see comment on `adjustProductStock` in `AppDataContext.tsx` — edge cases around drafts/quotations/edits made that unsafe to guess at).
  - **Receipt photo uploads on expenses** — private Supabase Storage `receipts` bucket, `uploadReceipt`/`getReceiptUrl` in `AppDataContext.tsx`, upload UI + "View" link on the Expenses page.
  - **Auto-categorize expenses** — cheap keyword/substring matching (`suggestCategory` in `expenses/page.tsx`), no AI/API cost, always overridable by the user.
  - **Time tracking** — new `time_entries` table, full CRUD in `AppDataContext.tsx`, and a new `/dashboard/time-tracking` page (added to `Navigation.tsx`). Entries don't auto-attach to invoices; there's a manual "Mark Invoiced" toggle per entry instead.
  - **Formal reports** — `/dashboard/records` now has tabs: Overview (unchanged), Profit & Loss (cash basis — Paid invoices minus Paid expenses, broken down by expense category), Cash Flow (6-month in/out/net by month), Tax Summary (GST/VAT or any configured tax, grouped by name+rate, accrual basis on all issued invoices), and Forecast (naive 3-month projection from trailing 3-month averages plus invoices already due). All computed client-side from existing `invoices`/`expenses` data — no schema change needed beyond what already existed for taxes.
  - **CSV import** — a reusable `CsvImportModal` component (`src/components/CsvImportModal.tsx`) with a dependency-free CSV parser (`src/utils/csv.ts`, handles quoted/comma-embedded fields). Wired into Clients, Products, and Expenses pages with an "Import CSV" button — auto-guesses column mapping by header name, lets the user re-map before importing, imports row-by-row through the existing `addClient`/`addProduct`/`addExpense` functions so validation/RLS stays identical to manual entry, and reports per-row success/failure.
  - **New migration required:** `supabase_migration_003_stock_time_receipts.sql` (repo root) adds `products.track_stock/stock_quantity/low_stock_threshold`, the `time_entries` table, and the `receipts` Storage bucket + policy. **As of this writing the user has not yet run it** — receipt uploads and time entries will fail until she does (same pattern as migration 002: give her the exact SQL to paste into the Supabase SQL Editor).
  - **Deliberately NOT built yet — each needs a product decision from the user first, not just engineering:**
    - Chart of accounts / basic ledger — needs the user to decide the account structure (how granular, what categories) before a schema makes sense.
    - Recurring invoices/expenses + automated status workflows — needs `pg_cron` (available on Supabase for free) but the recurrence rules (which invoices, what cadence, auto-send vs. draft-only) need the user's input.
    - Multi-currency (manual rates) — needs the user to specify which currencies to support and default currency; app is currently hardcoded to "Rs." throughout.
    - Multi-user/team access with roles — the largest/most invasive remaining item; needs the user to define what roles exist and what each can do before touching RLS policies.

## The offline desktop plan was SHELVED — do not build it

An Electron-based offline-first desktop app (with a local SQLite database, a `DataProvider` abstraction, a sync engine, and a cloud-vs-local mode picker) was designed in `offline-desktop-architecture-plan.md`, but the user then decided **not** to pursue it: the app stays as it is now — web + the Capacitor mobile shell — live-Supabase-only, with no offline mode and no local database option anywhere, on any platform. That plan document is kept only as a historical record with a shelved notice at the top. **Do not implement it** unless the user explicitly asks to revisit it.

## What's planned but NOT yet built

**Admin-controlled paywall/entitlements** — this part of the plan was *not* shelved (it was never tied to the desktop work). New `entitlements` table (`merchant_id`, `feature_key`, `enabled`, `granted_by`, `granted_at`) in Supabase, gated in both UI and server-side, with an admin dashboard panel to toggle features per merchant. Specific feature keys to gate haven't been decided yet — ask the user before implementing. See section 6 of `offline-desktop-architecture-plan.md` for the design (that section is still current even though the rest of the doc is shelved).

### Open questions the user hasn't answered yet

- Exact feature list to gate behind the paywall.
- Any payment processing plans (Stripe etc.) to wire entitlements up to, or manual admin-granted only for now?

## Key architectural facts worth knowing before editing

- **`AppDataContext.tsx`** (`src/context/AppDataContext.tsx`) is the single source of truth for all business data on the client. It intentionally keeps its exported field/function shapes stable so the ~15 consumer pages/components don't need to change when the backend changes — preserve this discipline in any future refactor (the `DataProvider` abstraction plan depends on it).
- **RLS is used everywhere**, scoped by `auth.uid() = merchant_id`. The admin dashboard's server actions use a service-role client (`src/utils/supabase/admin.ts`) to bypass RLS for cross-merchant aggregation — this is intentional and correct, not a bug.
- **Server vs Client Component boundaries matter a lot in this Next.js version.** `@phosphor-icons/react` calls `React.createContext()` at module load — importing it directly into an async Server Component breaks the build. See `src/app/admin/dashboard/icons.tsx` for the established workaround pattern (a `'use client'` re-export wrapper) if this comes up again elsewhere.
- **Middleware is `src/proxy.ts`**, not `middleware.ts` — don't assume the standard Next.js convention here.
- Currency is hardcoded to "Rs." throughout — flagged in the audit as a real constraint if multi-currency is ever needed.

## Working conventions established in this project

- Never invent Supabase schema changes without writing them as a new numbered, idempotent SQL migration file (see `supabase_migration_002_settings_notifications.sql` for the pattern: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` for policies). The user runs these herself in the Supabase SQL Editor — always give her the exact copy-pasteable SQL in chat, don't assume she'll open the file.
- Copy any report/plan document into `E:\Billing App\docs\` (not just the temporary outputs scratchpad) if it should survive to a future session — the scratchpad is cleared between sessions, this repo folder is not.
- If shell access is unavailable, say so plainly rather than pretending a build/test was verified. This has been a recurring, explicitly-flagged constraint throughout the project.
