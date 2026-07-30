'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData, Client } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash, Users, X, EnvelopeSimple, Phone, MapPin, CalendarBlank, UploadSimple } from '@phosphor-icons/react';
import { TopClientsChart } from '@/components/dashboard/DetailedCharts';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import CsvImportModal from '@/components/CsvImportModal';
import styles from './page.module.css';

const CLIENT_IMPORT_FIELDS = [
  { key: 'name', label: 'Company Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
];

function ClientsContent() {
  const { clients, invoices, addClient, deleteClient, isReadOnly } = useAppData();
  const searchParams = useSearchParams();
  const [isAdding, setIsAdding] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsAdding(true);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const calculateInvoiceTotal = (inv: (typeof invoices)[number]) => {
    const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    let totalTax = 0;
    inv.taxes?.forEach(tax => { totalTax += afterDiscount * (tax.rate / 100); });
    return afterDiscount + totalTax;
  };

  const isFormDirty = () => Object.values(newClient).some(v => v.trim() !== '');

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guards against a second submit landing before the request finishes
    // (e.g. a fast double-click) — addClient() now makes a real Supabase
    // round trip, so this matters more than it used to.
    if (isSaving) return;
    if (!newClient.name || !newClient.email) {
      setFormError('Company name and email are required.');
      return;
    }

    setIsSaving(true);
    try {
      await addClient(newClient);
      setNewClient({ name: '', email: '', phone: '', address: '' });
      setFormError('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add client:', error);
      setFormError('Could not save this client. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isFormDirty() && !window.confirm('Discard this new client? Your entries will be lost.')) {
      return;
    }
    setNewClient({ name: '', email: '', phone: '', address: '' });
    setFormError('');
    setIsAdding(false);
  };

  const handleDeleteClient = async (id: string, name: string, invoiceCount: number) => {
    if (deletingId) return;
    const warning = invoiceCount > 0
      ? `Delete ${name}? This client has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} on record. The client will be removed, but their invoices will remain.`
      : `Delete ${name}? This cannot be undone.`;
    if (window.confirm(warning)) {
      setDeletingId(id);
      try {
        await deleteClient(id);
      } catch (error) {
        console.error('Failed to delete client:', error);
        alert('Could not delete this client. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Clients</h1>
        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={styles.primaryButton}
              style={{ background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              onClick={() => setIsImportOpen(true)}
            >
              <UploadSimple size={16} style={{ marginRight: '6px' }} />
              Import CSV
            </button>
            <button
              className={styles.primaryButton}
              onClick={() => setIsAdding(true)}
            >
              Add Client
            </button>
          </div>
        )}
      </header>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Clients"
        description="Upload a CSV exported from Excel or Google Sheets."
        fields={CLIENT_IMPORT_FIELDS}
        onImportRow={async (r) => {
          if (!r.name || !r.email) throw new Error('Missing company name or email');
          await addClient({ name: r.name, email: r.email, phone: r.phone || '', address: r.address || '' });
        }}
      />

      {isReadOnly && <ReadOnlyBanner label="clients" />}

      <AnimatePresence>
        {isAdding && !isReadOnly && (
          <motion.div 
            className={styles.addFormContainer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.addFormCard}>
              <form onSubmit={handleAddClient} className={styles.addForm}>
                <div className={styles.formGroup}>
                <label>Company Name</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={newClient.name} 
                  onChange={e => setNewClient({...newClient, name: e.target.value})} 
                  placeholder="Acme Corp"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Contact</label>
                <input 
                  type="email" 
                  className={styles.input}
                  value={newClient.email} 
                  onChange={e => setNewClient({...newClient, email: e.target.value})} 
                  placeholder="billing@acme.corp"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={newClient.phone || ''} 
                  onChange={e => setNewClient({...newClient, phone: e.target.value})} 
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Billing Address</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={newClient.address} 
                  onChange={e => setNewClient({...newClient, address: e.target.value})} 
                  placeholder="123 Industrial Way"
                />
              </div>
              {formError && (
                <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '-4px' }}>{formError}</p>
              )}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={handleCancel} disabled={isSaving}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={isSaving} aria-busy={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Client'}
                </button>
              </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {clients.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <TopClientsChart invoices={invoices} expenses={[]} clients={clients} products={[]} filter="30D" compact />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <input
          type="text"
          placeholder="Search clients..."
          className={styles.input}
          style={{ width: '300px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <select 
          className={styles.input} 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="recent">Most Recent</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>

      <motion.div 
        className={styles.tableWrapper}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.tableCard}>
          <div className={styles.tableCardInner}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Email</th>
                  <th>Added</th>
                  <th className={styles.textRight}>Total Invoices</th>
                  <th className={styles.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      <div className={styles.emptyStateInner}>
                        <div className={styles.emptyStateIcon}><Users size={20} weight="duotone" /></div>
                        <div className={styles.emptyStateTitle}>No clients found</div>
                        <div className={styles.emptyStateDesc}>Add a client to start billing them.</div>
                      </div>
                    </td>
                  </tr>
            ) : (
              filteredClients.map(client => {
                const clientInvoicesCount = invoices.filter(inv => inv.clientId === client.id).length;
                return (
                  <tr
                    key={client.id}
                    className={`${styles.tableRow} ${styles.clickableRow}`}
                    onClick={() => setViewingClient(client)}
                  >
                    <td className="sans-text" style={{ fontWeight: 500 }}>{client.name}</td>
                    <td>{client.email}</td>
                    <td className="mono-text">{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td className={`${styles.textRight} mono-text`}>{clientInvoicesCount}</td>
                    <td className={styles.textRight}>
                      {!isReadOnly && (
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label={`Delete ${client.name}`}
                          disabled={deletingId === client.id}
                          aria-busy={deletingId === client.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id, client.name, clientInvoicesCount);
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {viewingClient && (
          <motion.div
            className={styles.detailBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setViewingClient(null)}
          >
            <motion.div
              className={styles.detailModal}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderInfo}>
                  <div className={styles.detailAvatar}>{viewingClient.name.substring(0, 2).toUpperCase()}</div>
                  <div>
                    <h2 className={`${styles.detailName} fontHeading`}>{viewingClient.name}</h2>
                    <span className={styles.detailSubtitle}>Client since {new Date(viewingClient.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.detailCloseBtn}
                  aria-label="Close client details"
                  onClick={() => setViewingClient(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.detailContactGrid}>
                <div className={styles.detailContactItem}>
                  <EnvelopeSimple size={16} className={styles.detailContactIcon} />
                  <span>{viewingClient.email}</span>
                </div>
                {viewingClient.phone && (
                  <div className={styles.detailContactItem}>
                    <Phone size={16} className={styles.detailContactIcon} />
                    <span className="mono-text">{viewingClient.phone}</span>
                  </div>
                )}
                {viewingClient.address && (
                  <div className={styles.detailContactItem}>
                    <MapPin size={16} className={styles.detailContactIcon} />
                    <span>{viewingClient.address}</span>
                  </div>
                )}
                <div className={styles.detailContactItem}>
                  <CalendarBlank size={16} className={styles.detailContactIcon} />
                  <span className="mono-text">Added {new Date(viewingClient.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className={styles.detailDivider} />

              <div className={styles.detailInvoicesHeader}>
                <span>Invoices</span>
                <span className="mono-text">
                  {invoices.filter(inv => inv.clientId === viewingClient.id).length}
                </span>
              </div>

              {(() => {
                const clientInvoices = invoices
                  .filter(inv => inv.clientId === viewingClient.id)
                  .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

                if (clientInvoices.length === 0) {
                  return <p className={styles.detailEmptyInvoices}>No invoices for this client yet.</p>;
                }

                return (
                  <div className={styles.detailInvoiceList}>
                    {clientInvoices.map(inv => (
                      <div key={inv.id} className={styles.detailInvoiceRow}>
                        <div className={styles.detailInvoiceInfo}>
                          <span className="mono-text" style={{ fontWeight: 500 }}>#{inv.number}</span>
                          <span className={styles.detailInvoiceDate}>{new Date(inv.issueDate).toLocaleDateString()}</span>
                        </div>
                        <span className={`${styles.detailStatusBadge} ${styles[`status${inv.status}`]}`}>{inv.status}</span>
                        <span className={`${styles.textRight} mono-text`} style={{ fontWeight: 600 }}>
                          Rs {calculateInvoiceTotal(inv).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ClientsContent />
    </Suspense>
  );
}
