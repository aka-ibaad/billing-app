'use client';

import React, { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Plus } from '@phosphor-icons/react';
import styles from './page.module.css';

export default function ProductsPage() {
  const { products, addProduct } = useAppData();
  const [isCreating, setIsCreating] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    defaultRate: 0,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) return;
    addProduct(newProduct);
    setNewProduct({ name: '', description: '', defaultRate: 0 });
    setIsCreating(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Products & Services</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Manage your catalogue for quick auto-calculation in invoices.
          </p>
        </div>
        <div className={styles.controls}>
          <button className={styles.primaryButton} onClick={() => setIsCreating(!isCreating)}>
            <Plus size={18} />
            {isCreating ? 'Cancel' : 'New Product'}
          </button>
        </div>
      </header>

      {isCreating && (
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
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th className={styles.textRight}>Default Rate</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.emptyState}>No products found. Create one to get started.</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className={styles.tableRow}>
                  <td className="sans-text" style={{ fontWeight: 500 }}>{product.name}</td>
                  <td>{product.description}</td>
                  <td className={`${styles.textRight} mono-text`}>
                    ₨ {product.defaultRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
