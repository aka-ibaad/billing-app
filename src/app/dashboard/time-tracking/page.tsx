'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { Plus, Trash, Clock, CheckCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import styles from './page.module.css';

const emptyEntry = {
  clientId: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  hours: 0,
  minutes: 0,
  billable: true,
  rate: 0,
};

function fmtHours(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function TimeTrackingContent() {
  const { timeEntries, clients, addTimeEntry, updateTimeEntry, deleteTimeEntry, isReadOnly } = useAppData();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState(emptyEntry);

  useEffect(() => {
    if (searchParams.get('create') === 'true') setIsCreating(true);
  }, [searchParams]);

  const isFormDirty = () => newEntry.description.trim() !== '' || newEntry.hours !== 0 || newEntry.minutes !== 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const totalMinutes = Math.round(newEntry.hours * 60 + newEntry.minutes);
    if (totalMinutes <= 0) return;
    setIsSaving(true);
    try {
      await addTimeEntry({
        clientId: newEntry.clientId || undefined,
        description: newEntry.description,
        date: newEntry.date,
        minutes: totalMinutes,
        billable: newEntry.billable,
        rate: newEntry.rate,
        invoiced: false,
      });
      setNewEntry(emptyEntry);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to add time entry:', error);
      alert("Could not save this time entry. If this is the first one you've logged, make sure supabase_migration_003_stock_time_receipts.sql has been run in Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCreate = () => {
    if (isCreating && isFormDirty() && !window.confirm('Discard this time entry? Your entries will be lost.')) return;
    if (isCreating) setNewEntry(emptyEntry);
    setIsCreating(!isCreating);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (window.confirm('Delete this time entry? This cannot be undone.')) {
      setDeletingId(id);
      try {
        await deleteTimeEntry(id);
      } catch (error) {
        console.error('Failed to delete time entry:', error);
        alert('Could not delete this entry. Please try again.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleMarkInvoiced = async (id: string, invoiced: boolean) => {
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await updateTimeEntry(id, { invoiced: !invoiced });
    } catch (error) {
      console.error('Failed to update time entry:', error);
      alert('Could not update this entry. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const sortedEntries = useMemo(
    () => [...timeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [timeEntries]
  );

  const summary = useMemo(() => {
    const totalMinutes = timeEntries.reduce((s, t) => s + t.minutes, 0);
    const billableMinutes = timeEntries.filter(t => t.billable).reduce((s, t) => s + t.minutes, 0);
    const unbilledValue = timeEntries
      .filter(t => t.billable && !t.invoiced)
      .reduce((s, t) => s + (t.minutes / 60) * t.rate, 0);
    return { totalMinutes, billableMinutes, unbilledValue };
  }, [timeEntries]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Time Tracking</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Log hours against a client and bill them later — entries don't attach to invoices automatically, so mark them Invoiced once you've billed them.
          </p>
        </div>
        {!isReadOnly && (
          <div className={styles.controls}>
            <button className={styles.primaryButton} onClick={handleToggleCreate}>
              <Plus size={18} />
              {isCreating ? 'Cancel' : 'Log Time'}
            </button>
          </div>
        )}
      </header>

      {isReadOnly && <ReadOnlyBanner label="time entries" />}

      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Logged</span>
          <span className={styles.cardValue}>{fmtHours(summary.totalMinutes)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Billable</span>
          <span className={styles.cardValue}>{fmtHours(summary.billableMinutes)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Unbilled Value</span>
          <span className={styles.cardValue}>Rs {summary.unbilledValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

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
                    <label>Client (optional)</label>
                    <select
                      className={styles.input}
                      value={newEntry.clientId}
                      onChange={e => setNewEntry({ ...newEntry, clientId: e.target.value })}
                    >
                      <option value="">No client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Date</label>
                    <input
                      type="date"
                      className={`${styles.input} mono-text`}
                      value={newEntry.date}
                      onChange={e => setNewEntry({ ...newEntry, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Rate (Rs/hour)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${styles.input} mono-text`}
                      value={newEntry.rate}
                      onChange={e => setNewEntry({ ...newEntry, rate: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className={styles.formGrid} style={{ marginTop: '24px' }}>
                  <div className={styles.formGroup}>
                    <label>Hours</label>
                    <input
                      type="number"
                      min="0"
                      className={`${styles.input} mono-text`}
                      value={newEntry.hours}
                      onChange={e => setNewEntry({ ...newEntry, hours: Number(e.target.value) })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      className={`${styles.input} mono-text`}
                      value={newEntry.minutes}
                      onChange={e => setNewEntry({ ...newEntry, minutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className={styles.formGroup} style={{ justifyContent: 'center' }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newEntry.billable}
                        onChange={e => setNewEntry({ ...newEntry, billable: e.target.checked })}
                      />
                      <span>Billable</span>
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginTop: '24px' }}>
                  <label>Description</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={newEntry.description}
                    onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="What did you work on?"
                    autoFocus
                  />
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className={styles.primaryButton} disabled={isSaving} aria-busy={isSaving}>
                    {isSaving ? 'Saving…' : 'Save Entry'}
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
                <th>Client</th>
                <th>Description</th>
                <th className={styles.textRight}>Duration</th>
                <th className={styles.textRight}>Value</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <div className={styles.emptyStateInner}>
                      <div className={styles.emptyStateIcon}><Clock size={20} weight="duotone" /></div>
                      <div className={styles.emptyStateTitle}>No time logged yet</div>
                      <div className={styles.emptyStateDesc}>Track hours against a client to see billable value here.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedEntries.map(entry => {
                  const client = clients.find(c => c.id === entry.clientId);
                  const value = (entry.minutes / 60) * entry.rate;
                  return (
                    <tr key={entry.id} className={styles.tableRow}>
                      <td className="mono-text">{entry.date}</td>
                      <td className="sans-text">{client?.name || '—'}</td>
                      <td>{entry.description || '—'}</td>
                      <td className={`${styles.textRight} mono-text`}>{fmtHours(entry.minutes)}</td>
                      <td className={`${styles.textRight} mono-text`}>
                        {entry.billable ? `Rs ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td>
                        {entry.billable ? (
                          <button
                            type="button"
                            onClick={() => !isReadOnly && handleMarkInvoiced(entry.id, entry.invoiced)}
                            disabled={isReadOnly || updatingId === entry.id}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: isReadOnly ? 'default' : 'pointer' }}
                          >
                            <span className={`${styles.statusBadge} ${entry.invoiced ? '' : styles.statusBadgeMuted}`}>
                              {entry.invoiced ? <><CheckCircle size={11} weight="fill" style={{ marginRight: '4px', verticalAlign: '-1px' }} />Invoiced</> : 'Not invoiced'}
                            </span>
                          </button>
                        ) : (
                          <span className={`${styles.statusBadge} ${styles.statusBadgeMuted}`}>Non-billable</span>
                        )}
                      </td>
                      <td className={styles.textRight}>
                        {!isReadOnly && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            aria-label="Delete entry"
                            disabled={deletingId === entry.id}
                            aria-busy={deletingId === entry.id}
                            onClick={() => handleDelete(entry.id)}
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
      </motion.div>
    </div>
  );
}

export default function TimeTrackingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <TimeTrackingContent />
    </Suspense>
  );
}
