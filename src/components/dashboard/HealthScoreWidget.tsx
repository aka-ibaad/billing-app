'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heartbeat, TrendUp } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './HealthScoreWidget.module.css';

export default function HealthScoreWidget() {
  const { invoices } = useAppData();

  const score = useMemo(() => {
    if (invoices.length === 0) return 100;
    
    let totalValue = 0;
    let paidValue = 0;
    let overdueValue = 0;

    invoices.forEach(inv => {
      const val = inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0);
      totalValue += val;
      if (inv.status === 'Paid') paidValue += val;
      if (inv.status === 'Overdue') overdueValue += val;
    });

    if (totalValue === 0) return 100;

    // Base score is 50. 
    // Up to +50 points for paid ratio.
    // Up to -30 points for overdue ratio.
    const paidRatio = paidValue / totalValue;
    const overdueRatio = overdueValue / totalValue;

    let calc = 50 + (paidRatio * 50) - (overdueRatio * 30);
    return Math.max(0, Math.min(100, Math.round(calc)));
  }, [invoices]);

  const scoreColor = score >= 80 ? 'var(--color-chart-emerald)' : score >= 50 ? 'var(--color-chart-amber)' : 'var(--color-chart-expense)';
  const scoreText = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Needs Attention';

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Heartbeat size={18} weight="duotone" />
        </div>
        <div className={styles.title}>Business Health</div>
      </div>
      
      <div className={styles.gaugeContainer}>
        <svg className={styles.svg} viewBox="0 0 100 100">
          <circle 
            className={styles.bgCircle} 
            cx="50" cy="50" r={radius} 
          />
          <motion.circle 
            className={styles.progressCircle} 
            cx="50" cy="50" r={radius}
            style={{ stroke: scoreColor, strokeDasharray: circumference }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className={styles.scoreContent}>
          <motion.div 
            className={styles.scoreNumber}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score}
          </motion.div>
          <div className={styles.scoreText} style={{ color: scoreColor }}>{scoreText}</div>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Cashflow</div>
          <div className={styles.metricValue}>
            <TrendUp size={12} color="var(--color-chart-emerald)" />
            Healthy
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Collection</div>
          <div className={styles.metricValue}>
            {score >= 80 ? 'Fast' : 'Slow'}
          </div>
        </div>
      </div>
    </div>
  );
}
