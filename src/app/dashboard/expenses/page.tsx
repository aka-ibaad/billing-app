'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { Plus, Trash, Receipt, Paperclip, UploadSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import CsvImportModal from '@/components/CsvImportModal';
import styles from './page.module.css';

const EXPENSE_IMPORT_FIELDS = [
  { key: 'payeeName', label: 'Payee', required: true },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'category', label: 'Category (Materials/Outsourced/Other)' },
  { key: 'status', label: 'Status (Paid/Unpaid)' },
  { key: 'date', label: 'Date (YYYY-MM-DD)' },
];

const emptyExpense = {
  payeeName: '',
  description: '',
  amount: 0,
  category: 'Other' as 'Materials' | 'Outsourced' | 'Other',
  status: 'Paid' as 'Paid' | 'Unpaid',
  date: new Date().toISOString().split('T')[0],
  receiptPath: undefined as string | undefined,
};

// Cheap keyword matching against the payee/description — no AI/API cost,
// just a first guess the user can always override. Deliberately simple
// (substring checks, not NLP) since the categories themselves are broad.
function suggestCategory(payeeName: string, description: string): 'Materials' | 'Outsourced' | 'Other' {
  const text = `${payeeName} ${description}`.toLowerCase();
  const outsourcedWords = ['freelance', 'contractor', 'outsourc', 'upwork', 'fiverr', 'agency', 'vendor', 'consultant'];
  const materialsWords = ['paper', 'glue', 'ink', 'fabric', 'wood', 'steel', 'material', 'supply', 'supplies', 'hardware', 'cloth', 'thread', 'paint'];
  if (outsourcedWords.some(w => text.includes(w))) return 'Outsourced';
  if (materialsWords.some(w => text.includes(w))) return 'Materials';
  return 'Other';
}

