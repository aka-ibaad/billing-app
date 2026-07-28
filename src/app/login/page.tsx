import styles from './login.module.css'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
