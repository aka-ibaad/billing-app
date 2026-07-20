'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash } from '@phosphor-icons/react';
import { TopClientsChart } from '@/components/dashboard/DetailedCharts';
import styles from './page.module.css';

function ClientsContent() {
  const { clients, invoices, addClient, deleteClient } = useAppData();
  const searchParams = useSearchParams();
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsAdding(true);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const isFormDirty = () => Object.values(newClient).some(v => v.trim() !== '');

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) {
      setFormError('Company name and email are required.');
      return;
    }

    addClient(newClient);
    setNewClient({ name: '', email: '', phone: '', address: '' });
    setFormError('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    if (isFormDirty() && !window.confirm('Discard this new client? Your entries will be lost.')) {
      return;
    }
    setNewClient({ name: '', email: '', phone: '', address: '' });
    setFormError('');
    setIsAdding(false);
  };

  const handleDeleteClient = (id: string, name: string, invoiceCount: number) => {
    const warning = invoiceCount > 0
      ? `Delete ${name}? This client has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} on record. The client will be removed, but their invoices will remain.`
      : `Delete ${name}? This cannot be undone.`;
    if (window.confirm(warning)) {
      deleteClient(id);
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
        <button 
          className={styles.primaryButton}
          onClick={() => setIsAdding(true)}
        >
          Add Client
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
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
                <button type="button" className={styles.cancelButton} onClick={handleCancel}>Cancel</button>
                <button type="submit" className={styles.submitButton}>Save Client</button>
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
                    <td colSpan={5} className={styles.emptyState}>No clients found.</td>
                  </tr>
            ) : (
              filteredClients.map(client => {
                const clientInvoicesCount = invoices.filter(inv => inv.clientId === client.id).length;
                return (
                  <tr key={client.id} className={styles.tableRow}>
                    <td className="sans-text" style={{ fontWeight: 500 }}>{client.name}</td>
                    <td>{client.email}</td>
                    <td className="mono-text">{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td className={`${styles.textRight} mono-text`}>{clientInvoicesCount}</td>
                    <td className={styles.textRight}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Delete ${client.name}`}
                        onClick={() => handleDeleteClient(client.id, client.name, clientInvoicesCount)}
                      >
                        <Trash size={16} />
                      </button>
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
