'use client';

import React, { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

export default function ClientsPage() {
  const { clients, invoices, addClient } = useAppData();
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) return;
    
    addClient(newClient);
    setNewClient({ name: '', email: '', phone: '', address: '' });
    setIsAdding(false);
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
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton}>Save Client</button>
              </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyState}>No clients found.</td>
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
