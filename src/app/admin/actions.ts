'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Ensure caller is admin
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role || 'merchant'
  
  if (!user || role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function listUsers() {
  await checkAdmin()
  const adminAuthClient = createAdminClient().auth.admin
  
  const { data, error } = await adminAuthClient.listUsers()
  if (error) throw error
  
  return data.users
}

export async function createUser(formData: FormData) {
  await checkAdmin()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const adminAuthClient = createAdminClient().auth.admin
  const { data, error } = await adminAuthClient.createUser({
    email,
    password,
    email_confirm: true, // Automatically confirm email for admin-created users
  })

  if (error) throw error

  revalidatePath('/admin')
}

export async function deleteUser(userId: string) {
  await checkAdmin()
  
  const adminAuthClient = createAdminClient().auth.admin
  const { error } = await adminAuthClient.deleteUser(userId)
  
  if (error) throw error

  revalidatePath('/admin')
}
