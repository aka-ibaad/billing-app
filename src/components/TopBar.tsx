'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Bell, Plus, User, Gear, Palette, Keyboard, SignOut, FileText, Users, Receipt, Package } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import { useRouter } from 'next/navigation';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { settings, notifications } = useAppData();
  const [greeting, setGreeting] = useState('Good Morning ☀️');
  const [currentDate, setCurrentDate] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning ☀️');
    else if (hour < 18) setGreeting('Good Afternoon 🌤');
    else setGreeting('Good Evening 🌙');

    setCurrentDate(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (createRef.current && !createRef.current.contains(event.target as Node)) {
        setIsCreateOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract initials for the avatar if no logo is available
  const businessName = settings.businessName || 'Business';
  const initials = businessName.substring(0, 2).toUpperCase();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const openNotifications = () => {
    window.dispatchEvent(new Event('open-notifications'));
  };

  const openSearch = () => {
    window.dispatchEvent(new Event('open-search'));
  };

  const handleLogout = () => {
    alert('Logged out successfully');
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
          {currentDate} • You have 4 invoices due today.
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

        <div className={styles.divider} />

        <div className={styles.dropdownContainer} ref={createRef}>
          <button className={styles.createButton} onClick={() => setIsCreateOpen(!isCreateOpen)}>
            <Plus size={16} weight="bold" />
            <span>Quick Create</span>
          </button>
          <AnimatePresence>
            {isCreateOpen && (
              <motion.div 
                className={styles.dropdownMenu}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className={styles.dropdownItem} onClick={() => { router.push('/invoices/new'); setIsCreateOpen(false); }}>
                  <FileText size={16} /> New Invoice
                </div>
                <div className={styles.dropdownItem} onClick={() => { router.push('/clients/new'); setIsCreateOpen(false); }}>
                  <Users size={16} /> New Client
                </div>
                <div className={styles.dropdownItem} onClick={() => { router.push('/products/new'); setIsCreateOpen(false); }}>
                  <Package size={16} /> New Product
                </div>
                <div className={styles.dropdownItem} onClick={() => { router.push('/expenses/new'); setIsCreateOpen(false); }}>
                  <Receipt size={16} /> New Expense
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.dropdownContainer} ref={profileRef}>
          <div className={styles.profile} onClick={() => setIsProfileOpen(!isProfileOpen)}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Profile" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
          </div>
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div 
                className={styles.dropdownMenuRight}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className={styles.dropdownHeader}>
                  <strong>{businessName}</strong>
                  <span>{settings.businessEmail}</span>
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownItem} onClick={() => { router.push('/settings'); setIsProfileOpen(false); }}>
                  <User size={16} /> My Profile
                </div>
                <div className={styles.dropdownItem} onClick={() => { router.push('/settings'); setIsProfileOpen(false); }}>
                  <Gear size={16} /> Company Settings
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownItem} onClick={() => { openSearch(); setIsProfileOpen(false); }}>
                  <Keyboard size={16} /> Keyboard Shortcuts
                </div>
                <div className={styles.dropdownItem} onClick={() => { handleLogout(); setIsProfileOpen(false); }}>
                  <SignOut size={16} /> Logout
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
