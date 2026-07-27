import { createClient } from '@/utils/supabase/server'
import { listUsers, deleteUser, approveUser, suspendUser, changeUserPassword, getUsersSyncData } from './actions'
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
  let syncData: any[] = []
  try {
    users = await listUsers()
    syncData = await getUsersSyncData()
  } catch (error) {
    console.error('Failed to fetch admin data', error)
  }

  // Calculate some platform totals from the sync data
  let totalPlatformMRR = 0;
  syncData.forEach(sd => {
    if (sd.invoices) {
      const invoices = typeof sd.invoices === 'string' ? JSON.parse(sd.invoices) : sd.invoices;
      invoices.forEach((inv: any) => {
        if (inv.status === 'Paid') {
          totalPlatformMRR += inv.items?.reduce((sum: number, item: any) => sum + (item.rate * item.quantity), 0) || 0;
        }
      });
    }
  });

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
          <div className={styles.statLabel}>Platform Processed</div>
          <div className={styles.statValue}>${totalPlatformMRR.toLocaleString()}</div>
          <div className={styles.statTrend}>Based on synced data</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Syncs</div>
          <div className={styles.statValue}>{syncData.length}</div>
          <div className={styles.statTrend}>Reporting local data</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Manage Merchants</h2>
        </div>
        
        <div className={styles.formContainer}>
          <h3 className={styles.formTitle}>Admin Controls</h3>
          <p className={styles.sectionDesc}>Manage access and credentials for users across the platform.</p>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>Sync Activity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const ud = syncData.find(d => d.user_id === u.id);
                const invoices = ud?.invoices ? (typeof ud.invoices === 'string' ? JSON.parse(ud.invoices) : ud.invoices) : [];
                const clients = ud?.clients ? (typeof ud.clients === 'string' ? JSON.parse(ud.clients) : ud.clients) : [];
                return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {ud ? (
                      <div>
                        <div><b>Inv:</b> {invoices.length} | <b>Cli:</b> {clients.length}</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>Last sync: {new Date(ud.updated_at).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      'No sync data'
                    )}
                  </td>
                  <td>
                    {u.app_metadata?.role === 'admin' ? (
                      <span className={styles.badgeActive}>Admin</span>
                    ) : u.app_metadata?.status === 'suspended' ? (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: '#330000', color: '#ff3333' }}>Suspended</span>
                    ) : u.app_metadata?.status === 'approved' ? (
                      <span className={styles.badgeActive}>Approved</span>
                    ) : (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: '#332b00', color: '#ffcc00' }}>Pending</span>
                    )}
                  </td>
                  <td>
                    {u.app_metadata?.role !== 'admin' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {u.app_metadata?.status !== 'approved' && (
                          <form action={approveUser.bind(null, u.id)}>
                            <button type="submit" className={styles.actionBtnPrimary}>Approve</button>
                          </form>
                        )}
                        {u.app_metadata?.status === 'approved' && (
                          <form action={suspendUser.bind(null, u.id)}>
                            <button type="submit" className={styles.actionBtnDanger}>Suspend</button>
                          </form>
                        )}
                        
                        <form action={changeUserPassword} style={{ display: 'flex', gap: '8px' }}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="password" name="password" placeholder="New Password" required style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', color: 'white', width: '120px' }} />
                          <button type="submit" className={styles.secondaryButton} style={{ padding: '6px 12px', fontSize: '13px' }}>Reset</button>
                        </form>

                        <form action={deleteUser.bind(null, u.id)}>
                          <button type="submit" className={styles.actionBtnDanger}>Delete</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              )})}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No users found. Make sure your service role key is correct.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
