'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlass, FileText, Users, ChartLineUp, Receipt, Gear, 
  Moon, Sun, Desktop, Plus, Bell, X, Package
} from '@phosphor-icons/react';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import styles from './CommandPalette.module.css';

type ActionGroup = {
  title: string;
  items: ActionItem[];
};

type ActionItem = {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  shortcut?: string;
  onSelect: () => void;
};

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { invoices, clients, products, expenses } = useAppData();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      // Quick Create Invoice (Ctrl+N or Cmd+N)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        router.push('/invoices?create=true');
        setIsOpen(false);
      }
    };
    
    const handleOpenSearch = () => setIsOpen(true);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search', handleOpenSearch);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search', handleOpenSearch);
    };
  }, [router]);

  // Handle internal keyboard navigation
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          flatItems[selectedIndex].onSelect();
        }
      }
    };
    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  });

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const closeAndRun = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const allGroups: ActionGroup[] = [
    {
      title: 'Navigation',
      items: [
        { id: 'nav-dashboard', icon: ChartLineUp, title: 'Go to Dashboard', onSelect: () => closeAndRun(() => router.push('/')) },
        { id: 'nav-invoices', icon: FileText, title: 'Go to Invoices', onSelect: () => closeAndRun(() => router.push('/invoices')) },
        { id: 'nav-clients', icon: Users, title: 'Go to Clients', onSelect: () => closeAndRun(() => router.push('/clients')) },
        { id: 'nav-expenses', icon: Receipt, title: 'Go to Expenses', onSelect: () => closeAndRun(() => router.push('/expenses')) },
        { id: 'nav-settings', icon: Gear, title: 'Go to Settings', onSelect: () => closeAndRun(() => router.push('/settings')) },
      ],
    },
    {
      title: 'Quick Actions',
      items: [
        { id: 'create-invoice', icon: Plus, title: 'Create new Invoice', shortcut: '⌘N', onSelect: () => closeAndRun(() => router.push('/invoices?create=true')) },
        { id: 'create-client', icon: Plus, title: 'Add new Client', onSelect: () => closeAndRun(() => router.push('/clients/new')) },
        { id: 'record-expense', icon: Plus, title: 'Record Expense', onSelect: () => closeAndRun(() => router.push('/expenses/new')) },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { id: 'theme-light', icon: Sun, title: 'Switch to Light Theme', onSelect: () => closeAndRun(() => setTheme('light')) },
        { id: 'theme-dark', icon: Moon, title: 'Switch to Dark Theme', onSelect: () => closeAndRun(() => setTheme('dark')) },
        { id: 'theme-system', icon: Desktop, title: 'Use System Theme', onSelect: () => closeAndRun(() => setTheme('system')) },
      ]
    }
  ];

  // Dynamically add data if search query is present
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase();
    
    // Invoices
    const filteredInvoices = invoices.filter(i => i.number.toLowerCase().includes(q) || clients.find(c => c.id === i.clientId)?.name.toLowerCase().includes(q));
    if (filteredInvoices.length > 0) {
      allGroups.push({
        title: 'Invoices',
        items: filteredInvoices.slice(0, 5).map(inv => ({
          id: `inv-${inv.id}`, icon: FileText, title: inv.number, subtitle: clients.find(c => c.id === inv.clientId)?.name || 'Unknown Client',
          onSelect: () => closeAndRun(() => router.push(`/invoices/${inv.id}`))
        }))
      });
    }

    // Clients
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    if (filteredClients.length > 0) {
      allGroups.push({
        title: 'Clients',
        items: filteredClients.slice(0, 5).map(c => ({
          id: `client-${c.id}`, icon: Users, title: c.name, subtitle: c.email,
          onSelect: () => closeAndRun(() => router.push(`/clients/${c.id}`))
        }))
      });
    }

    // Products
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(q));
    if (filteredProducts.length > 0) {
      allGroups.push({
        title: 'Products',
        items: filteredProducts.slice(0, 5).map(p => ({
          id: `prod-${p.id}`, icon: Package, title: p.name, subtitle: `₨ ${p.defaultRate}`,
          onSelect: () => closeAndRun(() => router.push(`/products/${p.id}`))
        }))
      });
    }

    // Expenses
    const filteredExpenses = expenses.filter(e => e.payeeName.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    if (filteredExpenses.length > 0) {
      allGroups.push({
        title: 'Expenses',
        items: filteredExpenses.slice(0, 5).map(e => ({
          id: `exp-${e.id}`, icon: Receipt, title: e.payeeName, subtitle: `₨ ${e.amount} - ${e.description}`,
          onSelect: () => closeAndRun(() => router.push(`/expenses/${e.id}`))
        }))
      });
    }
  }

  // Filter groups based on search query
  const filteredGroups = allGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  const flatItems = filteredGroups.flatMap(group => group.items);

  // Auto-correct out-of-bounds selectedIndex when search results narrow
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(0);
    }
  }, [flatItems.length, selectedIndex]);

  return (
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
            className={styles.paletteContainer}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.searchHeader}>
              <MagnifyingGlass size={20} weight="bold" className={styles.searchIcon} />
              <input
                ref={inputRef}
                className={styles.searchInput}
                placeholder="What do you need?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                esc
              </button>
            </div>

            <div className={styles.resultsContainer}>
              {filteredGroups.length === 0 ? (
                <div className={styles.noResults}>
                  <p>No results found.</p>
                </div>
              ) : (
                filteredGroups.map((group, groupIdx) => {
                  const itemOffset = filteredGroups.slice(0, groupIdx).reduce((acc, g) => acc + g.items.length, 0);
                  
                  return (
                    <div key={group.title} className={styles.group}>
                      <div className={styles.groupTitle}>{group.title}</div>
                      {group.items.map((item, itemIdx) => {
                        const globalIndex = itemOffset + itemIdx;
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;
                        
                        return (
                          <div
                            key={item.id}
                            className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            onClick={() => item.onSelect()}
                          >
                            <div className={styles.itemIcon}>
                              <Icon size={18} weight="duotone" />
                            </div>
                            <div className={styles.itemContent}>
                              <span className={styles.itemTitle}>{item.title}</span>
                              {item.subtitle && <span className={styles.itemSubtitle}>{item.subtitle}</span>}
                            </div>
                            {item.shortcut && (
                              <div className={styles.itemShortcut}>{item.shortcut}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
