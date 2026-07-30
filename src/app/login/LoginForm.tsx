'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from './actions';
import PasswordInput from '@/components/PasswordInput';
import styles from './login.module.css';

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <form action={formAction} className={styles.form}>
      {state?.error && (
        <div className={styles.error} role="alert">
          {state.error}
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
          autoComplete="email"
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <PasswordInput
          className={styles.input}
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className={styles.button} disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Signing in…' : 'Sign In'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
          Sign Up
        </Link>
      </div>
    </form>
  );
}
