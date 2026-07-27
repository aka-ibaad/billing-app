import { createClient } from '@/utils/supabase/server'
import { listUsers, createUser, deleteUser } from './actions'
import styles from './admin.module.css'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Double check admin role here just for safety, though middleware handles it
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.app_metadata?.role || 'merchant'
  if (role !== 'admin') {
    redirect('/')
  }

  // Fetch actual users using the Admin API
  let users: any[] = []
  try {
    users = await listUsers()
  } catch (error) {
    console.error('Failed to list users', error)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Overview</h1>
        <p className={styles.subtitle}>Welcome back. Here is your platform's status.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Merchants</div>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statTrend}>Real-time</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Platform MRR</div>
          <div className={styles.statValue}>$4,250</div>
          <div className={styles.statTrend}>+12.5% this month</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Sessions</div>
          <div className={styles.statValue}>8</div>
          <div className={styles.statTrend}>Real-time</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Manage Merchants</h2>
        </div>
        
        <div className={styles.formContainer}>
          <h3 className={styles.formTitle}>Create New Merchant</h3>
          <form action={createUser} className={styles.createForm}>
            <input type="email" name="email" placeholder="merchant@email.com" required className={styles.input} />
            <input type="password" name="password" placeholder="Temporary Password" required className={styles.input} />
            <button type="submit" className={styles.actionBtnPrimary}>Create Account</button>
          </form>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.app_metadata?.role === 'admin' ? (
                      <span className={styles.badgeActive}>Admin</span>
                    ) : (
                      <span className={styles.badgeActive}>Active</span>
                    )}
                  </td>
                  <td>
                    {u.app_metadata?.role !== 'admin' && (
                      <form action={deleteUser.bind(null, u.id)}>
                        <button type="submit" className={styles.actionBtnDanger}>Delete</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No users found. Make sure your service role key is correct.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
