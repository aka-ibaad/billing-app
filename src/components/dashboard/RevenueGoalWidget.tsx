'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './RevenueGoalWidget.module.css';

export default function RevenueGoalWidget() {
  const { invoices } = useAppData();
  
  // Example monthly goal
  const monthlyGoal = 1000000;

  const currentRevenue = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return invoices
      .filter(i => {
        const d = new Date(i.issueDate);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && i.status === 'Paid';
      })
      .reduce((sum, inv) => sum + inv.items.reduce((s:number, i:any)=>s+(i.quantity*i.rate),0), 0);
  }, [invoices]);

  const percentage = Math.min(100, (currentRevenue / monthlyGoal) * 100);
  
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <Target size={18} weight="duotone" />
        </div>
        <div className={styles.title}>Monthly Goal</div>
      </div>

      <div className={styles.gaugeContainer}>
        <svg className={styles.svg} viewBox="0 0 140 140">
          <circle 
            className={styles.bgCircle} 
            cx="70" cy="70" r={radius} 
          />
          <motion.circle 
            className={styles.progressCircle} 
            cx="70" cy="70" r={radius}
            style={{ strokeDasharray: circumference }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className={styles.scoreContent}>
          <div className={styles.percentage}>{Math.round(percentage)}%</div>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.current}>₨ {currentRevenue.toLocaleString()}</div>
        <div className={styles.target}>of ₨ {monthlyGoal.toLocaleString()} target</div>
      </div>
    </div>
  );
}
