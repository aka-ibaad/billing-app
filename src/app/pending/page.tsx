import { logout } from '@/app/login/actions'
import styles from '@/app/login/login.module.css'

export default function PendingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Account Pending</h1>
          <p className={styles.subtitle}>Your account is currently waiting for admin approval.</p>
        </div>

        <div className={styles.form}>
          <div className={styles.inputGroup} style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
            Please contact the administrator to expedite the approval process. You will be able to access the dashboard once approved.
          </div>

          <form action={logout}>
            <button type="submit" className={`${styles.button} ${styles.secondaryButton}`}>
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
