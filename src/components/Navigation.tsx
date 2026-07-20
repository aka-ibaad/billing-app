'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SquaresFour, FileText, Users, ChartLineUp, Receipt, Gear, Sparkle } from '@phosphor-icons/react';
import styles from './Navigation.module.css';
import { useAppData } from '@/context/AppDataContext';

const navItems = [
  { id: 'dashboard', path: '/', label: 'Overview', icon: SquaresFour },
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: FileText },
  { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
  { id: 'products', path: '/products', label: 'Products', icon: ChartLineUp },
  { id: 'expenses', path: '/expenses', label: 'Expenses', icon: Receipt },
  { id: 'records', path: '/records', label: 'Records', icon: FileText },
];

export default function Navigation() {
  const pathname = usePathname();
  const { settings } = useAppData();
  
  const businessName = settings.businessName || 'Business';
  const initials = businessName.substring(0, 2).toUpperCase();

  return (
    <nav className={styles.nav}>
      <div className={styles.navTop}>
        <div className={styles.logoSection}>
          <div className={styles.logoMarkWrapper}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className={styles.logoImage} />
            ) : (
              <div className={styles.logoMark}>{initials}</div>
            )}
          </div>
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoText}>{businessName}</span>
            <span className={styles.logoSubtitle}>Business Suite</span>
          </div>
        </div>
        
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            
            return (
              <li key={item.id} className={styles.navItem}>
                <Link 
                  href={item.path}
                  className={`${styles.navPill} ${isActive ? styles.active : ''}`}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill-bg"
                        className={styles.activePillBg}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="nav-pill-border"
                      className={styles.activePillBorder}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <span className={styles.iconWrapper}>
                    <Icon size={20} weight={isActive ? "duotone" : "regular"} className={isActive ? styles.activeIcon : ''} />
                  </span>
                  <span className={styles.linkLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className={styles.navBottom}>
        <Link href="/settings" className={styles.profileSection}>
          <div className={styles.profileAvatar}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Avatar" className={styles.avatarImage} />
            ) : (
              initials
            )}
            <div className={styles.onlineIndicator} />
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>Admin</span>
            <span className={styles.profileCompany}>{businessName}</span>
          </div>
          <div className={styles.settingsIcon}>
            <Gear size={18} weight="regular" />
          </div>
        </Link>
      </div>
    </nav>
  );
}
