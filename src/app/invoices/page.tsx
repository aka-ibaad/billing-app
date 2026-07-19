'use client';

import React, { useState, useRef } from 'react';
import { useAppData, Tax } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { Plus, Trash, DownloadSimple, Image as ImageIcon } from '@phosphor-icons/react';
import InvoicePreview from '@/components/InvoicePreview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function InvoicesPage() {
  const { invoices, clients, settings, products, addInvoice } = useAppData();
  const [isCreating, setIsCreating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  
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
  });

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
    if (!newInvoice.clientId) return;
    
    addInvoice(newInvoice);
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
    });
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
              <form onSubmit={handleCreate} className={styles.builderForm}>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="date" 
                        className={`${styles.input} mono-text`}
                        style={{ flex: 2 }}
                        value={newInvoice.issueDate} 
                        onChange={e => setNewInvoice({...newInvoice, issueDate: e.target.value})} 
                      />
                      <input 
                        type="time" 
                        className={`${styles.input} mono-text`}
                        style={{ flex: 1 }}
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
                  
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelButton} onClick={() => setIsCreating(false)}>Cancel</button>
                    <button type="submit" className={styles.submitButton}>Save Draft</button>
                  </div>
                </div>
              </form>
            </div>
            
            <div className={styles.builderRightPane}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setNewInvoice({...newInvoice, format: 'horizontal'})}
                    style={{ padding: '8px 16px', background: newInvoice.format === 'horizontal' ? 'var(--color-pure-black)' : 'transparent', color: newInvoice.format === 'horizontal' ? 'white' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                  >A4 Bill</button>
                  <button 
                    type="button"
                    onClick={() => setNewInvoice({...newInvoice, format: 'vertical'})}
                    style={{ padding: '8px 16px', background: newInvoice.format === 'vertical' ? 'var(--color-pure-black)' : 'transparent', color: newInvoice.format === 'vertical' ? 'white' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                  >Receipt</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={exportImage} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}>
                    <ImageIcon /> Image
                  </button>
                  <button type="button" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    <DownloadSimple /> PDF
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div ref={previewRef} style={{ display: 'inline-block' }}>
                  <InvoicePreview 
                    invoice={newInvoice}
                    client={clients.find(c => c.id === newInvoice.clientId)}
                    settings={settings}
                    totals={calculateTotals()}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <select 
            className={styles.input} 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 'auto' }}
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

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Client</th>
              <th>Issue Date</th>
              <th>Status</th>
              <th className={styles.textRight}>Amount</th>
            </tr>
          </thead>
          <tbody className="mono-text">
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
                  <td>{inv.number}</td>
                  <td className="sans-text">{client?.name || 'Unknown Client'}</td>
                  <td>{inv.issueDate}</td>
                  <td>
                    <span className={
                      inv.status === 'Paid' ? styles.statusPaid : 
                      inv.status === 'Overdue' ? styles.statusOverdue : 
                      styles.statusDraft
                    }>
                      {inv.status}
                    </span>
                  </td>
                  <td className={styles.textRight}>₨ {total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No invoices found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
