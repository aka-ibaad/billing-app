'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './page.module.css';
import HealthScoreWidget from '@/components/dashboard/HealthScoreWidget';
import RevenueGoalWidget from '@/components/dashboard/RevenueGoalWidget';
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget';

export default function InsightsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Insights</h1>
        <p className={styles.subtitle}>Business health, goals, and automated insights at a glance.</p>
      </header>

      <div className={styles.widgetsGrid}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <HealthScoreWidget />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <RevenueGoalWidget />
        </motion.div>
      </div>

      <motion.div className={styles.aiInsightsSection} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <AIInsightsWidget />
      </motion.div>
    </div>
  );
}
