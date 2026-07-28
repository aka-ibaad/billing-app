import styles from '@/app/login/login.module.css'
import SignupForm from './SignupForm'

export default function SignupPage() {
  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Sign up to request dashboard access</p>
        </div>

        <SignupForm />
      </div>
    </div>
  )
}
