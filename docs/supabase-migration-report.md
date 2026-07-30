# Supabase Migration + Password Toggle — What Changed

I'm not able to run a build, typecheck, or test suite in this session (no shell access), so **please do a manual click-through of every page before trusting this in production** — create/edit/delete a client, an invoice, a product, an expense, save Settings, and check the admin dashboard. This is the highest-risk change made to this app so far because it rewrites the entire data layer.

## 1. What you need to do first — run the SQL

Nothing in the app will work correctly until you run **`supabase_migration_002_settings_notifications.sql`** against your Supabase project (SQL Editor, or `psql`/`supabase db execute`). It's additive and idempotent — safe to run even if parts of it already exist. It adds:

- A `settings` table (previously Settings only existed inside the localStorage/JSON blob — there was no real table for it).
- A `notifications` table (same story).
- Missing columns on `invoices` (multi-tax, discounts, receipt vs. A4 format, order status, payment terms, expected-ready date/time) and `expenses` (payee name, paid/unpaid status) that the app's actual data model needs but the original `supabase_schema.sql` didn't have.
- Indexes on the foreign keys the app actually queries by.
- A trigger that auto-creates a default `settings` row for new signups.

For your **existing** merchants (signed up before this migration), the app defensively creates their settings row itself on first load after you deploy this — you don't need to backfill anything by hand.

This has already been run successfully against the production Supabase project (`aka-ibaad's Org` / `Billing App` / `main`) as of this writing.

## 2. What actually changed

**Data now lives in Supabase, not the browser.** `AppDataContext.tsx` no longer touches `localStorage` for business data. Every add/update/delete for clients, invoices, products, expenses, settings, and notifications now does a real Supabase query, scoped by Row Level Security (`auth.uid() = merchant_id`) so merchants can only ever see their own data. On load, the app fetches everything fresh from Supabase instead of reading a local cache.

Practical effects: data now syncs correctly across devices/browsers (no more "last full snapshot wins" overwrite risk), a closed tab can no longer lose your last few seconds of edits, and you can now run a real SQL report against a merchant's invoices instead of re-parsing a JSON blob client-side.

**The old sync mechanism is retired, not deleted.** No shell access was available to actually `rm` `src/utils/sync.ts` and `src/app/api/sync/route.ts` — both are still present but now stubbed to no-ops (the API route returns `410 Gone`, the sync function file is just a comment). Nothing in the app calls either of them anymore. Safe to delete both files whenever convenient.

**Admin dashboard now reads real numbers.** It used to read the `user_data_sync` JSON blob (which was the only thing that table was ever for). It now aggregates real counts and paid totals directly from the `clients` and `invoices` tables using the service-role client, per merchant (`getMerchantStats()` in `src/app/admin/dashboard/actions.ts`). The `user_data_sync` table itself is left in place (not dropped) — it's just unused now.

**Password visibility toggle** — a reusable `PasswordInput` component (`src/components/PasswordInput.tsx`, eye/eye-slash icon) applied to all three password fields in the app: login, signup, and the admin dashboard's password-reset field.

## 3. A deliberate exception: theme preference stays in localStorage

`ThemeContext`'s light/dark/system preference still uses `localStorage`, not Supabase. This was intentional — it's a UI preference, not business data, and the root layout has a synchronous inline script that reads it before React hydrates specifically to avoid a flash of the wrong theme on load. Moving that to an async Supabase call would reintroduce that flash.

## 4. Things worth knowing

- **Line items are fully replaced on every invoice edit**, not diffed. Editing an invoice deletes its old `invoice_items` rows and re-inserts the current set.
- **"Seed Demo Data" inserts real rows** through the same Supabase calls as manual entry, instead of just setting local React state.
- **None of this was verified by actually running the app** — no `npm run build`, no typecheck, no dev server were available in the session that made this change. Treat it as needing a real QA pass if that hasn't happened yet.

## Field mapping reference (camelCase app type ↔ snake_case DB column)

- **Client**: `id↔id, name↔name, email↔email, phone↔phone, address↔address, createdAt↔created_at` (table `clients`).
- **Product**: `id↔id, name↔name, description↔description, defaultRate↔price` (table `products`).
- **Expense**: `id↔id, payeeName↔payee_name, description↔description, amount↔amount, category↔category, status↔status, date↔date` (table `expenses`).
- **Invoice**: `id↔id, clientId↔client_id, number↔invoice_number, issueDate↔issue_date, issueTime↔issue_time, dueDate↔due_date, status↔status, notes↔notes, taxes↔taxes (JSONB), discount.type/value↔discount_type/discount_value, format↔format, documentType↔document_type, paymentStatus↔payment_status, advanceAmountPaid↔advance_amount_paid, expectedReadyDate↔expected_ready_date, expectedReadyTime↔expected_ready_time, orderStatus↔order_status`; `items↔` separate `invoice_items` rows (`description, quantity, unit_price↔rate, total`).
- **Settings**: 1:1 snake_case mapping to the `settings` table (`merchant_id` PK), including `monthly_revenue_goal`.
- **AppNotification**: `id↔id (TEXT, preserves app-generated dedup-prefixed ids), title↔title, message↔message, type↔type, isRead↔is_read, date↔created_at, link↔link` (table `notifications`).

All mapping functions live at the top of `src/context/AppDataContext.tsx` (`mapClientRow`, `mapProductRow`, `mapExpenseRow`, `mapInvoiceRow`, `mapSettingsRow`, `mapNotificationRow`).
