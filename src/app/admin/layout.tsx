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
