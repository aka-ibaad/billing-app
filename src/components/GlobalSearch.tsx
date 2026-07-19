'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass, FileText, Users, Gear } from '@phosphor-icons/react';
import { useAppData } from '@/context/AppDataContext';
import styles from './GlobalSearch.module.css';

export default function GlobalSearch() {
  const router = useRouter();
  const { clients, invoices } = useAppData();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getResults = () => {
    if (!query.trim()) return { invoices: [], clients: [], settings: [] };
    
    const q = query.toLowerCase();
    
    const matchedInvoices = invoices.filter(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      return inv.number.toLowerCase().includes(q) || 
             inv.status.toLowerCase().includes(q) ||
             (client?.name && client.name.toLowerCase().includes(q));
    });

    const matchedClients = clients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q))
    );

    const matchedSettings = 'settings'.includes(q) || 'taxes'.includes(q) || 'logo'.includes(q) || 'branding'.includes(q) 
      ? [{ id: 'settings', name: 'App Settings' }] 
      : [];

    return { invoices: matchedInvoices, clients: matchedClients, settings: matchedSettings };
  };

  const results = getResults();
  const hasResults = results.invoices.length > 0 || results.clients.length > 0 || results.settings.length > 0;

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.searchBar}>
        <MagnifyingGlass size={20} color="var(--color-text-secondary)" />
        <input
          type="text"
          placeholder="Search invoices, clients, settings..."
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.trim() && (
        <div className={styles.dropdown}>
          {!hasResults ? (
            <div className={styles.noResults}>No results found for "{query}"</div>
          ) : (
            <>
              {results.invoices.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Invoices</div>
                  {results.invoices.slice(0, 5).map(inv => {
                    const client = clients.find(c => c.id === inv.clientId);
                    return (
                      <div 
                        key={inv.id} 
                        className={styles.resultItem}
                        onClick={() => {
                          setIsOpen(false);
                          setQuery('');
                          router.push('/invoices');
                        }}
                      >
                        <FileText size={16} />
                        <div className={styles.resultDetails}>
                          <span className={styles.resultMain}>{inv.number}</span>
                          <span className={styles.resultSub}>{client?.name || 'Unknown'} - {inv.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {results.clients.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>Clients</div>
                  {results.clients.slice(0, 5).map(client => (
                    <div 
                      key={client.id} 
                      className={styles.resultItem}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                        router.push('/clients');
                      }}
                    >
                      <Users size={16} />
                      <div className={styles.resultDetails}>
                        <span className={styles.resultMain}>{client.name}</span>
                        <span className={styles.resultSub}>{client.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.settings.length > 0 && (
                <div className={styles.category}>
                  <div className={styles.categoryTitle}>System</div>
                  {results.settings.map(setting => (
                    <div 
                      key={setting.id} 
                      className={styles.resultItem}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                        router.push('/settings');
                      }}
                    >
                      <Gear size={16} />
                      <div className={styles.resultDetails}>
                        <span className={styles.resultMain}>{setting.name}</span>
                        <span className={styles.resultSub}>Manage preferences</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
