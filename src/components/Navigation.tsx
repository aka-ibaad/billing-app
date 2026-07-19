'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { SquaresFour, FileText, Users, Gear } from '@phosphor-icons/react';
import styles from './Navigation.module.css';
import { useAppData } from '@/context/AppDataContext';

const navItems = [
  { id: 'dashboard', path: '/', label: 'Overview', icon: SquaresFour },
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: FileText },
  { id: 'clients', path: '/clients', label: 'Clients', icon: Users },
  { id: 'products', path: '/products', label: 'Products', icon: SquaresFour },
  { id: 'expenses', path: '/expenses', label: 'Expenses', icon: FileText },
  { id: 'records', path: '/records', label: 'Records', icon: FileText },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Gear },
];

export default function Navigation() {
  const pathname = usePathname();
  const { settings } = useAppData();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <div className={styles.logoMark} />
        <span className={styles.logoText}>{settings.businessName || 'Bespoke'}</span>
      </div>
      
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <li key={item.id} className={styles.navItem}>
              <Link 
                href={item.path}
                className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className={styles.indicator}
                    transition={{
                      type: 'tween',
                      ease: [0.16, 1, 0.3, 1],
                      duration: 0.5
                    }}
                  />
                )}
                <span className={styles.iconWrapper}>
                  <Icon size={20} weight="duotone" />
                </span>
                <span className={styles.linkLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className={styles.userProfile}>
        <div className={styles.avatar}>SK</div>
      </div>
    </nav>
  );
}
