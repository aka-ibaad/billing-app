// DEPRECATED — no longer used.
//
// This file backed the old localStorage -> `user_data_sync` blob-sync
// mechanism. Now that AppDataContext writes directly to Supabase's
// relational tables (clients, products, invoices, invoice_items, expenses,
// settings, notifications) on every mutation, there is nothing left that
// calls syncToSupabase().
//
// I don't have shell access in this session to actually delete this file
// (or src/app/api/sync/route.ts, its counterpart), so it's left as this
// empty stub instead. Safe to delete both files by hand — nothing in the
// app imports either of them anymore.
export {};
