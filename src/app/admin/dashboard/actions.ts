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

// Replaces the old user_data_sync blob (which the app no longer writes to
// now that Supabase's relational tables are the source of truth). Uses the
// service-role admin client to read across every merchant's clients and
// invoices — RLS would otherwise scope these to auth.uid(), which has no
// meaning for an admin looking at someone else's data.
export type MerchantStats = {
  clientCount: number
  invoiceCount: number
  paidTotal: number
  lastActivity: string | null
}

export async function getMerchantStats(): Promise<Record<string, MerchantStats>> {
  await checkAdmin()
  const adminClient = createAdminClient()

  const [clientsRes, invoicesRes] = await Promise.all([
    adminClient.from('clients').select('merchant_id, created_at'),
    adminClient.from('invoices').select('merchant_id, status, total, created_at'),
  ])

  if (clientsRes.error) throw clientsRes.error
  if (invoicesRes.error) throw invoicesRes.error

  const stats: Record<string, MerchantStats> = {}

  const ensure = (id: string) => {
    if (!stats[id]) stats[id] = { clientCount: 0, invoiceCount: 0, paidTotal: 0, lastActivity: null }
    return stats[id]
  }
  const bump = (id: string, at: string) => {
    const s = ensure(id)
    if (!s.lastActivity || new Date(at) > new Date(s.lastActivity)) s.lastActivity = at
  }

  ;(clientsRes.data || []).forEach(c => {
    ensure(c.merchant_id).clientCount += 1
    bump(c.merchant_id, c.created_at)
  })

  ;(invoicesRes.data || []).forEach(inv => {
    const s = ensure(inv.merchant_id)
    s.invoiceCount += 1
    if (inv.status === 'Paid') s.paidTotal += Number(inv.total) || 0
    bump(inv.merchant_id, inv.created_at)
  })

  return stats
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
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const adminAuthClient = createAdminClient().auth.admin
  const { error } = await adminAuthClient.updateUserById(userId, {
    password
  })
  
  if (error) throw error

  revalidatePath('/admin/dashboard')
}
export async function rejectUser(userId: string) {
  await checkAdmin()
  
  const adminAuthClient = createAdminClient().auth.admin
  
  const { data: userRecord, error: userError } = await adminAuthClient.getUserById(userId)
  if (userError) throw userError

  const currentMetadata = userRecord.user.app_metadata

  const { error } = await adminAuthClient.updateUserById(userId, {
    app_metadata: {
      ...currentMetadata,
      status: 'rejected'
    }
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
