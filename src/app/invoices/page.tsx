'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData, Tax } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { Plus, Trash, DownloadSimple, Image as ImageIcon, FileText } from '@phosphor-icons/react';
import InvoicePreview from '@/components/InvoicePreview';
import UpcomingDueCalendar from '@/components/dashboard/UpcomingDueCalendar';
import { InvoiceStatusChart } from '@/components/dashboard/DetailedCharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function InvoicesContent() {
  const { invoices, clients, settings, products, addInvoice, updateOrderStatus, deleteInvoice } = useAppData();
  const searchParams = useSearchParams();
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewNativeHeight, setPreviewNativeHeight] = useState(0);
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  // Declared before the effects below — both reference `newInvoice`
  // (one in its dependency array, which React evaluates synchronously
  // during render), so it has to exist before they run or the component
  // throws "Cannot access 'newInvoice' before initialization".
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    number: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`,
    issueDate: new Date().toISOString().split('T')[0],
    issueTime: new Date().toTimeString().slice(0, 5),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0 }],
    status: 'Draft' as const,
    notes: '',
    taxes: [] as Tax[],
    discount: { type: 'fixed' as 'fixed' | 'percentage', value: 0 },
    format: 'horizontal' as 'horizontal' | 'vertical',
    documentType: 'invoice' as 'invoice' | 'quotation',
    paymentStatus: 'payable_after' as 'advance_full' | 'advance_partial' | 'payable_after',
    advanceAmountPaid: 0,
    expectedReadyDate: '',
    expectedReadyTime: '',
    orderStatus: 'Pending' as const,
  });

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
    }
    if (searchParams.get('format') === 'vertical') {
      setNewInvoice(prev => ({ ...prev, format: 'vertical' }));
    }
  }, [searchParams]);

  // Live preview scaling. The document is rendered at its true size (800px
  // for A4, 320px for a thermal receipt) and then scaled down/up to fit
  // whatever width the preview panel actually has. This used to rely on
  // CSS container queries + cqw units, which didn't reliably scale or
  // center the document (it was showing up clipped, with only the right
  // half of the page visible). Measuring the real container width and the
  // document's natural height in JS and applying the scale via an inline
  // transform is far more robust and works the same for both formats.
  useLayoutEffect(() => {
    const wrapperEl = previewWrapperRef.current;
    const contentEl = previewRef.current;
    if (!wrapperEl || !contentEl) return;

    const nativeWidth = newInvoice.format === 'vertical' ? 320 : 800;

    const recalc = () => {
      const w = wrapperEl.clientWidth;
      if (w > 0) setPreviewScale(w / nativeWidth);
      setPreviewNativeHeight(contentEl.scrollHeight);
    };

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapperEl);
    ro.observe(contentEl);
    return () => ro.disconnect();
    // isCreating is required here even though it's not read directly: the
    // wrapper/content refs are only attached to the DOM while the builder
    // panel is mounted, so without this the effect can run once before the
    // panel opens (finding null refs) and never re-run once it does.
  }, [newInvoice.format, isCreating]);

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0 }]
    });
  };

  const handleRemoveItem = (id: string) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter(item => item.id !== id)
    });
  };

  const handleItemChange = (id: string, field: string, value: string | number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const toggleTax = (tax: Tax) => {
    const exists = newInvoice.taxes.find(t => t.id === tax.id);
    if (exists) {
      setNewInvoice({ ...newInvoice, taxes: newInvoice.taxes.filter(t => t.id !== tax.id) });
    } else {
      setNewInvoice({ ...newInvoice, taxes: [...newInvoice.taxes, tax] });
    }
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  };

  const calculateTotals = () => {
    const sub = calculateSubtotal();
    let discountAmount = 0;
    if (newInvoice.discount.type === 'percentage') {
      discountAmount = sub * (newInvoice.discount.value / 100);
    } else {
      discountAmount = newInvoice.discount.value;
    }
    const afterDiscount = Math.max(0, sub - discountAmount);
    
    let totalTax = 0;
    newInvoice.taxes.forEach(tax => {
      totalTax += afterDiscount * (tax.rate / 100);
    });

    return {
      subtotal: sub,
      discountAmount,
      afterDiscount,
      totalTax,
      total: afterDiscount + totalTax
    };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.clientId) {
      setFormError('Please select a client before saving.');
      return;
    }
    if (newInvoice.items.some(i => !i.description.trim())) {
      setFormError('Every line item needs a description.');
      return;
    }

    addInvoice(newInvoice);
    setFormError('');
    setIsCreating(false);
    // Reset form
    setNewInvoice({
      clientId: '',
      number: `INV-2026-${String(invoices.length + 2).padStart(3, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      issueTime: new Date().toTimeString().slice(0, 5),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ id: Date.now().toString(), description: '', quantity: 1, rate: 0 }],
      status: 'Draft',
      notes: '',
      taxes: [],
      discount: { type: 'fixed' as 'fixed' | 'percentage', value: 0 },
      format: 'horizontal' as 'horizontal' | 'vertical',
      documentType: 'invoice' as 'invoice' | 'quotation',
      paymentStatus: 'payable_after' as 'advance_full' | 'advance_partial' | 'payable_after',
      advanceAmountPaid: 0,
      expectedReadyDate: '',
      expectedReadyTime: '',
      orderStatus: 'Pending',
    });
  };

  const isBuilderDirty = () => {
    return (
      newInvoice.clientId !== '' ||
      newInvoice.notes.trim() !== '' ||
      newInvoice.items.some(i => i.description.trim() !== '' || i.rate !== 0)
    );
  };

  const handleCancelBuilder = () => {
    if (isBuilderDirty() && !window.confirm('Discard this invoice? Everything you entered will be lost.')) {
      return;
    }
    setFormError('');
    setIsCreating(false);
  };

  const handleDeleteInvoice = (id: string, number: string) => {
    if (window.confirm(`Delete invoice ${number}? This cannot be undone.`)) {
      deleteInvoice(id);
    }
  };

  const exportPDF = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: newInvoice.format === 'horizontal' ? 'portrait' : 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${newInvoice.number}.pdf`);
  };

  const exportImage = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.download = `${newInvoice.number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Invoices</h1>
        <button 
          className={styles.primaryButton}
          onClick={() => setIsCreating(true)}
        >
          Create Invoice
        </button>
      </header>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            className={styles.builderSplitScreen}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.builderLeftPane}>
              <div className={styles.builderForm}>
                <form onSubmit={handleCreate}>
                  <div className={styles.builderHeader}>
                  <div className={styles.formGroup}>
                    <label>Client</label>
                    <select 
                      className={styles.input} 
                      value={newInvoice.clientId}
                      onChange={e => setNewInvoice({...newInvoice, clientId: e.target.value})}
                      required
                    >
                      <option value="" disabled>Select a client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Invoice Number</label>
                    <input 
                      type="text" 
                      className={`${styles.input} mono-text`}
                      value={newInvoice.number} 
                      onChange={e => setNewInvoice({...newInvoice, number: e.target.value})} 
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Document Type</label>
                    <select 
                      className={styles.input} 
                      value={newInvoice.documentType}
                      onChange={e => setNewInvoice({...newInvoice, documentType: e.target.value as 'invoice' | 'quotation'})}
                    >
                      <option value="invoice">Invoice (Standard)</option>
                      <option value="quotation">Quotation / Estimate</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Issue Date & Time</label>
                    <div className={styles.dateTimeRow}>
                      <input
                        type="date"
                        className={`${styles.input} mono-text`}
                        value={newInvoice.issueDate}
                        onChange={e => setNewInvoice({...newInvoice, issueDate: e.target.value})}
                      />
                      <input
                        type="time"
                        className={`${styles.input} mono-text`}
                        value={newInvoice.issueTime}
                        onChange={e => setNewInvoice({...newInvoice, issueTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.builderHeader} style={{ marginTop: '16px' }}>
                  <div className={styles.formGroup}>
                    <label>Payment Terms</label>
                    <select 
                      className={styles.input} 
                      value={newInvoice.paymentStatus}
                      onChange={e => setNewInvoice({...newInvoice, paymentStatus: e.target.value as any})}
                    >
                      <option value="payable_after">Payable After Receiving</option>
                      <option value="advance_full">Full Advance Paid</option>
                      <option value="advance_partial">Partial Advance Paid</option>
                    </select>
                  </div>
                  {newInvoice.paymentStatus === 'advance_partial' && (
                    <div className={styles.formGroup}>
                      <label>Advance Amount Paid</label>
                      <input 
                        type="number" 
                        min="0"
                        className={`${styles.input} mono-text`}
                        value={newInvoice.advanceAmountPaid} 
                        onChange={e => setNewInvoice({...newInvoice, advanceAmountPaid: Number(e.target.value)})} 
                      />
                    </div>
                  )}
                  <div className={styles.formGroup}>
                    <label>Expected Ready Date & Time</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="date" 
                        className={`${styles.input} mono-text`}
                        style={{ flex: 2 }}
                        value={newInvoice.expectedReadyDate || ''} 
                        onChange={e => setNewInvoice({...newInvoice, expectedReadyDate: e.target.value})} 
                      />
                      <input 
                        type="time" 
                        className={`${styles.input} mono-text`}
                        style={{ flex: 1 }}
                        value={newInvoice.expectedReadyTime || ''} 
                        onChange={e => setNewInvoice({...newInvoice, expectedReadyTime: e.target.value})} 
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.itemsSection}>
                  <div className={styles.itemsHeader}>
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Amount</span>
                    <span></span>
                  </div>
                  {newInvoice.items.map((item) => (
                    <div key={item.id} className={styles.itemRow}>
                      <input 
                        type="text" 
                        list="productsList"
                        placeholder="Item description" 
                        className={styles.input}
                        value={item.description}
                        onChange={e => {
                          const val = e.target.value;
                          const foundProduct = products.find(p => p.name === val);
                          if (foundProduct) {
                            setNewInvoice({
                              ...newInvoice,
                              items: newInvoice.items.map(i => i.id === item.id ? { ...i, description: val, rate: foundProduct.defaultRate } : i)
                            });
                          } else {
                            handleItemChange(item.id, 'description', val);
                          }
                        }}
                        required
                      />
                      <input 
                        type="number" 
                        min="1" 
                        className={`${styles.input} mono-text`}
                        value={item.quantity}
                        onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      />
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        className={`${styles.input} mono-text`}
                        value={item.rate}
                        onChange={e => handleItemChange(item.id, 'rate', Number(e.target.value))}
                      />
                      <span className="mono-text">
                        ₨ {(item.quantity * item.rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Remove line item"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={newInvoice.items.length === 1}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                  <datalist id="productsList">
                    {products.map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                  <button type="button" className={styles.addButton} onClick={handleAddItem}>
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className={styles.itemsSection} style={{ marginTop: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Discounts & Taxes</h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label>Discount Type</label>
                      <select 
                        className={styles.input}
                        value={newInvoice.discount.type}
                        onChange={e => setNewInvoice({...newInvoice, discount: { ...newInvoice.discount, type: e.target.value as 'fixed' | 'percentage' }})}
                      >
                        <option value="fixed">Fixed Amount (₨)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label>Discount Value</label>
                      <input 
                        type="number" 
                        min="0"
                        step={newInvoice.discount.type === 'percentage' ? '0.1' : '0.01'}
                        className={`${styles.input} mono-text`}
                        value={newInvoice.discount.value}
                        onChange={e => setNewInvoice({...newInvoice, discount: { ...newInvoice.discount, value: Number(e.target.value) }})}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {settings.defaultTaxes?.map(tax => {
                      const isSelected = newInvoice.taxes.some(t => t.id === tax.id);
                      return (
                        <label key={tax.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: '4px', cursor: 'pointer', background: isSelected ? 'var(--color-bg-secondary)' : 'transparent' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleTax(tax)}
                            style={{ margin: 0 }}
                          />
                          <span>{tax.name} ({tax.rate}%)</span>
                        </label>
                      );
                    })}
                    {(!settings.defaultTaxes || settings.defaultTaxes.length === 0) && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>No default taxes configured. Add them in Settings.</p>
                    )}
                  </div>
                </div>

                <div className={styles.builderFooter}>
                  <div className={styles.totals}>
                    <div className={styles.totalRow}>
                      <span>Subtotal</span>
                      <span className="mono-text">₨ {calculateTotals().subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    {newInvoice.discount.value > 0 && (
                      <div className={styles.totalRow} style={{ color: '#ff4444' }}>
                        <span>Discount ({newInvoice.discount.type === 'percentage' ? `${newInvoice.discount.value}%` : 'Fixed'})</span>
                        <span className="mono-text">- ₨ {calculateTotals().discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {newInvoice.taxes.map(tax => (
                      <div key={tax.id} className={styles.totalRow}>
                        <span>{tax.name} ({tax.rate}%)</span>
                        <span className="mono-text">+ ₨ {(calculateTotals().afterDiscount * (tax.rate / 100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    ))}
                    <div className={styles.totalRowLarge}>
                      <span>Total</span>
                      <span className="mono-text">₨ {calculateTotals().total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                  
                  {formError && (
                    <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '12px' }}>{formError}</p>
                  )}
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelButton} onClick={handleCancelBuilder}>Cancel</button>
                    <button type="submit" className={styles.submitButton}>Save Draft</button>
                  </div>
                </div>
                </form>
              </div>
            </div>
            <div className={styles.builderRightPane}>
              <div className={styles.builderRightPaneInner}>
                <div className={styles.panelActions}>
                  <div className={styles.panelBtnGroup}>
                    <button 
                      type="button" 
                      onClick={() => setNewInvoice({...newInvoice, format: 'horizontal'})}
                      className={`${styles.toggleBtn} ${newInvoice.format === 'horizontal' ? styles.toggleBtnActive : ''}`}
                    >A4 Bill</button>
                    <button 
                      type="button"
                      onClick={() => setNewInvoice({...newInvoice, format: 'vertical'})}
                      className={`${styles.toggleBtn} ${newInvoice.format === 'vertical' ? styles.toggleBtnActive : ''}`}
                    >Receipt</button>
                  </div>
                  <div className={styles.panelBtnGroup}>
                    <button type="button" onClick={exportImage} className={styles.exportBtn}>
                      <ImageIcon /> Image
                    </button>
                    <button type="button" onClick={exportPDF} className={`${styles.exportBtn} ${styles.exportBtnPrimary}`}>
                      <DownloadSimple /> PDF
                    </button>
                  </div>
                </div>

                <div
                  className={styles.previewWrapper}
                  ref={previewWrapperRef}
                  style={previewNativeHeight ? { height: previewNativeHeight * previewScale } : undefined}
                >
                  <div
                    className={styles.previewScaler}
                    style={{
                      width: newInvoice.format === 'vertical' ? 320 : 800,
                      transform: `scale(${previewScale})`,
                    }}
                  >
                    <div ref={previewRef}>
                      <InvoicePreview
                        invoice={newInvoice}
                        client={clients.find(c => c.id === newInvoice.clientId)}
                        settings={settings}
                        totals={calculateTotals()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.widgetsRow}>
        <UpcomingDueCalendar />
        <InvoiceStatusChart invoices={invoices} expenses={[]} clients={clients} products={products} filter="30D" compact />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            className={styles.input}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
          
          <select 
            className={styles.input} 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount (High to Low)</option>
            <option value="amount-asc">Amount (Low to High)</option>
          </select>
        </div>
      </div>

      <motion.div 
        className={styles.tableWrapper}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.tableCard}>
          <div className={styles.tableCardInner}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Client</th>
                  <th>Issue Date</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th className={styles.textRight}>Amount</th>
                  <th className={styles.textRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
            {invoices
              .filter(inv => filterStatus === 'All' || inv.status === filterStatus)
              .map(inv => {
                const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
                let discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
                const afterDiscount = Math.max(0, subtotal - discountAmount);
                let totalTax = 0;
                inv.taxes?.forEach(tax => { totalTax += afterDiscount * (tax.rate / 100); });
                return { ...inv, calculatedTotal: afterDiscount + totalTax };
              })
              .sort((a, b) => {
                if (sortBy === 'date-desc') return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
                if (sortBy === 'date-asc') return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
                if (sortBy === 'amount-desc') return b.calculatedTotal - a.calculatedTotal;
                if (sortBy === 'amount-asc') return a.calculatedTotal - b.calculatedTotal;
                return 0;
              })
              .map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                const total = inv.calculatedTotal;

                return (
                <tr key={inv.id}>
                  <td className="mono-text">{inv.number}</td>
                  <td className="sans-text">{client?.name || 'Unknown Client'}</td>
                  <td className="mono-text">{inv.issueDate}</td>
                  <td>
                  <span className={`${styles.statusBadge} ${
                      inv.status === 'Paid' ? styles.statusPaid : 
                      inv.status === 'Overdue' ? styles.statusOverdue : 
                      inv.status === 'Pending' ? styles.statusPending :
                      styles.statusDraft
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`${styles.statusBadge} ${
                        inv.orderStatus === 'Delivered' ? styles.statusPaid : 
                        inv.orderStatus === 'Cancelled' ? styles.statusOverdue : 
                        styles.statusPending
                      }`}>
                        {inv.orderStatus || 'Pending'}
                      </span>
                      {inv.orderStatus !== 'Delivered' && inv.orderStatus !== 'Cancelled' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateOrderStatus(inv.id, 'Delivered'); }}
                          style={{
                            background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px',
                            padding: '4px 8px', fontSize: '10px', cursor: 'pointer', color: 'var(--color-text-secondary)'
                          }}
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={`${styles.textRight} mono-text`}>₨ {total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className={styles.textRight}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Delete invoice ${inv.number}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id, inv.number); }}
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <div className={styles.emptyStateInner}>
                    <div className={styles.emptyStateIcon}><FileText size={20} weight="duotone" /></div>
                    <div className={styles.emptyStateTitle}>No invoices found</div>
                    <div className={styles.emptyStateDesc}>Create your first invoice to get started.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
