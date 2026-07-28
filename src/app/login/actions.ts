'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type AuthFormState = { error: string } | null

// Previously these redirected to `/login?message=...` / `/signup?message=...`
// on failure, which put the error text in the URL. That meant refreshing the
// page (or just hitting back) re-displayed the old error with nothing to
// indicate it wasn't from a fresh attempt — confusing at best, and if
// someone assumed the stale message reflected credentials they hadn't
// actually resubmitted yet, it could look like a correct password was being
// rejected. Returning `{ error }` instead keeps the message in React state
// via useActionState, so it only ever reflects the most recent submission
// and a plain page refresh always starts clean.
export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Could not authenticate. Check your email and password and try again.' }
  }

  revalidatePath('/', 'layout')

  const role = data?.user?.app_metadata?.role
  redirect(role === 'admin' ? '/admin/dashboard' : '/dashboard')
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const companyName = formData.get('companyName') as string
  const userName = formData.get('userName') as string

  if (!companyName || !userName) {
    return { error: 'Company Name and Your Name are required' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName,
        user_name: userName,
      }
    }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Email already in use' }
    }
    return { error: 'Could not create account: ' + error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/pending')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
