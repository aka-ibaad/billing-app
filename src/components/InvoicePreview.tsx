import React from 'react';
import { Invoice, Client, Settings } from '@/context/AppDataContext';
import styles from './InvoicePreview.module.css';

interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  client?: Client;
  settings: Settings;
  totals?: {
    subtotal: number;
    discountAmount: number;
    afterDiscount: number;
    totalTax: number;
    total: number;
  };
  subtotal?: number; // legacy fallback
}

export default function InvoicePreview({ invoice, client, settings, totals, subtotal }: InvoicePreviewProps) {
  const number = invoice.number || 'INV-000';
  const issueDate = invoice.issueDate || 'YYYY-MM-DD';
  const dueDate = invoice.dueDate || 'YYYY-MM-DD';
  const items = invoice.items || [];
  
  const format = invoice.format || 'horizontal';
  const wrapperClass = format === 'vertical' ? styles.documentVertical : styles.documentHorizontal;
  
  // Use provided totals or calculate basic subtotal
  const tSub = totals?.subtotal ?? (subtotal || 0);
  const tDiscount = totals?.discountAmount ?? 0;
  const tTax = totals?.totalTax ?? 0;
  const tFinal = totals?.total ?? (subtotal || 0);

  return (
    <div className={styles.documentWrapper}>
      <div className={`${styles.document} ${wrapperClass}`}>
        
        {settings.logoUrl && (
          <div className={styles.logoWrapper}>
            <img src={settings.logoUrl} alt="Company Logo" className={styles.logo} />
          </div>
        )}
        
        <header className={styles.header}>
          <div className={styles.businessInfo}>
            {settings.headerText && <h1 className={styles.documentTitle}>{settings.headerText}</h1>}
            {!settings.headerText && <h1 className={styles.documentTitle}>INVOICE</h1>}
            
            <h2 className={styles.businessName}>{settings.businessName || 'Business Name'}</h2>
            <p className={styles.address}>{settings.businessAddress || '123 Business Rd, Tech City'}</p>
            <p className={styles.email}>{settings.businessEmail || 'hello@business.com'}</p>
            {settings.ntnNumber && <p className={styles.ntn}>NTN: {settings.ntnNumber}</p>}
          </div>
          
          <div className={styles.metaInfo}>
            <div className={styles.metaGrid}>
              <span className={styles.metaLabel}>Invoice No.</span>
              <span className="mono-text">{number}</span>
              
              <span className={styles.metaLabel}>Issue Date</span>
              <span className="mono-text">{issueDate}</span>
              
              <span className={styles.metaLabel}>Due Date</span>
              <span className="mono-text">{dueDate}</span>
            </div>
          </div>
        </header>

        <section className={styles.clientSection}>
          <h3 className={styles.sectionTitle}>BILL TO</h3>
          {client ? (
            <div className={styles.clientInfo}>
              <p className={styles.clientName}>{client.name}</p>
              <p className={styles.clientAddress}>{client.address}</p>
              <p className={styles.clientEmail}>{client.email}</p>
            </div>
          ) : (
            <p className={styles.placeholderText}>Select a client...</p>
          )}
        </section>

        <section className={styles.itemsSection}>
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th className={styles.colDesc}>Description</th>
                <th className={styles.colQty}>Qty</th>
                <th className={styles.colRate}>Rate</th>
                <th className={styles.colAmount}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className={styles.colDesc}>{item.description || '...'}</td>
                  <td className={`${styles.colQty} mono-text`}>{item.quantity || 0}</td>
                  <td className={`${styles.colRate} mono-text`}>₨ {(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className={`${styles.colAmount} mono-text`}>₨ {((item.quantity || 0) * (item.rate || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className={styles.footer}>
          <div className={styles.notesSection}>
            {invoice.notes && (
              <>
                <h3 className={styles.sectionTitle}>NOTES</h3>
                <p className={styles.notesText}>{invoice.notes}</p>
              </>
            )}
            {settings.footerText && (
              <p className={styles.footerText}>{settings.footerText}</p>
            )}
          </div>
          
          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span className="mono-text">₨ {tSub.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            
            {invoice.discount && invoice.discount.value > 0 && (
              <div className={styles.totalRow} style={{ color: '#ff4444' }}>
                <span>Discount ({invoice.discount.type === 'percentage' ? `${invoice.discount.value}%` : 'Fixed'})</span>
                <span className="mono-text">- ₨ {tDiscount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            )}
            
            {invoice.taxes?.map(tax => (
              <div key={tax.id} className={styles.totalRow}>
                <span>{tax.name} ({tax.rate}%)</span>
                <span className="mono-text">+ ₨ {((totals?.afterDiscount || tSub) * (tax.rate / 100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            ))}
            
            <div className={styles.grandTotal}>
              <span>Total Due</span>
              <span className="mono-text">
                ₨ {tFinal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
