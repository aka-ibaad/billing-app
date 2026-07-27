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

export async function getUsersSyncData() {
  await checkAdmin()
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('user_data_sync').select('*')
  if (error) throw error
  return data || []
}

export async function approveUser(userId: string) {
  await checkAdmin()
  
  const adminAuthClient = createAdminClient().auth.admin
  
  // First, get the current user metadata so we don't overwrite it
  const { data: userRecord, error: userError } = await adminAuthClient.getUserById(userId)
  if (userError) throw userError

  const currentMetadata = userRecord.user.app_metadata

  const { error } = await adminAuthClient.updateUserById(userId, {
    app_metadata: {
      ...currentMetadata,
      status: 'approved'
    }
  })
  
  if (error) throw error

  revalidatePath('/admin/dashboard')
}

export async function suspendUser(userId: string) {
  await checkAdmin()
  
  const adminAuthClient = createAdminClient().auth.admin
  
  const { data: userRecord, error: userError } = await adminAuthClient.getUserById(userId)
  if (userError) throw userError

  const currentMetadata = userRecord.user.app_metadata

  const { error } = await adminAuthClient.updateUserById(userId, {
    app_metadata: {
      ...currentMetadata,
      status: 'suspended'
    }
  })
  
  if (error) throw error

  revalidatePath('/admin/dashboard')
}

export async function changeUserPassword(formData: FormData) {
  await checkAdmin()
  const userId = formData.get('userId') as string
  const password = formData.get('password') as string

  if (!userId || !password) {
    throw new Error('User ID and password are required')
  }

  const adminAuthClient = createAdminClient().auth.admin
  const { error } = await adminAuthClient.updateUserById(userId, {
    password
  })
  
  if (error) throw error

  revalidatePath('/admin/dashboard')
}
export async function deleteUser(userId: string) {
  await checkAdmin()
  
  const adminAuthClient = createAdminClient().auth.admin
  const { error } = await adminAuthClient.deleteUser(userId)
  
  if (error) throw error

  revalidatePath('/admin/dashboard')
}