function ExpensesContent() {
  const { expenses, addExpense, updateExpense, deleteExpense, uploadReceipt, getReceiptUrl, isReadOnly } = useAppData();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [openingReceiptId, setOpeningReceiptId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  // Tracks whether the user has manually picked a category themselves —
  // once they have, auto-suggestion stops overwriting their choice.
  const [categoryTouched, setCategoryTouched] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
    }
  }, [searchParams]);

  const [newExpense, setNewExpense] = useState(emptyExpense);

  const isFormDirty = () => newExpense.payeeName.trim() !== '' || newExpense.description.trim() !== '' || newExpense.amount !== 0;

  const handlePayeeOrDescriptionChange = (patch: Partial<typeof newExpense>) => {
    const merged = { ...newExpense, ...patch };
    if (!categoryTouched) {
      merged.category = suggestCategory(merged.payeeName, merged.description);
    }
    setNewExpense(merged);
  };

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Receipt image is too large. Please choose a file under 5MB.');
      return;
    }
    setIsUploadingReceipt(true);
    try {
      const path = await uploadReceipt(file);
      setNewExpense(prev => ({ ...prev, receiptPath: path }));
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      alert("Could not upload that receipt (make sure supabase_migration_003_stock_time_receipts.sql has been run). You can still save the expense without it.");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleViewReceipt = async (id: string, path?: string) => {
    if (!path || openingReceiptId) return;
    setOpeningReceiptId(id);
    try {
      const url = await getReceiptUrl(path);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else alert('Could not open this receipt. Please try again.');
    } finally {
      setOpeningReceiptId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newExpense.payeeName) return;
    setIsSaving(true);
    try {
      await addExpense(newExpense);
      setNewExpense(emptyExpense);
      setCategoryTouched(false);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Could not save this expense. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCreate = () => {
    if (isCreating && isFormDirty() && !window.confirm('Discard this expense entry? Your entries will be lost.')) {
      return;
    }
    if (isCreating) {
      setNewExpense(emptyExpense);
      setCategoryTouched(false);
    }
    setIsCreating(!isCreating);
  };

  const handleDeleteExpense = async (id: string, payeeName: string) => {
    if (deletingId) return;
    if (window.confirm(`Delete this expense for "${payeeName}"? This cannot be undone.`)) {
      setDeletingId(id);
      try {
        await deleteExpense(id);
      } catch (error) {
        console.error('Failed to delete expense:', error);
        alert('Could not delete this expense. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Expenses & Outgoing</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Track outsourced work, material costs, and other business expenses.
          </p>
        </div>
        {!isReadOnly && (
          <div className={styles.controls}>
            <button className={styles.secondaryButton} onClick={() => setIsImportOpen(true)}>
              <UploadSimple size={16} style={{ marginRight: '6px' }} />
              Import CSV
            </button>
            <button className={styles.primaryButton} onClick={handleToggleCreate}>
              <Plus size={18} />
              {isCreating ? 'Cancel' : 'Log Expense'}
            </button>
          </div>
        )}
      </header>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Expenses"
        description="Upload a CSV exported from Excel or Google Sheets."
        fields={EXPENSE_IMPORT_FIELDS}
        onImportRow={async (r) => {
          const amount = Number(r.amount);
          if (!r.payeeName || Number.isNaN(amount)) throw new Error('Missing payee or invalid amount');
          const category = (['Materials', 'Outsourced', 'Other'] as const).includes(r.category as any)
            ? (r.category as 'Materials' | 'Outsourced' | 'Other')
            : suggestCategory(r.payeeName, r.description || '');
          const status = r.status === 'Unpaid' ? 'Unpaid' : 'Paid';
          const date = r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : new Date().toISOString().split('T')[0];
          await addExpense({ payeeName: r.payeeName, description: r.description || '', amount, category, status, date, receiptPath: undefined });
        }}
      />

      {isReadOnly && <ReadOnlyBanner label="expenses" />}

      <AnimatePresence>
        {isCreating && !isReadOnly && (
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
                onChange={e => handlePayeeOrDescriptionChange({ payeeName: e.target.value })}
                required
                autoFocus
                placeholder="Who did you pay?"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Amount (Rs)</label>
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
              <label>Category {!categoryTouched && (newExpense.payeeName || newExpense.description) && <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: '11px' }}>(suggested)</span>}</label>
              <select
                className={styles.input}
                value={newExpense.category}
                onChange={e => { setCategoryTouched(true); setNewExpense({...newExpense, category: e.target.value as any}); }}
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
                onChange={e => handlePayeeOrDescriptionChange({ description: e.target.value })}
                placeholder="What was this for?"
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '24px' }}>
            <label>Receipt Photo (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp, application/pdf"
                id="receipt-upload"
                onChange={handleReceiptSelect}
                style={{ display: 'none' }}
                disabled={isUploadingReceipt}
              />
              <label htmlFor="receipt-upload" className={styles.secondaryButton} style={{ cursor: isUploadingReceipt ? 'not-allowed' : 'pointer', opacity: isUploadingReceipt ? 0.6 : 1 }}>
                <Paperclip size={14} style={{ marginRight: '6px' }} />
                {isUploadingReceipt ? 'Uploading…' : newExpense.receiptPath ? 'Replace Receipt' : 'Attach Receipt'}
              </label>
              {newExpense.receiptPath && !isUploadingReceipt && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Attached ✓</span>
              )}
            </div>
          </div>

              <div className={styles.formActions} style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className={styles.primaryButton} disabled={isSaving || isUploadingReceipt} aria-busy={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Expense'}
                </button>
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
              <th>Receipt</th>
              <th className={styles.textRight}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  <div className={styles.emptyStateInner}>
                    <div className={styles.emptyStateIcon}><Receipt size={20} weight="duotone" /></div>
                    <div className={styles.emptyStateTitle}>No expenses logged yet</div>
                    <div className={styles.emptyStateDesc}>Track outsourced work and material costs as you spend.</div>
                  </div>
                </td>
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
                  <td>
                    {expense.receiptPath ? (
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(expense.id, expense.receiptPath)}
                        disabled={openingReceiptId === expense.id}
                        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '12px' }}
                      >
                        <Paperclip size={14} /> {openingReceiptId === expense.id ? 'Opening…' : 'View'}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                    )}
                  </td>
                  <td className={`${styles.textRight} mono-text`}>
                    Rs {expense.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={styles.textRight} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!isReadOnly && (
                      <>
                        <button className={styles.primaryButton} style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => {
                          updateExpense(expense.id, { status: expense.status === 'Paid' ? 'Unpaid' : 'Paid' })
                            .catch(err => console.error('Failed to toggle expense status:', err));
                        }}>Toggle</button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label={`Delete expense for ${expense.payeeName}`}
                          disabled={deletingId === expense.id}
                          aria-busy={deletingId === expense.id}
                          onClick={() => handleDeleteExpense(expense.id, expense.payeeName)}
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
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
