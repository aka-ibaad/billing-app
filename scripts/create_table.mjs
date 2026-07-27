import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS user_data_sync (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        clients JSONB,
        invoices JSONB,
        expenses JSONB,
        products JSONB,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE user_data_sync ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for users to insert/update their own data
      CREATE POLICY "Users can insert their own data"
        ON user_data_sync FOR INSERT
        WITH CHECK (auth.uid() = user_id);
        
      CREATE POLICY "Users can update their own data"
        ON user_data_sync FOR UPDATE
        USING (auth.uid() = user_id);
        
      CREATE POLICY "Users can view their own data"
        ON user_data_sync FOR SELECT
        USING (auth.uid() = user_id);
    `
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

run();
