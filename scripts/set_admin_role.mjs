import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
  console.error('Missing environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setAdminRole() {
  console.log(`Looking up user: ${adminEmail}`);
  
  // Find the user by email (in a real app you might list users and filter)
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  const adminUser = usersData.users.find(u => u.email === adminEmail);
  
  if (!adminUser) {
    console.error(`User ${adminEmail} not found in auth.users!`);
    return;
  }

  console.log(`Found user ${adminUser.id}. Setting role to 'admin'...`);

  // Spread the user's existing app_metadata first — updateUserById replaces
  // app_metadata wholesale, so passing only { role: 'admin' } would silently
  // wipe any other field already set there (e.g. `status`), unlike the
  // approve/suspend/reject actions in src/app/admin/dashboard/actions.ts,
  // which all merge the same way this now does.
  const { data, error } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { app_metadata: { ...adminUser.app_metadata, role: 'admin' } }
  );

  if (error) {
    console.error('Error updating user role:', error);
  } else {
    console.log('Successfully set admin role!');
    console.log(`Current app_metadata for user:`, data.user.app_metadata);
  }
}

setAdminRole();
