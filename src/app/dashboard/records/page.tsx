'use client';

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { Printer, Receipt, Plus } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  RevenueExpenseChart, MonthlyRevenueChart, PaymentMethodsChart,
  DailySalesChart, IncomeProfitChart
} from '@/components/dashboard/DetailedCharts';
import dashboardStyles from '@/app/dashboard/page.module.css';
import styles from './page.module.css';

type ReportTab = 'overview' | 'pl' | 'cashflow' | 'tax' | 'forecast';

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pl', label: 'Profit & Loss' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'tax', label: 'Tax Summary' },
  { id: 'forecast', label: 'Forecast' },
];

const fmt = (n: number) => `Rs ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthKey = (dateStr: string) => dateStr.slice(0, 7); // YYYY-MM
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export default function RecordsPage() {
  const { invoices, clients, expenses, products } = useAppData();
  const [dateRange, setDateRange] = useState('month');
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Computed totals for every real (non-quotation) invoice — used across
  // the P&L / Cash Flow / Tax / Forecast tabs, which each look at their own
  // time slice rather than sharing the Overview tab's dateRange filter.
  const allComputedInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.documentType !== 'quotation')
      .map(inv => {
        const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        const discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxBreakdown = (inv.taxes || []).map(t => ({ name: t.name, rate: t.rate, amount: afterDiscount * (t.rate / 100) }));
        const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);
        return { ...inv, subtotal, afterDiscount, taxBreakdown, totalTax, total: afterDiscount + totalTax };
      });
  }, [invoices]);

  // --- Profit & Loss (cash basis: only recognizes paid invoices / paid expenses) ---
  const plData = useMemo(() => {
    const revenue = allComputedInvoices.filter(inv => inv.status === 'Paid').reduce((s, inv) => s + inv.total, 0);
    const materials = expenses.filter(e => e.category === 'Materials' && e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const outsourced = expenses.filter(e => e.category === 'Outsourced' && e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const other = expenses.filter(e => e.category === 'Other' && e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const totalExpenses = materials + outsourced + other;
    return { revenue, materials, outsourced, other, totalExpenses, netProfit: revenue - totalExpenses };
  }, [allComputedInvoices, expenses]);

  // --- Cash Flow: monthly in/out over the last 6 months, based on paid status ---
  const cashFlowMonths = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map(key => {
      const cashIn = allComputedInvoices
        .filter(inv => inv.status === 'Paid' && monthKey(inv.issueDate) === key)
        .reduce((s, inv) => s + inv.total, 0);
      const cashOut = expenses
        .filter(e => e.status === 'Paid' && monthKey(e.date) === key)
        .reduce((s, e) => s + e.amount, 0);
      return { key, label: monthLabel(key), cashIn, cashOut, net: cashIn - cashOut };
    });
  }, [allComputedInvoices, expenses]);

  // --- Tax Summary: GST/VAT (or any configured tax) collected, grouped by
  // tax name + rate, recognized on issue (accrual — standard for tax
  // reporting even if the app's P&L above uses cash basis for profit). ---
  const taxSummary = useMemo(() => {
    const groups = new Map<string, { name: string; rate: number; base: number; tax: number; invoiceCount: number }>();
    allComputedInvoices.forEach(inv => {
      inv.taxBreakdown.forEach(t => {
        const key = `${t.name}__${t.rate}`;
        const existing = groups.get(key) || { name: t.name, rate: t.rate, base: 0, tax: 0, invoiceCount: 0 };
        existing.base += inv.afterDiscount;
        existing.tax += t.amount;
        existing.invoiceCount += 1;
        groups.set(key, existing);
      });
    });
    const rows = Array.from(groups.values()).sort((a, b) => b.tax - a.tax);
    const totalTaxCollected = rows.reduce((s, r) => s + r.tax, 0);
    return { rows, totalTaxCollected };
  }, [allComputedInvoices]);

  // --- Simple forecast: next 3 months. Inflow = outstanding (unpaid) invoices
  // whose due date falls in that month, plus a baseline from the trailing
  // 3-month average of paid invoices (for expected new business). Outflow =
  // trailing 3-month average of paid expenses. This is a simple projection
  // from historical averages and open invoices, not a guarantee. ---
  const forecast = useMemo(() => {
    const now = new Date();
    const last3Keys: string[] = [];
    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last3Keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const avgMonthlyRevenue = last3Keys.reduce((s, key) =>
      s + allComputedInvoices.filter(inv => inv.status === 'Paid' && monthKey(inv.issueDate) === key).reduce((a, inv) => a + inv.total, 0), 0) / 3;
    const avgMonthlyExpense = last3Keys.reduce((s, key) =>
      s + expenses.filter(e => e.status === 'Paid' && monthKey(e.date) === key).reduce((a, e) => a + e.amount, 0), 0) / 3;

    const outstanding = allComputedInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue');

    const nextMonths: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      nextMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return nextMonths.map(key => {
      const dueThisMonth = outstanding.filter(inv => monthKey(inv.dueDate) === key).reduce((s, inv) => s + inv.total, 0);
      const expectedInflow = dueThisMonth + avgMonthlyRevenue;
      const expectedOutflow = avgMonthlyExpense;
      return { key, label: monthLabel(key), expectedInflow, expectedOutflow, net: expectedInflow - expectedOutflow, dueThisMonth };
    });
  }, [allComputedInvoices, expenses]);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === '6months') {
      startDate.setMonth(now.getMonth() - 6);
    } else if (dateRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (dateRange === 'all') {
      startDate = new Date(0); // Beginning of time
    }

    return invoices
      .filter(inv => {
        const issue = new Date(inv.issueDate);
        return issue >= startDate && issue <= now;
      })
      .map(inv => {
        const subtotal = inv.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        let discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
        const afterDiscount = Math.max(0, subtotal - discountAmount);
        let totalTax = 0;
        inv.taxes?.forEach(tax => { totalTax += afterDiscount * (tax.rate / 100); });
        return { ...inv, calculatedTotal: afterDiscount + totalTax };
      })
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, dateRange]);

  const summary = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    const totalPaid = filteredInvoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    const totalOutstanding = filteredInvoices.filter(inv => inv.status !== 'Paid').reduce((acc, inv) => acc + inv.calculatedTotal, 0);
    return { totalBilled, totalPaid, totalOutstanding };
  }, [filteredInvoices]);

  const handlePrint = () => {
    // window.print() blocks until the dialog is dismissed in most browsers,
    // but not reliably in every environment (some render it asynchronously),
    // so this still guards against a rapid double-click queuing up a second
    // print dialog behind the first.
    if (isPrinting) return;
    setIsPrinting(true);
    window.print();
    setIsPrinting(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Financial Records</h1>
          <p className={styles.subtitle}>
            Aggregated report of billing activity.
          </p>
        </div>
        <div className={styles.controls}>
          <select 
            className={styles.input}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="6months">Past 6 Months</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
          <button className={styles.primaryButton} onClick={handlePrint} disabled={isPrinting} aria-busy={isPrinting}>
            <Printer size={18} />
            {isPrinting ? 'Opening…' : 'Print Report'}
          </button>
        </div>
      </header>

      <div className={styles.tabs}>
        {REPORT_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Total Billed</span>
              <span className={styles.cardValue}>Rs {summary.totalBilled.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Total Paid</span>
              <span className={styles.cardValue}>Rs {summary.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Outstanding</span>
              <span className={styles.cardValue}>Rs {summary.totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Invoices</span>
              <span className={styles.cardValue}>{filteredInvoices.length}</span>
            </div>
          </div>

          <div className={dashboardStyles.detailedChartsGrid} style={{ marginTop: 'var(--space-2)' }}>
            <RevenueExpenseChart invoices={invoices} expenses={expenses} clients={clients} products={products} filter="30D" />
            <MonthlyRevenueChart invoices={invoices} expenses={expenses} clients={clients} products={products} filter="30D" />
            <PaymentMethodsChart invoices={invoices} expenses={expenses} clients={clients} products={products} filter="30D" />
            <DailySalesChart invoices={invoices} expenses={expenses} clients={clients} products={products} filter="30D" />
            <IncomeProfitChart invoices={invoices} expenses={expenses} clients={clients} products={products} filter="30D" />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th className={styles.textRight}>Amount</th>
                </tr>
              </thead>
              <tbody className="mono-text">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                          <Receipt size={48} weight="duotone" />
                        </div>
                        <p className={styles.emptyStateText}>No financial records found for this period.</p>
                        <Link href="/dashboard/invoices?create=true" className={styles.emptyStateButton}>
                          <Plus size={16} />
                          Create Your First Invoice
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const client = clients.find(c => c.id === inv.clientId);
                    return (
                      <tr key={inv.id} className={styles.tableRow}>
                        <td>{inv.issueDate}</td>
                        <td>{inv.number}</td>
                        <td className="sans-text">{client?.name || 'Unknown'}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[inv.status.toLowerCase()] || ''}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className={styles.textRight}>Rs {inv.calculatedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'pl' && (
        <div className={styles.tableWrapper}>
          <div className={styles.plRow}>
            <span>Revenue (paid invoices)</span>
            <span className={styles.positive}>{fmt(plData.revenue)}</span>
          </div>
          <div className={styles.plRow} style={{ paddingLeft: '40px' }}>
            <span>Materials expenses</span>
            <span className={styles.negative}>-{fmt(plData.materials)}</span>
          </div>
          <div className={styles.plRow} style={{ paddingLeft: '40px' }}>
            <span>Outsourced expenses</span>
            <span className={styles.negative}>-{fmt(plData.outsourced)}</span>
          </div>
          <div className={styles.plRow} style={{ paddingLeft: '40px' }}>
            <span>Other expenses</span>
            <span className={styles.negative}>-{fmt(plData.other)}</span>
          </div>
          <div className={`${styles.plRow} ${styles.plRowTotal}`}>
            <span>Total expenses</span>
            <span className={styles.negative}>-{fmt(plData.totalExpenses)}</span>
          </div>
          <div className={`${styles.plRow} ${styles.plRowNet}`}>
            <span>Net profit</span>
            <span className={plData.netProfit >= 0 ? styles.positive : styles.negative}>{fmt(plData.netProfit)}</span>
          </div>
        </div>
      )}
      {activeTab === 'pl' && (
        <p className={styles.smallNote}>
          Cash basis: revenue counts only invoices marked Paid, expenses count only those marked Paid. Draft invoices, unpaid invoices, quotations, and unpaid expenses are excluded.
        </p>
      )}

      {activeTab === 'cashflow' && (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Cash In (6mo)</span>
              <span className={styles.cardValue}>{fmt(cashFlowMonths.reduce((s, m) => s + m.cashIn, 0))}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Cash Out (6mo)</span>
              <span className={styles.cardValue}>{fmt(cashFlowMonths.reduce((s, m) => s + m.cashOut, 0))}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Net (6mo)</span>
              <span className={styles.cardValue}>{fmt(cashFlowMonths.reduce((s, m) => s + m.net, 0))}</span>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.textRight}>Cash In</th>
                  <th className={styles.textRight}>Cash Out</th>
                  <th className={styles.textRight}>Net</th>
                </tr>
              </thead>
              <tbody className="mono-text">
                {cashFlowMonths.map(m => (
                  <tr key={m.key} className={styles.tableRow}>
                    <td className="sans-text">{m.label}</td>
                    <td className={styles.textRight}>{fmt(m.cashIn)}</td>
                    <td className={styles.textRight}>{fmt(m.cashOut)}</td>
                    <td className={`${styles.textRight} ${m.net >= 0 ? styles.positive : styles.negative}`}>{fmt(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'tax' && (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Total Tax Collected</span>
              <span className={styles.cardValue}>{fmt(taxSummary.totalTaxCollected)}</span>
            </div>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tax</th>
                  <th className={styles.textRight}>Rate</th>
                  <th className={styles.textRight}>Taxable Base</th>
                  <th className={styles.textRight}>Tax Collected</th>
                  <th className={styles.textRight}>Invoices</th>
                </tr>
              </thead>
              <tbody className="mono-text">
                {taxSummary.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateText}>No taxes (e.g. GST/VAT) have been applied to any invoice yet. Add a tax under Invoice creation or Settings defaults to see it tracked here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  taxSummary.rows.map(row => (
                    <tr key={`${row.name}-${row.rate}`} className={styles.tableRow}>
                      <td className="sans-text">{row.name}</td>
                      <td className={styles.textRight}>{row.rate}%</td>
                      <td className={styles.textRight}>{fmt(row.base)}</td>
                      <td className={styles.textRight}>{fmt(row.tax)}</td>
                      <td className={styles.textRight}>{row.invoiceCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className={styles.smallNote}>
            Accrual basis: includes all issued invoices (Pending, Paid, Overdue) regardless of payment status, since tax is typically owed on issuance — not just once collected. Quotations and drafts are excluded. Verify against FBR/provincial rules for your filing — this is a summary of what your invoices recorded, not tax advice.
          </p>
        </>
      )}

      {activeTab === 'forecast' && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.textRight}>Expected Inflow</th>
                  <th className={styles.textRight}>Expected Outflow</th>
                  <th className={styles.textRight}>Projected Net</th>
                </tr>
              </thead>
              <tbody className="mono-text">
                {forecast.map(m => (
                  <tr key={m.key} className={styles.tableRow}>
                    <td className="sans-text">{m.label}</td>
                    <td className={styles.textRight}>{fmt(m.expectedInflow)}</td>
                    <td className={styles.textRight}>{fmt(m.expectedOutflow)}</td>
                    <td className={`${styles.textRight} ${m.net >= 0 ? styles.positive : styles.negative}`}>{fmt(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.smallNote}>
            A simple projection, not a guarantee: inflow combines invoices already due that month with your trailing 3-month average of paid revenue; outflow uses your trailing 3-month average of paid expenses. Treat this as a rough planning guide.
          </p>
        </>
      )}
    </div>
  );
}
