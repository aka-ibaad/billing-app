# Production Readiness Audit — Bespoke Billing

Based on a direct read of the codebase as it existed before the Supabase migration (see `supabase-migration-report.md` for what's changed since — item #1 below, "business data lives in the browser," has since been fixed). Kept here for the rest of the findings, which are still current as of this writing.

---

## Critical — would cause real harm to real customers

**1. ~~Business data lives in the browser, not the database.~~ FIXED.** See `supabase-migration-report.md` — `AppDataContext.tsx` now reads/writes Supabase directly instead of localStorage + a JSON blob sync.

**2. No automated tests.** Zero unit, integration, or E2E tests anywhere in the repo. For an app that calculates money (taxes, discounts, totals, partial payments), that's the one category of bug you can't afford to catch by manual clicking around after every change.

**3. No monetization enforcement.** `settings.plan` has `'free' | 'pro'` values, but nothing in the code gates any feature by plan, and there's no Stripe (or any payment provider) integration. Addressed in the architecture plan (`offline-desktop-architecture-plan.md`, section 6) via a new `entitlements` table, not yet implemented.

**4. No rate limiting on auth.** Login and signup have no app-level throttling — nothing stops scripted credential-stuffing or repeated signup spam beyond whatever Supabase's own auth service does by default.

**5. No password recovery.** There's no "Forgot password" link or flow for merchants. The only way a locked-out user gets back in is the admin manually resetting their password from the admin dashboard.

**6. No security headers.** `next.config.ts` is empty — no CSP, no `X-Frame-Options`, no `Referrer-Policy`, no HSTS.

**7. No error monitoring.** Every catch block does `console.error(...)` and stops there. In production, failed logins, failed syncs, and failed admin actions are invisible unless a user reports them.

**8. No transactional email.** Approving, rejecting, or suspending a merchant produces no email. No email confirmation step enforced at signup, no invoice-reminder emails.

**9. Images are stored as base64 text, not files.** Logos, signatures, letterheads, and avatars are read via `FileReader` and stored as base64 data URLs directly inside the settings row. Belongs in Supabase Storage (or S3/R2) served through a CDN instead.

---

## Important — fix before scaling past a handful of customers

- **No audit log.** Nothing records which admin approved, suspended, or deleted which merchant, or when.
- **Orphaned data on delete.** `deleteUser` removes the Supabase auth user but never touches their old `user_data_sync` row (now unused anyway, but worth cleaning up if you drop that table).
- **No pagination anywhere.** The admin user list, invoice tables, and client tables all load every row into memory and render it.
- **No runtime input validation.** Server actions do `formData.get('x') as string` with no schema validation (Zod would close this gap cheaply).
- **No CI pipeline.** No `.github/workflows` or equivalent.
- **Currency is hardcoded to "Rs."**
- **No legal pages.** No Terms of Service, Privacy Policy, or Refund Policy.
- **No 2FA.**
- **Client-side-only PDF generation.** `html2canvas` + `jsPDF` run entirely in the browser.
- **Single account per business.** No team seats, invites, or per-user permissions.

---

## Worth doing, lower urgency

- No `robots.txt`/sitemap or public marketing pages.
- No self-service "export/download my data" for merchants.
- No webhook or public API for accounting-software integrations.
- No documented staging/production environment separation.
- Accessibility has had a partial pass but no full WCAG audit.
- No changelog or release process.

---

## What's already solid

Row Level Security is correctly enabled and scoped on every table; the login/signup/admin action flows have proper pending states and don't leak stale error messages across refreshes; the design system (color tokens, spacing scale, dark/light theming) is well-built and consistent; the admin approval workflow (pending → approved/rejected/suspended) is a sound shape for gating who gets into the app; and as of the Supabase migration, the data layer is now a real relational database with RLS rather than a client-side JSON blob.
