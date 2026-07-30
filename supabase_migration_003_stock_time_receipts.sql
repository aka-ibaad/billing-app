-- ==========================================
-- MIGRATION 003 — Product stock tracking, time entries,
-- and a Storage bucket for expense receipt photos
-- ==========================================
-- Idempotent, safe to re-run, same conventions as migration 002.

-- ==========================================
-- 1. PRODUCTS — optional stock tracking
-- ==========================================
-- track_stock defaults to false so existing products (and anyone who just
-- wants a price catalogue, not real inventory) aren't forced into managing
-- quantities. stock_quantity is a DECIMAL, not INTEGER, so it can represent
-- fractional units (kg, meters, liters) as well as whole items.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold DECIMAL(12,2);

-- ==========================================
-- 2. TIME ENTRIES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT true,
  rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoiced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Merchants manage own time entries" ON public.time_entries FOR ALL USING (auth.uid() = merchant_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS time_entries_merchant_id_idx ON public.time_entries(merchant_id);

-- ==========================================
-- 3. STORAGE — expense receipt photos
-- ==========================================
-- Private bucket (not public) — receipts are accessed through signed URLs
-- generated on demand by the app, not a permanently public link.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under a path prefixed with the merchant's own user id
-- (e.g. "<merchant_id>/<expense_id>.jpg") — these policies check that the
-- first path segment matches the requesting user, same scoping principle
-- as every other table's `auth.uid() = merchant_id` policy.
DO $$ BEGIN
  CREATE POLICY "Merchants manage own receipt files"
    ON storage.objects FOR ALL
    USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
