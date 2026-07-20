'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, Receipt, FileText, WarningCircle, Trash } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './NotificationCenter.module.css';
import Link from 'next/link';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, clearNotifications } = useAppData();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-notifications', handleOpen);
    return () => window.removeEventListener('open-notifications', handleOpen);
  }, []);

  const markAllRead = () => {
    notifications.forEach(n => {
      if (!n.isRead) markNotificationRead(n.id);
    });
  };

  const removeAll = () => {
    clearNotifications();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className={styles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              className={styles.panel}
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className={styles.header}>
                <div>
                  <h2 className={styles.title}>Notifications</h2>
                  <p className={styles.subtitle}>You have {unreadCount} unread messages</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button className={styles.markReadBtn} onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button className={styles.markReadBtn} onClick={removeAll}>
                      Clear all
                    </button>
                  )}
                  <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className={styles.list}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Bell size={32} weight="duotone" className={styles.emptyIcon} />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  notifications.map(notification => {
                    const Wrapper = notification.link ? Link : 'div';
                    return (
                      <Wrapper 
                        href={notification.link || '#'} 
                        key={notification.id} 
                        className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                        onClick={() => {
                          if (!notification.isRead) markNotificationRead(notification.id);
                          if (notification.link) setIsOpen(false);
                        }}
                        style={{ textDecoration: 'none' }}
                      >
                        <div className={`${styles.iconWrapper} ${styles[notification.type]}`}>
                          {notification.type === 'success' && <CheckCircle size={18} weight="fill" />}
                          {notification.type === 'info' && <FileText size={18} weight="fill" />}
                          {notification.type === 'warning' && <WarningCircle size={18} weight="fill" />}
                          {notification.type === 'error' && <WarningCircle size={18} weight="fill" />}
                        </div>
                        <div className={styles.content}>
                          <div className={styles.itemTitle}>{notification.title}</div>
                          <div className={styles.itemDesc}>{notification.message}</div>
                          <div className={styles.itemTime}>{new Date(notification.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </Wrapper>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
