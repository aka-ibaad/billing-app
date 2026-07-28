'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signup } from '@/app/login/actions';
import styles from '@/app/login/login.module.css';
import signupStyles from './signup.module.css';

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && (
        <div className={styles.error} role="alert">
          {state.error}
        </div>
      )}

      <div className={signupStyles.formRow}>
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
            autoComplete="organization"
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
            autoComplete="name"
            required
          />
        </div>
      </div>

      <div className={signupStyles.formRow}>
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
            autoComplete="email"
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>

      <button type="submit" className={styles.button} disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Creating account…' : 'Sign Up'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    </form>
  );
}
