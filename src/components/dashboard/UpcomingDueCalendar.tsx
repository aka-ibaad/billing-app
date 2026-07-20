'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarBlank, CaretRight } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './UpcomingDueCalendar.module.css';
import Link from 'next/link';

export default function UpcomingDueCalendar() {
  const { invoices, clients } = useAppData();

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueList = invoices
      .filter(i => i.status !== 'Paid' && i.documentType !== 'quotation')
      .map(inv => {
        const d = new Date(inv.dueDate);
        d.setHours(0, 0, 0, 0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let dueLabel = '';
        if (diffDays < 0) dueLabel = `${Math.abs(diffDays)}d overdue`;
        else if (diffDays === 0) dueLabel = 'Due today';
        else if (diffDays === 1) dueLabel = 'Due tomorrow';
        else dueLabel = `Due in ${diffDays}d`;

        return {
          id: inv.id,
          number: inv.number,
          clientId: inv.clientId,
          amount: inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0),
          dueDate: inv.dueDate,
          diffDays,
          dueLabel
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 4);

    return dueList.map(u => ({
      ...u,
      clientName: clients.find(c => c.id === u.clientId)?.name || 'Unknown'
    }));
  }, [invoices, clients]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <CalendarBlank size={18} weight="duotone" />
        </div>
        <div className={styles.title}>Upcoming Due</div>
        <Link href="/invoices" className={styles.viewAll}>
          View all
        </Link>
      </div>

      <div className={styles.list}>
        {upcoming.length === 0 ? (
          <div className={styles.empty}>No upcoming dues.</div>
        ) : (
          upcoming.map((item, idx) => (
            <motion.div 
              key={item.id} 
              className={styles.item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className={styles.dateBox}>
                <span className={styles.month}>{new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short' })}</span>
                <span className={styles.day}>{new Date(item.dueDate).getDate()}</span>
              </div>
              <div className={styles.info}>
                <div className={styles.client}>{item.clientName}</div>
                <div className={styles.amount}>₨ {item.amount.toLocaleString()}</div>
              </div>
              <div className={`${styles.status} ${item.diffDays < 0 ? styles.overdue : item.diffDays === 0 ? styles.today : ''}`}>
                {item.dueLabel}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
