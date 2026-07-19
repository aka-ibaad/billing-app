'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppData, Tax } from '@/context/AppDataContext';
import styles from './page.module.css';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppData();
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessAddress: '',
    logoUrl: '',
    headerText: '',
    ntnNumber: '',
    footerText: '',
    signatureUrl: '',
    watermarkText: '',
    letterheadUrl: '',
    defaultTaxes: [] as Tax[],
  });

  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const letterheadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      businessName: settings.businessName || '',
      businessEmail: settings.businessEmail || '',
      businessAddress: settings.businessAddress || '',
      logoUrl: settings.logoUrl || '',
      headerText: settings.headerText || '',
      ntnNumber: settings.ntnNumber || '',
      footerText: settings.footerText || '',
      signatureUrl: settings.signatureUrl || '',
      watermarkText: settings.watermarkText || '',
      letterheadUrl: settings.letterheadUrl || '',
      defaultTaxes: settings.defaultTaxes || [],
    });
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size exceeds 1MB limit");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'signatureUrl' | 'letterheadUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("File size exceeds 1MB limit");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addTax = () => {
    const newTax: Tax = { id: Date.now().toString(), name: 'New Tax', rate: 0 };
    setFormData(prev => ({ ...prev, defaultTaxes: [...prev.defaultTaxes, newTax] }));
  };

  const updateTax = (id: string, field: keyof Tax, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      defaultTaxes: prev.defaultTaxes.map(tax => 
        tax.id === id ? { ...tax, [field]: value } : tax
      )
    }));
  };

  const removeTax = (id: string) => {
    setFormData(prev => ({
      ...prev,
      defaultTaxes: prev.defaultTaxes.filter(tax => tax.id !== id)
    }));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Business Details</h2>
            <p className={styles.sectionDesc}>This information will appear on your generated invoices.</p>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Business Name</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={formData.businessName}
                  onChange={e => setFormData({...formData, businessName: e.target.value})}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Business Email</label>
                <input 
                  type="email" 
                  className={styles.input}
                  value={formData.businessEmail}
                  onChange={e => setFormData({...formData, businessEmail: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Business Address</label>
              <textarea 
                className={`${styles.input} ${styles.textarea}`}
                value={formData.businessAddress}
                onChange={e => setFormData({...formData, businessAddress: e.target.value})}
                rows={3}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>NTN Number (National Tax Number)</label>
              <input 
                type="text" 
                className={styles.input}
                value={formData.ntnNumber}
                onChange={e => setFormData({...formData, ntnNumber: e.target.value})}
              />
            </div>
          </section>

          <section className={styles.section} style={{ marginTop: 'var(--space-12)' }}>
            <h2 className={styles.sectionTitle}>Branding Elements</h2>
            
            <div className={styles.formGroup}>
              <label>Company Logo</label>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Recommended size: 150x150 pixels. Max 1MB.</p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Upload Logo
                </button>
                {formData.logoUrl && (
                  <button type="button" onClick={() => setFormData({...formData, logoUrl: ''})} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Digital Signature / Stamp</label>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Recommended size: 200x100 pixels. Transparent PNG preferred. Max 1MB.</p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {formData.signatureUrl && (
                  <img src={formData.signatureUrl} alt="Signature" style={{ width: '120px', height: '60px', objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={signatureInputRef}
                  onChange={e => handleImageUpload(e, 'signatureUrl')}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => signatureInputRef.current?.click()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Upload Signature
                </button>
                {formData.signatureUrl && (
                  <button type="button" onClick={() => setFormData({...formData, signatureUrl: ''})} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Official Letterhead</label>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Appears only on A4 Bill format. Max 1MB.</p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {formData.letterheadUrl && (
                  <img src={formData.letterheadUrl} alt="Letterhead" style={{ width: '200px', height: '40px', objectFit: 'cover', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={letterheadInputRef}
                  onChange={e => handleImageUpload(e, 'letterheadUrl')}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => letterheadInputRef.current?.click()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  Upload Letterhead
                </button>
                {formData.letterheadUrl && (
                  <button type="button" onClick={() => setFormData({...formData, letterheadUrl: ''})} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Watermark Text</label>
              <input 
                type="text" 
                className={styles.input}
                value={formData.watermarkText}
                onChange={e => setFormData({...formData, watermarkText: e.target.value})}
                placeholder="e.g. CONFIDENTIAL or PAID"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Custom Header Text</label>
              <input 
                type="text" 
                className={styles.input}
                value={formData.headerText}
                onChange={e => setFormData({...formData, headerText: e.target.value})}
                placeholder="e.g. TAX INVOICE"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Custom Footer Text (Terms/Notes)</label>
              <textarea 
                className={`${styles.input} ${styles.textarea}`}
                value={formData.footerText}
                onChange={e => setFormData({...formData, footerText: e.target.value})}
                rows={2}
                placeholder="Thank you for your business!"
              />
            </div>
          </section>

          <section className={styles.section} style={{ marginTop: 'var(--space-12)' }}>
            <h2 className={styles.sectionTitle}>Default Taxes</h2>
            <p className={styles.sectionDesc}>Define taxes that can be applied to your invoices.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
              {formData.defaultTaxes.map(tax => (
                <div key={tax.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={tax.name}
                    onChange={e => updateTax(tax.id, 'name', e.target.value)}
                    placeholder="Tax Name (e.g. VAT)"
                    style={{ flex: 2 }}
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    className={`${styles.input} mono-text`}
                    value={tax.rate}
                    onChange={e => updateTax(tax.id, 'rate', Number(e.target.value))}
                    placeholder="Rate %"
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => removeTax(tax.id)} style={{ padding: '8px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addTax} style={{ padding: '8px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
              + Add Tax Rule
            </button>
          </section>

          <div className={styles.formActions} style={{ marginTop: 'var(--space-12)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)' }}>
            <button type="submit" className={styles.submitButton}>
              {saved ? 'Saved Successfully' : 'Save All Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
