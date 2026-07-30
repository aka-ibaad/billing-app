'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/context/AppDataContext';
import { Plus, Trash, Package, WarningCircle, Minus, UploadSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopProductsChart } from '@/components/dashboard/DetailedCharts';
import ReadOnlyBanner from '@/components/ReadOnlyBanner';
import CsvImportModal from '@/components/CsvImportModal';
import styles from './page.module.css';

const PRODUCT_IMPORT_FIELDS = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'description', label: 'Description' },
  { key: 'defaultRate', label: 'Default Rate', required: true },
];

function ProductsContent() {
  const { products, addProduct, deleteProduct, adjustProductStock, invoices, isReadOnly } = useAppData();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
    }
  }, [searchParams]);

  const emptyProduct = {
    name: '',
    description: '',
    defaultRate: 0,
    trackStock: false,
    stockQuantity: 0,
    lowStockThreshold: 5,
  };
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const isFormDirty = () => newProduct.name.trim() !== '' || newProduct.description.trim() !== '' || newProduct.defaultRate !== 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newProduct.name) return;
    setIsSaving(true);
    try {
      await addProduct(newProduct.trackStock ? newProduct : { ...newProduct, stockQuantity: 0, lowStockThreshold: undefined });
      setNewProduct(emptyProduct);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Could not save this product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCreate = () => {
    if (isCreating && isFormDirty() && !window.confirm('Discard this new product? Your entries will be lost.')) {
      return;
    }
    if (isCreating) setNewProduct(emptyProduct);
    setIsCreating(!isCreating);
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    if (adjustingId) return;
    setAdjustingId(id);
    try {
      await adjustProductStock(id, delta);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert('Could not update stock. Please try again.');
    } finally {
      setAdjustingId(null);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (deletingId) return;
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      setDeletingId(id);
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Failed to delete product:', error);
        alert('Could not delete this product. Please try again.');
      } finally {
        setDeletingId(null);
      }
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
        {!isReadOnly && (
          <div className={styles.controls}>
            <button className={styles.primaryButton} style={{ background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={() => setIsImportOpen(true)}>
              <UploadSimple size={16} />
              Import CSV
            </button>
            <button className={styles.primaryButton} onClick={handleToggleCreate}>
              <Plus size={18} />
              {isCreating ? 'Cancel' : 'New Product'}
            </button>
          </div>
        )}
      </header>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Products"
        description="Upload a CSV exported from Excel or Google Sheets."
        fields={PRODUCT_IMPORT_FIELDS}
        onImportRow={async (r) => {
          const rate = Number(r.defaultRate);
          if (!r.name || Number.isNaN(rate)) throw new Error('Missing name or invalid rate');
          await addProduct({ name: r.name, description: r.description || '', defaultRate: rate, trackStock: false, stockQuantity: 0, lowStockThreshold: undefined });
        }}
      />

      {isReadOnly && <ReadOnlyBanner label="products" />}

      <AnimatePresence>
        {isCreating && !isReadOnly && (
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
              <label>Default Rate (Rs)</label>
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
          <div className={styles.formGroup} style={{ marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newProduct.trackStock}
                onChange={e => setNewProduct({ ...newProduct, trackStock: e.target.checked })}
              />
              <span>Track stock quantity for this item</span>
            </label>
          </div>
          {newProduct.trackStock && (
            <div className={styles.formGrid} style={{ marginTop: '16px' }}>
              <div className={styles.formGroup}>
                <label>Starting Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.input} mono-text`}
                  value={newProduct.stockQuantity}
                  onChange={e => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Low Stock Alert Below</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.input} mono-text`}
                  value={newProduct.lowStockThreshold}
                  onChange={e => setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className={styles.primaryButton} disabled={isSaving} aria-busy={isSaving}>
                  {isSaving ? 'Saving…' : 'Save Product'}
                </button>
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
              <th className={styles.textRight}>Stock</th>
              <th className={styles.textRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
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
                    Rs {product.defaultRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className={styles.textRight}>
                    {product.trackStock ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {product.lowStockThreshold != null && (product.stockQuantity || 0) <= product.lowStockThreshold && (
                          <span title={`Low stock — below ${product.lowStockThreshold}`} style={{ color: 'var(--color-danger, #ef4444)', display: 'flex' }}>
                            <WarningCircle size={14} weight="fill" />
                          </span>
                        )}
                        <span className="mono-text">{product.stockQuantity ?? 0}</span>
                        {!isReadOnly && (
                          <>
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Decrease stock for ${product.name}`}
                              disabled={adjustingId === product.id || (product.stockQuantity || 0) <= 0}
                              onClick={() => handleAdjustStock(product.id, -1)}
                              style={{ padding: '2px' }}
                            >
                              <Minus size={12} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Increase stock for ${product.name}`}
                              disabled={adjustingId === product.id}
                              onClick={() => handleAdjustStock(product.id, 1)}
                              style={{ padding: '2px' }}
                            >
                              <Plus size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                    )}
                  </td>
                  <td className={styles.textRight}>
                    {!isReadOnly && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Delete ${product.name}`}
                        disabled={deletingId === product.id}
                        aria-busy={deletingId === product.id}
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                      >
                        <Trash size={16} />
                      </button>
                    )}
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
