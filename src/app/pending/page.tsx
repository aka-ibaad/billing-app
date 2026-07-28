import { logout } from '@/app/login/actions'
import styles from '@/app/login/login.module.css'
import SubmitButton from '@/components/SubmitButton'

import { createClient } from '@/utils/supabase/server'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const status = user?.app_metadata?.status || 'pending'
  
  let title = 'Account Pending'
  let message = 'Your account is pending admin approval. Please wait until your account is approved.'
  
  if (status === 'rejected') {
    title = 'Account Rejected'
    message = 'Your account application has been rejected by the administrator.'
  } else if (status === 'suspended') {
    title = 'Account Suspended'
    message = 'Your account has been suspended by the administrator.'
  }

  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{message}</p>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup} style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
            Please contact the administrator to expedite the approval process.
          </div>

          <form action={logout}>
            <SubmitButton className={`${styles.button} ${styles.secondaryButton}`} pendingLabel="Signing out…">
              Sign Out
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  )
}
