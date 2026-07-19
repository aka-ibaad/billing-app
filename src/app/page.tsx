'use client';

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { Wallet, WarningCircle, CheckCircle, ArrowUpRight, ArrowDownRight, X, Clock } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type FilterType = '7D' | '30D' | '12M';

export default function Dashboard() {
  const { invoices, expenses } = useAppData();
  const [filter, setFilter] = useState<FilterType>('30D');
  const [modalData, setModalData] = useState<{ title: string; type: 'revenue' | 'expense' | null } | null>(null);

  // --- Metrics Calculation ---
  const validInvoices = invoices.filter(i => i.documentType !== 'quotation');
  
  const totalRevenue = validInvoices
    .filter(i => i.status === 'Paid' || i.paymentStatus === 'advance_full' || (i.paymentStatus === 'advance_partial' && i.advanceAmountPaid))
    .reduce((sum, inv) => {
      let paid = 0;
      const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
      let tTax = 0;
      inv.taxes?.forEach(tax => tTax += subtotal * (tax.rate/100));
      const total = subtotal + tTax - (inv.discount?.type === 'fixed' ? inv.discount.value : subtotal * ((inv.discount?.value||0)/100));
      
      if (inv.status === 'Paid' || inv.paymentStatus === 'advance_full') {
        paid = total;
      } else if (inv.paymentStatus === 'advance_partial' && inv.advanceAmountPaid) {
        paid = inv.advanceAmountPaid;
      }
      return sum + paid;
    }, 0);

  const totalExpenses = expenses
    .filter(e => e.status === 'Paid')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const totalOutstanding = validInvoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, inv) => {
      const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
      let tTax = 0;
      inv.taxes?.forEach(tax => tTax += subtotal * (tax.rate/100));
      const total = subtotal + tTax - (inv.discount?.type === 'fixed' ? inv.discount.value : subtotal * ((inv.discount?.value||0)/100));
      if (inv.paymentStatus === 'advance_partial' && inv.advanceAmountPaid) {
        return sum + Math.max(0, total - inv.advanceAmountPaid);
      }
      return sum + total;
    }, 0);

  const overdue = validInvoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, inv) => {
      const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
      let tTax = 0;
      inv.taxes?.forEach(tax => tTax += subtotal * (tax.rate/100));
      const total = subtotal + tTax - (inv.discount?.type === 'fixed' ? inv.discount.value : subtotal * ((inv.discount?.value||0)/100));
      if (inv.paymentStatus === 'advance_partial' && inv.advanceAmountPaid) {
        return sum + Math.max(0, total - inv.advanceAmountPaid);
      }
      return sum + total;
    }, 0);

  const statusCounts = {
    paid: validInvoices.filter(i => i.status === 'Paid').length,
    pending: validInvoices.filter(i => i.status === 'Pending').length,
    overdue: validInvoices.filter(i => i.status === 'Overdue').length,
    draft: validInvoices.filter(i => i.status === 'Draft').length,
  };

  const pieData = [
    { name: 'Paid', value: statusCounts.paid, color: '#117a11' },
    { name: 'Pending', value: statusCounts.pending, color: '#f5a623' },
    { name: 'Overdue', value: statusCounts.overdue, color: '#d0021b' },
    { name: 'Draft', value: statusCounts.draft, color: '#888888' },
  ].filter(d => d.value > 0);

  const recentInvoices = [...validInvoices].reverse().slice(0, 5);

  // --- Chart Data Processing ---
  const chartData = useMemo(() => {
    const now = new Date();
    const dataMap = new Map<string, { label: string; Revenue: number; Expenses: number }>();
    
    if (filter === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dataMap.set(d.toISOString().split('T')[0], { label: d.toLocaleDateString(undefined, { weekday: 'short' }), Revenue: 0, Expenses: 0 });
      }
    } else if (filter === '30D') {
      for (let i = 4; i >= 0; i--) {
        dataMap.set(`w${i}`, { label: `Week ${5 - i}`, Revenue: 0, Expenses: 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dataMap.set(`${d.getFullYear()}-${d.getMonth()}`, { label: d.toLocaleDateString(undefined, { month: 'short' }), Revenue: 0, Expenses: 0 });
      }
    }

    // Populate Revenue
    validInvoices.forEach(inv => {
      const issueDate = new Date(inv.issueDate);
      if (filter === '7D') {
        const key = issueDate.toISOString().split('T')[0];
        if (dataMap.has(key)) {
          const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
          dataMap.get(key)!.Revenue += subtotal;
        }
      } else if (filter === '30D') {
        const diffTime = Math.abs(now.getTime() - issueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const week = Math.floor(diffDays / 7);
          const key = `w${Math.min(week, 4)}`;
          if (dataMap.has(key)) {
            const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
            dataMap.get(key)!.Revenue += subtotal;
          }
        }
      } else {
        const key = `${issueDate.getFullYear()}-${issueDate.getMonth()}`;
        if (dataMap.has(key)) {
          const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
          dataMap.get(key)!.Revenue += subtotal;
        }
      }
    });

    // Populate Expenses
    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (filter === '7D') {
        const key = expDate.toISOString().split('T')[0];
        if (dataMap.has(key)) dataMap.get(key)!.Expenses += exp.amount;
      } else if (filter === '30D') {
        const diffTime = Math.abs(now.getTime() - expDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const week = Math.floor(diffDays / 7);
          const key = `w${Math.min(week, 4)}`;
          if (dataMap.has(key)) dataMap.get(key)!.Expenses += exp.amount;
        }
      } else {
        const key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
        if (dataMap.has(key)) dataMap.get(key)!.Expenses += exp.amount;
      }
    });

    if (filter === '30D') return Array.from(dataMap.values()).reverse();
    return Array.from(dataMap.values());
  }, [validInvoices, expenses, filter]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.filterGroup}>
          <button className={`${styles.filterBtn} ${filter === '7D' ? styles.active : ''}`} onClick={() => setFilter('7D')}>7D</button>
          <button className={`${styles.filterBtn} ${filter === '30D' ? styles.active : ''}`} onClick={() => setFilter('30D')}>30D</button>
          <button className={`${styles.filterBtn} ${filter === '12M' ? styles.active : ''}`} onClick={() => setFilter('12M')}>12M</button>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className={styles.metricsGrid}>
        <motion.div 
          className={styles.metricCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => setModalData({ title: 'Revenue Breakdown', type: 'revenue' })}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Revenue</span>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#e6f6e6', color: '#117a11' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className={styles.metricValue}>₨ {totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className={styles.metricSub}>Click for detailed breakdown</div>
        </motion.div>

        <motion.div 
          className={styles.metricCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={() => setModalData({ title: 'Expense Breakdown', type: 'expense' })}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Expenses</span>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#fee', color: '#c00' }}>
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className={styles.metricValue}>₨ {totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className={styles.metricSub}>Click for detailed breakdown</div>
        </motion.div>

        <motion.div 
          className={styles.metricCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Net Profit</span>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#f0f4ff', color: '#0055ff' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div className={styles.metricValue}>₨ {netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className={styles.metricSub}>Revenue minus Expenses</div>
        </motion.div>

        <motion.div 
          className={styles.metricCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Outstanding</span>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#fff3e0', color: '#ff9800' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className={styles.metricValue}>₨ {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className={styles.metricSub}>Pending payments</div>
        </motion.div>

        <motion.div 
          className={styles.metricCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Overdue</span>
            <div className={styles.iconWrapper} style={{ backgroundColor: '#ffebee', color: '#f44336' }}>
              <WarningCircle size={20} />
            </div>
          </div>
          <div className={styles.metricValue}>₨ {overdue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div className={styles.metricSub}>Past due date</div>
        </motion.div>
      </div>

      {/* Main Chart Section */}
      <motion.div 
        className={styles.chartSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{ marginTop: '32px', background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>Revenue vs Expenses</h2>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dx={-10} tickFormatter={(val) => `₨${val}`} />
              <RechartsTooltip 
                cursor={{fill: '#f5f5f5'}} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: any) => `₨ ${Number(value).toLocaleString()}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Revenue" fill="#117a11" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="Expenses" fill="#c00" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Secondary Charts & Lists Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <motion.div 
          className={styles.chartSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)' }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>Status Breakdown</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => `${value} Invoices`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          className={styles.chartSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', overflowX: 'auto' }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '24px' }}>Recent Invoices</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Invoice #</th>
                <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '16px 0' }} className="mono-text">{inv.number}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      backgroundColor: inv.status === 'Paid' ? '#e6f6e6' : inv.status === 'Overdue' ? '#fee' : '#fff3e0',
                      color: inv.status === 'Paid' ? '#117a11' : inv.status === 'Overdue' ? '#c00' : '#ff9800'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {modalData && (
          <>
            <motion.div 
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalData(null)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }}
            />
            <motion.div 
              className={styles.modalContent}
              initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.95 }}
              animate={{ opacity: 1, y: '-50%', x: '-50%', scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'fixed', top: '50%', left: '50%', background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '800px', zIndex: 1000, maxHeight: '80vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 300 }}>{modalData.title}</h2>
                <button onClick={() => setModalData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>

              {modalData.type === 'revenue' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Invoice #</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Client</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Date</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validInvoices.filter(i => i.status === 'Paid' || i.paymentStatus === 'advance_full' || (i.paymentStatus === 'advance_partial' && i.advanceAmountPaid)).map(inv => {
                      let paid = 0;
                      const subtotal = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
                      let tTax = 0;
                      inv.taxes?.forEach(tax => tTax += subtotal * (tax.rate/100));
                      const total = subtotal + tTax - (inv.discount?.type === 'fixed' ? inv.discount.value : subtotal * ((inv.discount?.value||0)/100));
                      if (inv.status === 'Paid' || inv.paymentStatus === 'advance_full') paid = total;
                      else if (inv.paymentStatus === 'advance_partial' && inv.advanceAmountPaid) paid = inv.advanceAmountPaid;
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '16px 0' }} className="mono-text">{inv.number}</td>
                          <td style={{ padding: '16px 0' }}>{inv.clientId}</td>
                          <td style={{ padding: '16px 0' }}>{inv.issueDate}</td>
                          <td style={{ padding: '16px 0', textAlign: 'right' }} className="mono-text">₨ {paid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {modalData.type === 'expense' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Date</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Payee</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666' }}>Category</th>
                      <th style={{ padding: '12px 0', fontSize: '12px', color: '#666', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(e => e.status === 'Paid').map(exp => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '16px 0' }}>{exp.date}</td>
                        <td style={{ padding: '16px 0', fontWeight: 500 }}>{exp.payeeName}</td>
                        <td style={{ padding: '16px 0' }}>{exp.category}</td>
                        <td style={{ padding: '16px 0', textAlign: 'right' }} className="mono-text">₨ {exp.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
