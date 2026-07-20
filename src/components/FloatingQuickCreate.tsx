'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Receipt, Users, ChartLineUp, FilePlus } from '@phosphor-icons/react';
import styles from './FloatingQuickCreate.module.css';

export default function FloatingQuickCreate() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Handle Ctrl+N shortcut to open FAB menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions = [
    { id: 'invoice', label: 'Invoice', icon: FileText, onClick: () => router.push('/invoices?create=true') },
    { id: 'receipt', label: 'Receipt', icon: Receipt, onClick: () => router.push('/invoices?create=true') },
    { id: 'client', label: 'Client', icon: Users, onClick: () => router.push('/clients/new') },
    { id: 'product', label: 'Product', icon: ChartLineUp, onClick: () => router.push('/products/new') },
    { id: 'expense', label: 'Expense', icon: FilePlus, onClick: () => router.push('/expenses/new') },
  ];

  return (
    <div className={styles.fabContainer}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.fabMenu}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {actions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  className={styles.fabMenuItem}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * (actions.length - idx), duration: 0.2 }}
                >
                  <span className={styles.fabMenuLabel}>{action.label}</span>
                  <div className={styles.fabMenuIcon}>
                    <Icon size={18} weight="duotone" />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={styles.fabMain}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={24} weight="bold" />
        </motion.div>
      </motion.button>
    </div>
  );
}
