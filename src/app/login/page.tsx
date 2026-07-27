import { login, signup } from './actions'
import styles from './login.module.css'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const message = typeof params?.message === 'string' ? params.message : null

  return (
    <div className={styles.container}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <form className={styles.form}>
          {message && (
            <div className={message.includes('Check email') ? styles.message : styles.error}>
              {message}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button formAction={login} className={styles.button}>
            Sign In
          </button>
          
          <button formAction={signup} className={`${styles.button} ${styles.secondaryButton}`}>
            Create Account
          </button>
        </form>
      </div>
    </div>
  )
}
