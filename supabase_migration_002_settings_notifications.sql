-- ==========================================
-- MIGRATION 002 — Settings, Notifications, and the
-- columns the app actually needs on invoices/expenses
-- ==========================================
-- Run this AFTER supabase_schema.sql (via the Supabase SQL editor, or
-- `supabase db execute` / psql against your project). Written to be safe to
-- run against a database that already has the base schema applied — every
-- statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), so
-- re-running this file is a no-op past the first time.
--
-- Context: the app previously stored all business data in the browser
-- (localStorage) with a periodic JSON-blob backup to a `user_data_sync`
-- table that nothing but the admin dashboard ever read. This migration adds
-- what was missing for the app to use the *relational* schema in
-- supabase_schema.sql as the real source of truth instead: a `settings`
-- table (there wasn't one — Settings lived entirely in the JSON blob), a
-- `notifications` table (same story), and several columns the app's actual
-- Invoice/Expense data model needs that weren't in the original schema
-- (multi-tax support, discounts, receipt vs. A4 format, order status, etc.).
--
-- `user_data_sync` itself is left in place (not dropped) — the app no
-- longer writes to it after this migration, but dropping a table someone
-- else might still have a reference to isn't something to do from here.
-- Safe to drop it yourself once you've confirmed the new tables are working.

-- ==========================================
-- 1. SETTINGS (one row per merchant)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.settings (
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  business_email TEXT NOT NULL DEFAULT '',
  business_address TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  avatar_url TEXT,
  header_text TEXT,
  ntn_number TEXT,
  phone TEXT,
  website TEXT,
  footer_text TEXT,
  signature_url TEXT,
  watermark_text TEXT,
  letterhead_url TEXT,
  -- Small, fixed-shape array (rarely more than a handful of tax rules per
  -- merchant) — a JSONB column here is simpler than a join table and this
  -- is exactly the kind of flexible, low-cardinality structured data JSONB
  -- is meant for, unlike invoices/clients which get their own real tables
  -- because they need to be queried, filtered, and reported on at scale.
  default_taxes JSONB NOT NULL DEFAULT '[]'::jsonb,
  enable_watermark BOOLEAN NOT NULL DEFAULT false,
  watermark_opacity INTEGER NOT NULL DEFAULT 5,
  watermark_size TEXT NOT NULL DEFAULT 'Large',
  watermark_position TEXT NOT NULL DEFAULT 'Center',
  watermark_custom_x INTEGER NOT NULL DEFAULT 50,
  watermark_custom_y INTEGER NOT NULL DEFAULT 50,
  watermark_rotation INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  monthly_revenue_goal DECIMAL(14,2) NOT NULL DEFAULT 1000000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Merchants manage own settings" ON public.settings FOR ALL USING (auth.uid() = merchant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. NOTIFICATIONS
-- ==========================================
-- id is TEXT, not UUID: the app generates dedup-friendly ids client-side
-- (e.g. "smart-<invoiceId>-today-<timestamp>") and matches against the
-- prefix to avoid re-notifying about the same due date. Forcing a UUID
-- here would break that matching, so the table just stores whatever id
-- shape the app hands it.
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Merchants manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = merchant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS notifications_merchant_id_idx ON public.notifications(merchant_id);

-- ==========================================
-- 3. INVOICES — columns the app's data model needs
--    that the original schema didn't have
-- ==========================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_time TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'horizontal';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS advance_amount_paid DECIMAL(12,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS expected_ready_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS expected_ready_time TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'Pending';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12,2);
-- Multiple named taxes per invoice (e.g. "GST 5%" + "Service Tax 2%")
-- weren't representable by the original single tax_rate/tax_amount pair.
-- Same JSONB reasoning as settings.default_taxes above.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS taxes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ==========================================
-- 4. EXPENSES — columns the app's data model needs
-- ==========================================
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Unpaid';

-- ==========================================
-- 5. Helpful indexes for the queries the app actually runs
--    (list-by-merchant, sorted by date)
-- ==========================================
CREATE INDEX IF NOT EXISTS clients_merchant_id_idx ON public.clients(merchant_id);
CREATE INDEX IF NOT EXISTS products_merchant_id_idx ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS invoices_merchant_id_idx ON public.invoices(merchant_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS expenses_merchant_id_idx ON public.expenses(merchant_id);

-- ==========================================
-- 6. Auto-create a default settings row alongside the existing
--    profiles row when a new user signs up
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.settings (merchant_id, business_name, business_email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'company_name', ''), COALESCE(new.email, ''))
  ON CONFLICT (merchant_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_settings();
