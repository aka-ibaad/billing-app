'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { Plus, Trash, Package } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopProductsChart } from '@/components/dashboard/DetailedCharts';
import styles from './page.module.css';

function ProductsContent() {
  const { products, addProduct, deleteProduct, invoices } = useAppData();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
    }
  }, [searchParams]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    defaultRate: 0,
  });

  const isFormDirty = () => newProduct.name.trim() !== '' || newProduct.description.trim() !== '' || newProduct.defaultRate !== 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;
    addProduct(newProduct);
    setNewProduct({ name: '', description: '', defaultRate: 0 });
    setIsCreating(false);
  };

  const handleToggleCreate = () => {
    if (isCreating && isFormDirty() && !window.confirm('Discard this new product? Your entries will be lost.')) {
      return;
    }
    if (isCreating) setNewProduct({ name: '', description: '', defaultRate: 0 });
    setIsCreating(!isCreating);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProduct(id);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Products & Services</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Manage your catalogue for quick auto-calculation in invoices.
          </p>
        </div>
        <div className={styles.controls}>
          <button className={styles.primaryButton} onClick={handleToggleCreate}>
            <Plus size={18} />
            {isCreating ? 'Cancel' : 'New Product'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            className={styles.addFormContainer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.formCardOuter}>
              <form onSubmit={handleCreate} className={styles.formCard}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Product Name</label>
              <input 
                type="text" 
                className={styles.input}
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                required
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label>Default Rate (₨)</label>
              <input 
                type="number" 
                min="0"
                step="0.01"
                className={`${styles.input} mono-text`}
                value={newProduct.defaultRate}
                onChange={e => setNewProduct({...newProduct, defaultRate: Number(e.target.value)})}
                required
              />
            </div>
          </div>
          <div className={styles.formGroup} style={{ marginTop: '24px' }}>
            <label>Description</label>
            <input 
              type="text" 
              className={styles.input}
              value={newProduct.description}
              onChange={e => setNewProduct({...newProduct, description: e.target.value})}
            />
          </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className={styles.primaryButton}>Save Product</button>
              </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {products.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <TopProductsChart invoices={invoices} expenses={[]} clients={[]} products={products} filter="30D" compact />
        </div>
      )}

      <motion.div
        className={styles.tableOuter}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th className={styles.textRight}>Default Rate</th>
              <th className={styles.textRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState}>
                  <div className={styles.emptyStateInner}>
                    <div className={styles.emptyStateIcon}><Package size={20} weight="duotone" /></div>
                    <div className={styles.emptyStateTitle}>No products yet</div>
                    <div className={styles.emptyStateDesc}>Add your catalogue to speed up invoice creation.</div>
                  </div>
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className={styles.tableRow}>
                  <td className="sans-text" style={{ fontWeight: 500 }}>{product.name}</td>
                  <td>{product.description}</td>
                  <td className={`${styles.textRight} mono-text`}>
                    ₨ {product.defaultRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={styles.textRight}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Delete ${product.name}`}
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
