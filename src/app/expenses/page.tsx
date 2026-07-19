'use client';

import React, { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Plus } from '@phosphor-icons/react';
import styles from './page.module.css';

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense } = useAppData();
  const [isCreating, setIsCreating] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    payeeName: '',
    description: '',
    amount: 0,
    category: 'Other' as 'Materials' | 'Outsourced' | 'Other',
    status: 'Paid' as 'Paid' | 'Unpaid',
    date: new Date().toISOString().split('T')[0],
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.payeeName) return;
    addExpense(newExpense);
    setNewExpense({
      payeeName: '',
      description: '',
      amount: 0,
      category: 'Other',
      status: 'Paid',
      date: new Date().toISOString().split('T')[0],
    });
    setIsCreating(false);
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    updateExpense(id, { status: currentStatus === 'Paid' ? 'Unpaid' : 'Paid' });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Expenses & Outgoing</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Track outsourced work, material costs, and other business expenses.
          </p>
        </div>
        <div className={styles.controls}>
          <button className={styles.primaryButton} onClick={() => setIsCreating(!isCreating)}>
            <Plus size={18} />
            {isCreating ? 'Cancel' : 'Log Expense'}
          </button>
        </div>
      </header>

      {isCreating && (
        <form onSubmit={handleCreate} className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Payee Name</label>
              <input 
                type="text" 
                className={styles.input}
                value={newExpense.payeeName}
                onChange={e => setNewExpense({...newExpense, payeeName: e.target.value})}
                required
                autoFocus
                placeholder="Who did you pay?"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Amount (₨)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                className={`${styles.input} mono-text`}
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Date</label>
              <input 
                type="date" 
                className={`${styles.input} mono-text`}
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className={styles.formGrid} style={{ marginTop: '24px' }}>
            <div className={styles.formGroup}>
              <label>Category</label>
              <select 
                className={styles.input}
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}
              >
                <option value="Materials">Materials (e.g. Papers, Glue)</option>
                <option value="Outsourced">Outsourced Work</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Payment Status</label>
              <select 
                className={styles.input}
                value={newExpense.status}
                onChange={e => setNewExpense({...newExpense, status: e.target.value as any})}
              >
                <option value="Paid">Paid in Full</option>
                <option value="Unpaid">Unpaid / Remaining</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Description / Notes</label>
              <input 
                type="text" 
                className={styles.input}
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                placeholder="What was this for?"
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className={styles.primaryButton}>Save Expense</button>
          </div>
        </form>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th>Description</th>
              <th>Category</th>
              <th>Status</th>
              <th className={styles.textRight}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>No expenses logged yet.</td>
              </tr>
            ) : (
              [...expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                <tr key={exp.id} className={styles.tableRow}>
                  <td className="mono-text">{exp.date}</td>
                  <td className="sans-text" style={{ fontWeight: 500 }}>{exp.payeeName}</td>
                  <td>{exp.description}</td>
                  <td>{exp.category}</td>
                  <td>
                    <span 
                      className={`${styles.statusBadge} ${exp.status === 'Paid' ? styles.statusPaid : styles.statusUnpaid}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleStatus(exp.id, exp.status)}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td className={`${styles.textRight} mono-text`}>
                    ₨ {exp.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
