import { createClient } from '@/utils/supabase/server'
import { listUsers, deleteUser, approveUser, suspendUser, rejectUser, changeUserPassword, getUsersSyncData } from './actions'
import { ConfirmForm, SubmitButton } from './ConfirmForm'
import styles from './admin.module.css'
import { redirect } from 'next/navigation'
import { Buildings, Receipt, ArrowsClockwise, Clock, UsersThree } from './icons'

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
  let fetchError: string | null = null
  try {
    users = await listUsers()
    syncData = await getUsersSyncData()
  } catch (error) {
    console.error('Failed to fetch admin data', error)
    fetchError = error instanceof Error ? error.message : 'Unknown error'
  }

  const merchants = users.filter(u => u.app_metadata?.role !== 'admin')
  const pendingCount = merchants.filter(u => !u.app_metadata?.status || u.app_metadata.status === 'pending').length

  // Calculate some platform totals from the sync data
  let totalPlatformProcessed = 0
  syncData.forEach(sd => {
    if (sd.invoices) {
      const invoices = typeof sd.invoices === 'string' ? JSON.parse(sd.invoices) : sd.invoices
      invoices.forEach((inv: any) => {
        if (inv.status === 'Paid') {
          totalPlatformProcessed += inv.items?.reduce((sum: number, item: any) => sum + (item.rate * item.quantity), 0) || 0
        }
      })
    }
  })

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Overview</h1>
        <p className={styles.subtitle}>Welcome back. Here is your platform&apos;s status.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardIconWrap}><Buildings size={18} weight="bold" /></div>
          <div className={styles.statLabel}>Total Merchants</div>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statTrend}>Real-time</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardIconWrap}><Receipt size={18} weight="bold" /></div>
          <div className={styles.statLabel}>Platform Processed</div>
          <div className={styles.statValue}>Rs {totalPlatformProcessed.toLocaleString()}</div>
          <div className={styles.statTrend}>Based on synced data</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardIconWrap}><ArrowsClockwise size={18} weight="bold" /></div>
          <div className={styles.statLabel}>Active Syncs</div>
          <div className={styles.statValue}>{syncData.length}</div>
          <div className={styles.statTrend}>Reporting local data</div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statCardIconWrap} ${pendingCount > 0 ? styles.warn : ''}`}><Clock size={18} weight="bold" /></div>
          <div className={styles.statLabel}>Pending Approvals</div>
          <div className={styles.statValue}>{pendingCount}</div>
          <div className={`${styles.statTrend} ${pendingCount > 0 ? styles.attention : ''}`}>
            {pendingCount > 0 ? 'Needs review' : 'All caught up'}
          </div>
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
                <th>Company / Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Sync Activity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const ud = syncData.find(d => d.user_id === u.id)
                const invoices = ud?.invoices ? (typeof ud.invoices === 'string' ? JSON.parse(ud.invoices) : ud.invoices) : []
                const clients = ud?.clients ? (typeof ud.clients === 'string' ? JSON.parse(ud.clients) : ud.clients) : []
                const isAdmin = u.app_metadata?.role === 'admin'
                const status = u.app_metadata?.status || 'pending'

                return (
                  <tr key={u.id}>
                    <td>
                      <div className={styles.companyName}>{u.user_metadata?.company_name || 'N/A'}</div>
                      <div className={styles.companyOwner}>{u.user_metadata?.user_name || 'N/A'}</div>
                    </td>
                    <td>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className={styles.syncSummary}>
                      {ud ? (
                        <div>
                          <div><b>Inv:</b> {invoices.length} | <b>Cli:</b> {clients.length}</div>
                          <div className={styles.syncTimestamp}>Last sync: {new Date(ud.updated_at).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className={styles.noSyncLabel}>No sync data</span>
                      )}
                    </td>
                    <td>
                      {isAdmin ? (
                        <span className={styles.badgeAdmin}>Admin</span>
                      ) : status === 'suspended' ? (
                        <span className={styles.badgeSuspended}>Suspended</span>
                      ) : status === 'approved' ? (
                        <span className={styles.badgeActive}>Approved</span>
                      ) : status === 'rejected' ? (
                        <span className={styles.badgeSuspended}>Rejected</span>
                      ) : (
                        <span className={styles.badgePending}>Pending</span>
                      )}
                    </td>
                    <td>
                      {!isAdmin && (
                        <div className={styles.actionsCell}>
                          {status !== 'approved' && status !== 'rejected' && (
                            <form action={approveUser.bind(null, u.id)}>
                              <SubmitButton className={styles.actionBtnPrimary} pendingLabel="Approving…">Approve</SubmitButton>
                            </form>
                          )}
                          {status === 'pending' && (
                            <ConfirmForm
                              action={rejectUser.bind(null, u.id)}
                              confirmMessage={`Reject ${u.email}? They will not be able to access their account.`}
                            >
                              <SubmitButton className={styles.actionBtnDanger} pendingLabel="Rejecting…">Reject</SubmitButton>
                            </ConfirmForm>
                          )}
                          {status === 'approved' && (
                            <ConfirmForm
                              action={suspendUser.bind(null, u.id)}
                              confirmMessage={`Suspend ${u.email}? They will immediately lose access.`}
                            >
                              <SubmitButton className={styles.actionBtnDanger} pendingLabel="Suspending…">Suspend</SubmitButton>
                            </ConfirmForm>
                          )}
                          {status === 'suspended' && (
                            <form action={approveUser.bind(null, u.id)}>
                              <SubmitButton className={styles.actionBtn} pendingLabel="Restoring…">Reinstate</SubmitButton>
                            </form>
                          )}

                          <form action={changeUserPassword} className={styles.passwordForm}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input
                              type="password"
                              name="password"
                              placeholder="New password"
                              required
                              minLength={8}
                              className={styles.passwordInput}
                              aria-label={`New password for ${u.email}`}
                            />
                            <SubmitButton className={styles.secondaryButton} pendingLabel="Resetting…">Reset</SubmitButton>
                          </form>

                          <ConfirmForm
                            action={deleteUser.bind(null, u.id)}
                            confirmMessage={`Permanently delete ${u.email}? This cannot be undone.`}
                          >
                            <SubmitButton className={styles.actionBtnDanger} pendingLabel="Deleting…">Delete</SubmitButton>
                          </ConfirmForm>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <UsersThree size={40} weight="duotone" className={styles.emptyStateIcon} />
                      <div className={styles.emptyStateTitle}>No merchants yet</div>
                      <p className={styles.emptyStateHint}>
                        {fetchError
                          ? `Couldn't load users: ${fetchError}. Check that your service role key is set correctly.`
                          : 'Once someone signs up, they will show up here for approval.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
