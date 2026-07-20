'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { Plus, Trash } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

const emptyExpense = {
  payeeName: '',
  description: '',
  amount: 0,
  category: 'Other' as 'Materials' | 'Outsourced' | 'Other',
  status: 'Paid' as 'Paid' | 'Unpaid',
  date: new Date().toISOString().split('T')[0],
};

function ExpensesContent() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useAppData();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
    }
  }, [searchParams]);

  const [newExpense, setNewExpense] = useState(emptyExpense);

  const isFormDirty = () => newExpense.payeeName.trim() !== '' || newExpense.description.trim() !== '' || newExpense.amount !== 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.payeeName) return;
    addExpense(newExpense);
    setNewExpense(emptyExpense);
    setIsCreating(false);
  };

  const handleToggleCreate = () => {
    if (isCreating && isFormDirty() && !window.confirm('Discard this expense entry? Your entries will be lost.')) {
      return;
    }
    if (isCreating) setNewExpense(emptyExpense);
    setIsCreating(!isCreating);
  };

  const handleDeleteExpense = (id: string, payeeName: string) => {
    if (window.confirm(`Delete this expense for "${payeeName}"? This cannot be undone.`)) {
      deleteExpense(id);
    }
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
          <button className={styles.primaryButton} onClick={handleToggleCreate}>
            <Plus size={18} />
            {isCreating ? 'Cancel' : 'Log Expense'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            className={styles.addFormContainer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.formCardOuter}>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={styles.tableOuter}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>No expenses logged yet.</td>
              </tr>
            ) : (
              [...expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                <tr key={expense.id} className={styles.tableRow}>
                  <td className="mono-text">{expense.date}</td>
                  <td className="sans-text" style={{ fontWeight: 500 }}>{expense.payeeName}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${expense.status === 'Paid' ? styles.statusPaid : styles.statusUnpaid}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className={`${styles.textRight} mono-text`}>
                    ₨ {expense.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={styles.textRight} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className={styles.primaryButton} style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => {
                      updateExpense(expense.id, { status: expense.status === 'Paid' ? 'Unpaid' : 'Paid' });
                    }}>Toggle</button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Delete expense for ${expense.payeeName}`}
                      onClick={() => handleDeleteExpense(expense.id, expense.payeeName)}
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </motion.div>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ExpensesContent />
    </Suspense>
  );
}
