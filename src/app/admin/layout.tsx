import React from 'react'
import { logout } from '@/app/login/actions'
import styles from './adminLayout.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.brand}>Admin Suite</h2>
        </div>
        
        <nav className={styles.nav}>
          <a href="/admin/dashboard" className={styles.navLinkActive}>Dashboard</a>
        </nav>
        
        <div className={styles.sidebarFooter}>
          <form action={logout}>
            <button type="submit" className={styles.logoutButton}>Sign Out</button>
          </form>
        </div>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
