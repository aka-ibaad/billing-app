'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkle, TrendUp, TrendDown, WarningCircle } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './AIInsightsWidget.module.css';

export default function AIInsightsWidget() {
  const { invoices, expenses, clients } = useAppData();

  const insights = useMemo(() => {
    const list = [];
    
    // Calculate simple stats for demonstration
    const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
    if (overdueInvoices.length > 0) {
      list.push({
        id: 'overdue',
        type: 'warning',
        icon: WarningCircle,
        title: 'Action Required',
        desc: `You have ${overdueInvoices.length} overdue invoices.`,
        recommendation: `Follow up to collect ₨ ${overdueInvoices.reduce((sum, inv) => sum + inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0), 0).toLocaleString()}`
      });
    }

    // Top client
    const clientRevenue: Record<string, number> = {};
    invoices.filter(i => i.status === 'Paid').forEach(inv => {
      const total = inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0);
      clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] || 0) + total;
    });

    const topClientId = Object.keys(clientRevenue).sort((a, b) => clientRevenue[b] - clientRevenue[a])[0];
    if (topClientId) {
      const topClient = clients.find(c => c.id === topClientId);
      list.push({
        id: 'top-client',
        type: 'positive',
        icon: TrendUp,
        title: 'Client Insight',
        desc: `Your highest paying customer is ${topClient?.name || 'Unknown'}.`,
        recommendation: `They generated ₨ ${clientRevenue[topClientId].toLocaleString()} in revenue.`
      });
    }

    // Expense check
    const currentMonthExpenses = expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0);
    if (currentMonthExpenses > 10000) {
      list.push({
        id: 'expense-alert',
        type: 'negative',
        icon: TrendDown,
        title: 'Expense Alert',
        desc: `Expenses are tracking high this month.`,
        recommendation: `Consider reducing recurring expenses by 8%.`
      });
    }

    return list;
  }, [invoices, expenses, clients]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <Sparkle size={14} weight="duotone" />
          <span>AI Insights</span>
        </div>
      </div>
      
      <div className={styles.list}>
        {insights.length === 0 ? (
          <div className={styles.empty}>Processing your latest data...</div>
        ) : (
          insights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <motion.div 
                key={insight.id}
                className={`${styles.card} ${styles[insight.type]}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
              >
                <div className={styles.iconBox}>
                  <Icon size={18} weight="duotone" />
                </div>
                <div className={styles.content}>
                  <div className={styles.title}>{insight.title}</div>
                  <div className={styles.desc}>{insight.desc}</div>
                  <div className={styles.recommendation}>{insight.recommendation}</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
