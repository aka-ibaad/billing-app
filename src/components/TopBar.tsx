'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Bell } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { settings, notifications, invoices } = useAppData();
  const [greeting, setGreeting] = useState('Good Morning ☀️');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning ☀️');
    else if (hour < 18) setGreeting('Good Afternoon 🌤');
    else setGreeting('Good Evening 🌙');

    setCurrentDate(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  // Extract initials for the avatar if no logo is available
  const businessName = settings.businessName || 'Business';
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return invoices.filter(inv => inv.status !== 'Paid' && inv.documentType !== 'quotation' && inv.dueDate === todayStr).length;
  }, [invoices]);

  const openNotifications = () => {
    window.dispatchEvent(new Event('open-notifications'));
  };

  const openSearch = () => {
    window.dispatchEvent(new Event('open-search'));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.greetingSection}>
        <motion.h1 
          className={styles.greeting}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {greeting},
          <br />
          <span className={styles.greetingName}>{businessName}</span>
        </motion.h1>
        <motion.p 
          className={styles.summary}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          {currentDate} • {dueTodayCount === 0 ? 'No invoices due today.' : `You have ${dueTodayCount} invoice${dueTodayCount === 1 ? '' : 's'} due today.`}
        </motion.p>
      </div>

      <div className={styles.actionsSection}>
        <div className={styles.searchWrapper} onClick={openSearch}>
          <MagnifyingGlass className={styles.searchIcon} size={18} weight="bold" />
          <input type="text" placeholder="Search invoices, clients..." className={styles.searchInput} readOnly />
          <div className={styles.searchShortcut}>⌘K</div>
        </div>

        <div className={styles.iconActions}>
          <button className={styles.iconButton} aria-label="Notifications" onClick={openNotifications}>
            <Bell size={20} weight="duotone" />
            {unreadCount > 0 && <span className={styles.badgeIndicator} />}
          </button>
        </div>
      </div>
    </header>
  );
}
