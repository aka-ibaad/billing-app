'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MagnifyingGlass, Bell, ChatTeardropText, Plus } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { settings } = useAppData();
  
  // Extract initials for the avatar if no logo is available
  const businessName = settings.businessName || 'Business';
  const initials = businessName.substring(0, 2).toUpperCase();

  return (
    <header className={styles.topbar}>
      <div className={styles.greetingSection}>
        <motion.h1 
          className={styles.greeting}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          Good Morning,
          <br />
          <span className={styles.greetingName}>{businessName}</span>
        </motion.h1>
        <motion.p 
          className={styles.summary}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          Here's what's happening with your business today.
        </motion.p>
      </div>

      <div className={styles.actionsSection}>
        <div className={styles.searchWrapper}>
          <MagnifyingGlass className={styles.searchIcon} size={18} weight="bold" />
          <input type="text" placeholder="Search invoices, clients..." className={styles.searchInput} />
          <div className={styles.searchShortcut}>⌘K</div>
        </div>

        <div className={styles.iconActions}>
          <button className={styles.iconButton} aria-label="Messages">
            <ChatTeardropText size={20} weight="duotone" />
            <span className={styles.badge}>2</span>
          </button>
          <button className={styles.iconButton} aria-label="Notifications">
            <Bell size={20} weight="duotone" />
            <span className={styles.badgeIndicator} />
          </button>
        </div>

        <div className={styles.divider} />

        <button className={styles.createButton}>
          <Plus size={16} weight="bold" />
          <span>Quick Create</span>
        </button>

        <div className={styles.profile}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Profile" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarFallback}>{initials}</div>
          )}
        </div>
      </div>
    </header>
  );
}
