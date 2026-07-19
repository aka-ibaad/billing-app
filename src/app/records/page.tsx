'use client';

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Printer } from '@phosphor-icons/react';
import styles from './page.module.css';

export default function RecordsPage() {
  const { invoices, clients } = useAppData();
  const [dateRange, setDateRange] = useState('month');

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === '6months') {
      startDate.setMonth(now.getMonth() - 6);
    } else if (dateRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (dateRange === 'all') {
      startDate = new Date(0); // Beginning of time
    }

    return invoices
      .filter(inv => {
        const issue = new Date(inv.issueDate);
        return issue >= startDate && issue <= now;
      })
      .map(inv => {
        const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        let discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
        const afterDiscount = Math.max(0, subtotal - discountAmount);
        let totalTax = 0;
        inv.taxes?.forEach(tax => { totalTax += afterDiscount * (tax.rate / 100); });
        return { ...inv, calculatedTotal: afterDiscount + totalTax };
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, dateRange]);

  const summary = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    const totalPaid = filteredInvoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    const totalOutstanding = filteredInvoices.filter(inv => inv.status !== 'Paid').reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    return { totalBilled, totalPaid, totalOutstanding };
  }, [filteredInvoices]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Financial Records</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Aggregated report of billing activity.
          </p>
        </div>
        <div className={styles.controls}>
          <select 
            className={styles.input}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="6months">Past 6 Months</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
          <button className={styles.primaryButton} onClick={handlePrint}>
            <Printer size={18} />
            Print Report
          </button>
        </div>
      </header>

      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Billed</span>
          <span className={styles.cardValue}>₨ {summary.totalBilled.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total Paid</span>
          <span className={styles.cardValue}>₨ {summary.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Outstanding</span>
          <span className={styles.cardValue}>₨ {summary.totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Invoices</span>
          <span className={styles.cardValue}>{filteredInvoices.length}</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Status</th>
              <th className={styles.textRight}>Amount</th>
            </tr>
          </thead>
          <tbody className="mono-text">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No records found for this period.</td>
              </tr>
            ) : (
              filteredInvoices.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                return (
                  <tr key={inv.id} className={styles.tableRow}>
                    <td>{inv.issueDate}</td>
                    <td>{inv.number}</td>
                    <td className="sans-text">{client?.name || 'Unknown'}</td>
                    <td>{inv.status}</td>
                    <td className={styles.textRight}>₨ {inv.calculatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
