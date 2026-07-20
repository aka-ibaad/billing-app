'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, PencilSimple, Check } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './RevenueGoalWidget.module.css';

export default function RevenueGoalWidget() {
  const { invoices, monthlyRevenueGoal, setMonthlyRevenueGoal } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(monthlyRevenueGoal));

  const monthlyGoal = monthlyRevenueGoal;

  const handleSaveGoal = () => {
    const parsed = Number(draftGoal);
    if (!isNaN(parsed) && parsed > 0) {
      setMonthlyRevenueGoal(parsed);
    }
    setIsEditing(false);
  };

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
        <button
          type="button"
          aria-label={isEditing ? 'Save monthly goal' : 'Edit monthly goal'}
          onClick={() => isEditing ? handleSaveGoal() : setIsEditing(true)}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          {isEditing ? <Check size={16} /> : <PencilSimple size={16} />}
        </button>
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
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            <span className={styles.target}>of ₨</span>
            <input
              type="number"
              min="1"
              autoFocus
              value={draftGoal}
              onChange={(e) => setDraftGoal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal(); }}
              style={{ width: '100px', padding: '2px 6px', fontSize: '12px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-primary)' }}
              aria-label="Monthly revenue goal amount"
            />
            <span className={styles.target}>target</span>
          </div>
        ) : (
          <div className={styles.target}>of ₨ {monthlyGoal.toLocaleString()} target</div>
        )}
      </div>
    </div>
  );
}
