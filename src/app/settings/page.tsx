'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppData, Tax } from '@/context/AppDataContext';
import { useTheme, Theme } from '@/context/ThemeContext';
import styles from './page.module.css';
import { Sun, Moon, Monitor } from '@phosphor-icons/react';

export default function SettingsPage() {
  const { settings, updateSettings, seedMockData } = useAppData();
  const { theme, setTheme } = useTheme();
  
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
    enableWatermark: false,
    watermarkOpacity: 5,
    watermarkSize: 'Large' as 'Small' | 'Medium' | 'Large' | 'Full Page',
    watermarkPosition: 'Center' as 'Center' | 'Top Center' | 'Bottom Center' | 'Custom',
    watermarkCustomX: 50,
    watermarkCustomY: 50,
    watermarkRotation: 0,
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
      enableWatermark: settings.enableWatermark || false,
      watermarkOpacity: settings.watermarkOpacity ?? 5,
      watermarkSize: settings.watermarkSize || 'Large',
      watermarkPosition: settings.watermarkPosition || 'Center',
      watermarkCustomX: settings.watermarkCustomX ?? 50,
      watermarkCustomY: settings.watermarkCustomY ?? 50,
      watermarkRotation: settings.watermarkRotation ?? 0,
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
        
        {/* Appearance Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <p className={styles.sectionDesc}>Customize the theme and interface behavior.</p>

          <div className={styles.themeGrid}>
            <button 
              type="button"
              className={`${styles.themeCard} ${styles.themeCardLight} ${theme === 'light' ? styles.active : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className={styles.themeIconWrapper}>
                <Sun size={24} weight={theme === 'light' ? 'fill' : 'regular'} />
              </div>
              <div>
                <div className={styles.themeTitle}>Light Theme</div>
                <div className={styles.themeDesc}>Soft Structuralism. Clean, bright, high-contrast surfaces.</div>
              </div>
            </button>

            <button 
              type="button"
              className={`${styles.themeCard} ${styles.themeCardDark} ${theme === 'dark' ? styles.active : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className={styles.themeIconWrapper}>
                <Moon size={24} weight={theme === 'dark' ? 'fill' : 'regular'} />
              </div>
              <div>
                <div className={styles.themeTitle}>Dark Theme</div>
                <div className={styles.themeDesc}>Ethereal Glass. Deep charcoals with subtle light flares.</div>
              </div>
            </button>

            <button 
              type="button"
              className={`${styles.themeCard} ${styles.themeCardSystem} ${theme === 'system' ? styles.active : ''}`}
              onClick={() => setTheme('system')}
            >
              <div className={styles.themeIconWrapper}>
                <Monitor size={24} weight={theme === 'system' ? 'fill' : 'regular'} />
              </div>
              <div>
                <div className={styles.themeTitle}>System (Recommended)</div>
                <div className={styles.themeDesc}>Automatically adapts to your device's appearance settings.</div>
              </div>
            </button>
          </div>
        </section>

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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Branding Elements</h2>
            
            <div className={styles.formGroup}>
              <label>Company Logo</label>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Recommended size: 150x150 pixels. Max 1MB.</p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', background: 'var(--color-bg-secondary)' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className={styles.secondaryButton}>
                  Upload Logo
                </button>
                {formData.logoUrl && (
                  <button type="button" onClick={() => setFormData({...formData, logoUrl: ''})} className={styles.dangerButton}>
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
                  <img src={formData.signatureUrl} alt="Signature" style={{ width: '120px', height: '60px', objectFit: 'contain', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', background: 'var(--color-bg-secondary)' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={signatureInputRef}
                  onChange={e => handleImageUpload(e, 'signatureUrl')}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => signatureInputRef.current?.click()} className={styles.secondaryButton}>
                  Upload Signature
                </button>
                {formData.signatureUrl && (
                  <button type="button" onClick={() => setFormData({...formData, signatureUrl: ''})} className={styles.dangerButton}>
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
                  <img src={formData.letterheadUrl} alt="Letterhead" style={{ width: '200px', height: '40px', objectFit: 'cover', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px', background: 'var(--color-bg-secondary)' }} />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  ref={letterheadInputRef}
                  onChange={e => handleImageUpload(e, 'letterheadUrl')}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => letterheadInputRef.current?.click()} className={styles.secondaryButton}>
                  Upload Letterhead
                </button>
                {formData.letterheadUrl && (
                  <button type="button" onClick={() => setFormData({...formData, letterheadUrl: ''})} className={styles.dangerButton}>
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
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Document Watermark</h2>
            <p className={styles.sectionDesc}>Display your Company Logo as a premium watermark behind document content.</p>

            <div className={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.enableWatermark || false}
                  onChange={e => setFormData({...formData, enableWatermark: e.target.checked})}
                />
                <span style={{ fontWeight: 500 }}>Enable Logo Watermark</span>
              </label>
              {!formData.logoUrl && formData.enableWatermark && (
                <p style={{ fontSize: '12px', color: '#ff8800', marginTop: '4px' }}>Please upload a Company Logo above to use this feature.</p>
              )}
            </div>

            {formData.enableWatermark && (
              <div style={{ padding: '16px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Watermark Size</label>
                    <select 
                      className={styles.input}
                      value={formData.watermarkSize || 'Large'}
                      onChange={e => setFormData({...formData, watermarkSize: e.target.value as any})}
                    >
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                      <option value="Full Page">Full Page</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Position</label>
                    <select 
                      className={styles.input}
                      value={formData.watermarkPosition || 'Center'}
                      onChange={e => setFormData({...formData, watermarkPosition: e.target.value as any})}
                    >
                      <option value="Center">Center</option>
                      <option value="Top Center">Top Center</option>
                      <option value="Bottom Center">Bottom Center</option>
                      <option value="Custom">Custom X/Y</option>
                    </select>
                  </div>
                </div>

                {formData.watermarkPosition === 'Custom' && (
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Horizontal Position (X %)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="range" min="0" max="100" 
                          value={formData.watermarkCustomX ?? 50}
                          onChange={e => setFormData({...formData, watermarkCustomX: Number(e.target.value)})}
                          style={{ flex: 1 }}
                        />
                        <span className="mono-text" style={{ width: '40px' }}>{formData.watermarkCustomX ?? 50}%</span>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Vertical Position (Y %)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="range" min="0" max="100" 
                          value={formData.watermarkCustomY ?? 50}
                          onChange={e => setFormData({...formData, watermarkCustomY: Number(e.target.value)})}
                          style={{ flex: 1 }}
                        />
                        <span className="mono-text" style={{ width: '40px' }}>{formData.watermarkCustomY ?? 50}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Opacity (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="range" min="1" max="20" 
                        value={formData.watermarkOpacity ?? 5}
                        onChange={e => setFormData({...formData, watermarkOpacity: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <span className="mono-text" style={{ width: '40px' }}>{formData.watermarkOpacity ?? 5}%</span>
                    </div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Rotation (°)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="range" min="0" max="360" 
                        value={formData.watermarkRotation ?? 0}
                        onChange={e => setFormData({...formData, watermarkRotation: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <span className="mono-text" style={{ width: '40px' }}>{formData.watermarkRotation ?? 0}°</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </section>

          <section className={styles.section}>
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

          <section className={styles.section}>
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
                  <button type="button" onClick={() => removeTax(tax.id)} className={styles.dangerButton}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addTax} className={styles.secondaryButton} style={{ alignSelf: 'flex-start' }}>
              + Add Tax Rule
            </button>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Developer & Testing</h2>
              <p className={styles.sectionDesc}>Tools for populating the app with demo content</p>
            </div>
            
            <div className={styles.formGroup}>
              <button type="button" className={styles.secondaryButton} onClick={() => {
                if (window.confirm('This will replace current data with mock data. Continue?')) {
                  seedMockData();
                  alert('Demo data seeded successfully! Go to the Dashboard to see it.');
                }
              }}>
                Seed Demo Data
              </button>
            </div>
          </section>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              {saved ? 'Saved Successfully' : 'Save All Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
