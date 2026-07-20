'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CurrencyCircleDollar, CheckCircle } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './RecentPaymentsWidget.module.css';

export default function RecentPaymentsWidget() {
  const { invoices, clients } = useAppData();

  const recentPayments = useMemo(() => {
    const paidInvoices = invoices
      .filter(i => i.status === 'Paid')
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5);

    return paidInvoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      amount: inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0),
      date: inv.issueDate, // Note: Should ideally use a 'paidDate', but issueDate is proxy
      clientName: clients.find(c => c.id === inv.clientId)?.name || 'Unknown',
      clientInitials: (clients.find(c => c.id === inv.clientId)?.name || 'U').substring(0, 2).toUpperCase()
    }));
  }, [invoices, clients]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <CurrencyCircleDollar size={18} weight="duotone" />
        </div>
        <div className={styles.title}>Recent Payments</div>
      </div>

      <div className={styles.list}>
        {recentPayments.length === 0 ? (
          <div className={styles.empty}>No recent payments found.</div>
        ) : (
          recentPayments.map((payment, idx) => (
            <motion.div 
              key={payment.id} 
              className={styles.item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className={styles.avatar}>{payment.clientInitials}</div>
              <div className={styles.info}>
                <div className={styles.client}>{payment.clientName}</div>
                <div className={styles.meta}>
                  {payment.number} • {new Date(payment.date).toLocaleDateString()}
                </div>
              </div>
              <div className={styles.amountBox}>
                <div className={styles.amount}>+₨ {payment.amount.toLocaleString()}</div>
                <div className={styles.badge}>
                  <CheckCircle size={12} weight="fill" />
                  Paid
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
