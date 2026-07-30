// DEPRECATED — no longer used.
//
// This route received the old localStorage -> `user_data_sync` blob sync
// POSTs from src/utils/sync.ts. AppDataContext no longer calls that sync
// path (it writes directly to Supabase's relational tables now), so
// nothing hits this endpoint anymore.
//
// I don't have shell access in this session to delete this file (or
// src/utils/sync.ts, its counterpart), so it's left as this stub that
// returns 410 Gone instead of silently accepting writes to a table nothing
// reads from anymore. Safe to delete this file (and the now-empty
// src/app/api/sync/ folder) by hand.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'This sync endpoint has been retired.' }, { status: 410 });
}
