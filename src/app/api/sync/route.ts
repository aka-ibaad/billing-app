import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await request.json();
    
    // We use the admin client because the table might not have RLS policies set up perfectly yet,
    // and we want to ensure the sync always works. We enforce security by checking `user.id` above.
    const adminAuthClient = createAdminClient();
    
    const { error } = await adminAuthClient
      .from('user_data_sync')
      .upsert({
        user_id: user.id,
        clients: data.clients,
        invoices: data.invoices,
        expenses: data.expenses,
        products: data.products,
        settings: data.settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase sync error:', error);
      return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API sync route error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
