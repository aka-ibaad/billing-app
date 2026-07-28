'use client'

// Phosphor's icon components create a React Context at module load time,
// which the RSC (Server Component) build of React doesn't support — that's
// what broke the Vercel build here. Marking this file 'use client' puts it
// (and the icon imports below) on the client bundle, same as every other
// place in this app that renders these icons (e.g. Navigation.tsx). It's
// safe to do here: this layout has no server-only logic of its own, and
// `children` (the async /admin/dashboard page) is still rendered as a
// Server Component — Next composes it in from the parent tree rather than
// this file importing it, so it isn't pulled into the client bundle.
import React from 'react'
import { logout } from '@/app/login/actions'
import styles from './adminLayout.module.css'
import { SquaresFour, SignOut, ShieldCheck } from '@phosphor-icons/react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandMark}>
            <ShieldCheck size={18} weight="fill" />
          </div>
          <h2 className={styles.brand}>Admin Suite</h2>
        </div>

        <nav className={styles.nav}>
          <a href="/admin/dashboard" className={styles.navLinkActive}>
            <SquaresFour size={18} weight="fill" />
            Dashboard
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <form action={logout}>
            <button type="submit" className={styles.logoutButton}>
              <SignOut size={16} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
