import { signup } from '@/app/login/actions'
import styles from '@/app/login/login.module.css'
import Link from 'next/link'

export default async function SignupPage({
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
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Sign up to request dashboard access</p>
        </div>

        <form className={styles.form}>
          {message && (
            <div className={message.includes('Check email') ? styles.message : styles.error}>
              {message}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="companyName">
              Company Name
            </label>
            <input
              className={styles.input}
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Corp"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="userName">
              Your Name
            </label>
            <input
              className={styles.input}
              id="userName"
              name="userName"
              type="text"
              placeholder="John Doe"
              required
            />
          </div>

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

          <button formAction={signup} className={styles.button}>
            Sign Up
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
