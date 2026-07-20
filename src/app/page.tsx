'use client';

import React, { useState, useMemo, CSSProperties } from 'react';
import Link from 'next/link';
import { useAppData } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import AIInsightsWidget from '@/components/dashboard/AIInsightsWidget';
import HealthScoreWidget from '@/components/dashboard/HealthScoreWidget';
import UpcomingDueCalendar from '@/components/dashboard/UpcomingDueCalendar';
import RevenueGoalWidget from '@/components/dashboard/RevenueGoalWidget';
import RecentPaymentsWidget from '@/components/dashboard/RecentPaymentsWidget';
import { 
  RevenueExpenseChart, MonthlyRevenueChart, InvoiceStatusChart, PaymentMethodsChart,
  DailySalesChart, TopClientsChart, TopProductsChart, IncomeProfitChart 
} from '@/components/dashboard/DetailedCharts';
import { 
  Wallet, WarningCircle, CheckCircle, Clock, TrendUp, TrendDown,
  Plus, Users, ChartLineUp, Receipt, FileText, ArrowRight,
  ArrowUpRight, ArrowDownRight, CalendarBlank, Sparkle, Truck
} from '@phosphor-icons/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

type FilterType = '7D' | '30D' | '12M';

export default function Dashboard() {
  const { invoices, expenses, clients, products, updateOrderStatus } = useAppData();
  const [filter, setFilter] = useState<FilterType>('30D');

  const validInvoices = useMemo(() => invoices.filter(i => i.documentType !== 'quotation'), [invoices]);

  // Helper for invoice total
  const getInvoiceTotal = (inv: any) => {
    const subtotal = inv.items.reduce((s: number, item: any) => s + (item.quantity * item.rate), 0);
    let tTax = 0;
    inv.taxes?.forEach((tax: any) => tTax += subtotal * (tax.rate/100));
    return subtotal + tTax - (inv.discount?.type === 'fixed' ? inv.discount.value : subtotal * ((inv.discount?.value||0)/100));
  };

  const getInvoicePaidAmount = (inv: any) => {
    const total = getInvoiceTotal(inv);
    if (inv.status === 'Paid' || inv.paymentStatus === 'advance_full') return total;
    if (inv.paymentStatus === 'advance_partial' && inv.advanceAmountPaid) return inv.advanceAmountPaid;
    return 0;
  };

  // Process all KPI data
  const kpiData = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let daysInFilter = 30;
    if (filter === '7D') daysInFilter = 7;
    if (filter === '12M') daysInFilter = 365;

    const currentPeriodStart = new Date(now.getTime() - (daysInFilter * 24 * 60 * 60 * 1000));
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - (daysInFilter * 24 * 60 * 60 * 1000));

    let curRev = 0, prevRev = 0;
    let curExp = 0, prevExp = 0;
    let curOut = 0, prevOut = 0;
    let curOver = 0, prevOver = 0;
    let curPaidCount = 0, prevPaidCount = 0;
    let curPendingCount = 0, prevPendingCount = 0;

    const numBuckets = filter === '12M' ? 12 : filter === '30D' ? 15 : 7;
    const bucketSize = (daysInFilter * 24 * 60 * 60 * 1000) / numBuckets;
    
    const sparklines = {
      revenue: Array(numBuckets).fill(0),
      expenses: Array(numBuckets).fill(0),
      profit: Array(numBuckets).fill(0),
      outstanding: Array(numBuckets).fill(0),
      paidCount: Array(numBuckets).fill(0),
      pendingCount: Array(numBuckets).fill(0),
    };

    validInvoices.forEach(inv => {
      const d = new Date(inv.issueDate);
      const isCurrent = d > currentPeriodStart && d <= now;
      const isPrev = d > previousPeriodStart && d <= currentPeriodStart;
      
      const paid = getInvoicePaidAmount(inv);
      const total = getInvoiceTotal(inv);
      const outstanding = Math.max(0, total - paid);
      
      if (isCurrent) {
        curRev += paid;
        if (inv.status !== 'Paid') { curOut += outstanding; curPendingCount++; }
        if (inv.status === 'Paid') curPaidCount++;
        if (inv.status === 'Overdue') curOver += outstanding;
        
        const bucketIndex = Math.min(numBuckets - 1, Math.floor((d.getTime() - currentPeriodStart.getTime()) / bucketSize));
        if (bucketIndex >= 0) {
          sparklines.revenue[bucketIndex] += paid;
          sparklines.profit[bucketIndex] += paid;
          if (inv.status !== 'Paid') {
            sparklines.outstanding[bucketIndex] += outstanding;
            sparklines.pendingCount[bucketIndex]++;
          } else {
            sparklines.paidCount[bucketIndex]++;
          }
        }
      } else if (isPrev) {
        prevRev += paid;
        if (inv.status !== 'Paid') { prevOut += outstanding; prevPendingCount++; }
        if (inv.status === 'Paid') prevPaidCount++;
        if (inv.status === 'Overdue') prevOver += outstanding;
      }
    });

    expenses.filter(e => e.status === 'Paid').forEach(exp => {
      const d = new Date(exp.date);
      const isCurrent = d > currentPeriodStart && d <= now;
      const isPrev = d > previousPeriodStart && d <= currentPeriodStart;

      if (isCurrent) {
        curExp += exp.amount;
        const bucketIndex = Math.min(numBuckets - 1, Math.floor((d.getTime() - currentPeriodStart.getTime()) / bucketSize));
        if (bucketIndex >= 0) {
          sparklines.expenses[bucketIndex] += exp.amount;
          sparklines.profit[bucketIndex] -= exp.amount;
        }
      } else if (isPrev) {
        prevExp += exp.amount;
      }
    });

    const calcTrend = (cur: number, prev: number, invertTrendColors = false) => {
      if (prev === 0 && cur === 0) return { val: 0, text: '0%', type: 'neutral' as const };
      if (prev === 0) return { val: 100, text: '+100%', type: invertTrendColors ? 'negative' as const : 'positive' as const };
      const pct = ((cur - prev) / prev) * 100;
      const text = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      let type: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (pct > 0) type = invertTrendColors ? 'negative' : 'positive';
      else if (pct < 0) type = invertTrendColors ? 'positive' : 'negative';
      return { val: pct, text, type };
    };

    return {
      revenue: { val: curRev, trend: calcTrend(curRev, prevRev), sparkline: sparklines.revenue.map((val, i) => ({ i, val })) },
      profit: { val: curRev - curExp, trend: calcTrend(curRev - curExp, prevRev - prevExp), sparkline: sparklines.profit.map((val, i) => ({ i, val })) },
      expenses: { val: curExp, trend: calcTrend(curExp, prevExp, true), sparkline: sparklines.expenses.map((val, i) => ({ i, val })) },
      outstanding: { val: curOut, trend: calcTrend(curOut, prevOut, true), sparkline: sparklines.outstanding.map((val, i) => ({ i, val })) },
      paidInvoices: { val: curPaidCount, trend: calcTrend(curPaidCount, prevPaidCount), sparkline: sparklines.paidCount.map((val, i) => ({ i, val })) },
      pendingInvoices: { val: curPendingCount, trend: calcTrend(curPendingCount, prevPendingCount, true), sparkline: sparklines.pendingCount.map((val, i) => ({ i, val })) },
      totalClients: { val: clients.length, trend: { val: 0, text: 'Total', type: 'neutral' }, sparkline: Array(numBuckets).fill(0).map((_, i) => ({ i, val: clients.length })) },
      totalProducts: { val: products.length, trend: { val: 0, text: 'Total', type: 'neutral' }, sparkline: Array(numBuckets).fill(0).map((_, i) => ({ i, val: products.length })) }
    };
  }, [validInvoices, expenses, clients, products, filter]);

  const mainChartData = useMemo(() => {
    const data: { label: string; Revenue: number; Expenses: number; dateStr?: string; weekOffset?: number; key?: string }[] = [];
    const now = new Date();
    if (filter === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        data.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), Revenue: 0, Expenses: 0, dateStr: d.toISOString().split('T')[0] });
      }
    } else if (filter === '30D') {
      for (let i = 4; i >= 0; i--) { data.push({ label: `Week ${5 - i}`, Revenue: 0, Expenses: 0, weekOffset: i }); }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        data.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), Revenue: 0, Expenses: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
      }
    }

    validInvoices.forEach(inv => {
      const d = new Date(inv.issueDate);
      const paid = getInvoicePaidAmount(inv);
      if(filter === '7D') {
        const match = data.find(x => x.dateStr === d.toISOString().split('T')[0]);
        if(match) match.Revenue += paid;
      } else if (filter === '30D') {
        const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const match = data.find(x => x.weekOffset === Math.min(Math.floor(diffDays / 7), 4));
          if(match) match.Revenue += paid;
        }
      } else {
        const match = data.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if(match) match.Revenue += paid;
      }
    });

    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if(filter === '7D') {
        const match = data.find(x => x.dateStr === d.toISOString().split('T')[0]);
        if(match) match.Expenses += exp.amount;
      } else if (filter === '30D') {
        const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const match = data.find(x => x.weekOffset === Math.min(Math.floor(diffDays / 7), 4));
          if(match) match.Expenses += exp.amount;
        }
      } else {
        const match = data.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if(match) match.Expenses += exp.amount;
      }
    });
    return filter === '30D' ? data.reverse() : data;
  }, [validInvoices, expenses, filter]);

  const statusCounts = {
    paid: validInvoices.filter(i => i.status === 'Paid').length,
    pending: validInvoices.filter(i => i.status === 'Pending').length,
    overdue: validInvoices.filter(i => i.status === 'Overdue').length,
    draft: validInvoices.filter(i => i.status === 'Draft').length,
  };

  const pieData = [
    { name: 'Paid', value: statusCounts.paid, color: 'var(--color-chart-emerald)' },
    { name: 'Pending', value: statusCounts.pending, color: 'var(--color-chart-amber)' },
    { name: 'Overdue', value: statusCounts.overdue, color: 'var(--color-chart-expense)' },
    { name: 'Draft', value: statusCounts.draft, color: 'var(--color-text-muted)' },
  ].filter(d => d.value > 0);

  const recentInvoices = [...validInvoices].reverse().slice(0, 5);

  const dueDeliveries = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return validInvoices.filter(inv => {
      if (!inv.expectedReadyDate) return false;
      if (inv.orderStatus === 'Delivered' || inv.orderStatus === 'Cancelled') return false;
      return inv.expectedReadyDate <= todayStr;
    }).map(inv => ({
      ...inv,
      client: clients.find(c => c.id === inv.clientId)
    })).sort((a, b) => new Date(a.expectedReadyDate!).getTime() - new Date(b.expectedReadyDate!).getTime());
  }, [validInvoices, clients]);

  const activities = useMemo(() => {
    const list: any[] = [];
    validInvoices.slice(0, 3).forEach(inv => {
      list.push({ type: 'invoice', title: `Invoice ${inv.number} Created`, time: inv.issueDate, dateObj: new Date(inv.issueDate) });
      if (inv.status === 'Paid') {
        list.push({ type: 'payment', title: `Payment Received for ${inv.number}`, time: inv.issueDate, dateObj: new Date(inv.issueDate) });
      }
    });
    expenses.slice(0, 3).forEach(exp => {
      list.push({ type: 'expense', title: `Expense Logged: ${exp.description}`, time: exp.date, dateObj: new Date(exp.date) });
    });
    return list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()).slice(0, 5);
  }, [validInvoices, expenses]);

  const MiniChartCard = ({ title, value, trend, sparkline, color, icon: Icon, delay }: any) => (
    <motion.div 
      className={styles.metricCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.32, 0.72, 0, 1] }}
      style={{ '--card-accent': color, '--card-accent-rgb': color === 'var(--color-chart-blue)' ? '59,130,246' : color === 'var(--color-chart-emerald)' ? '16,185,129' : color === 'var(--color-chart-expense)' ? '239,68,68' : '245,158,11' } as CSSProperties}
    >
      <div className={styles.metricHeader}>
        <div className={styles.metricIconWrapper}>
          <Icon size={20} weight="duotone" />
        </div>
        <div className={styles.metricSparkline}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke={color} fillOpacity={1} fill={`url(#gradient-${title})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <div className={styles.metricTitle}>{title}</div>
        <div className={styles.metricValue}>
          {title.includes('Total') || title.includes('Invoices') ? value.toLocaleString() : `₨ ${value.toLocaleString(undefined, {minimumFractionDigits: 0})}`}
        </div>
        <div className={styles.metricFooter}>
          <div className={`${styles.trendBadge} ${trend.type === 'positive' ? styles.positive : trend.type === 'negative' ? styles.negative : styles.neutral}`}>
            {trend.type === 'positive' && <TrendUp size={12} />}
            {trend.type === 'negative' && <TrendDown size={12} />}
            {trend.text}
          </div>
          <span className={styles.metricSub}>vs previous {filter}</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.filterContainer}>
        <div className={styles.filterTabs}>
          {(['7D', '30D', '12M'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`${styles.filterTab} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {filter === f && (
                <motion.div layoutId="filter-active" className={styles.filterActiveBg} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
              )}
              {f}
            </button>
          ))}
        </div>
      </div>

        <AnimatePresence>
          {dueDeliveries.length > 0 && (
            <motion.div 
              className={styles.deliveriesWidget}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
              <div className={styles.deliveriesHeader}>
                <div className={styles.deliveriesTitle}>
                  <Truck size={24} weight="duotone" color="var(--color-chart-expense)" />
                  <h3>Action Required: Today you need to deliver {dueDeliveries.length} order{dueDeliveries.length > 1 ? 's' : ''}.</h3>
                </div>
              </div>
              <div className={styles.deliveriesList}>
                {dueDeliveries.map(delivery => (
                  <div key={delivery.id} className={styles.deliveryItem}>
                    <div className={styles.deliveryInfo}>
                      <span className={styles.deliveryClient}>{delivery.client?.name || 'Unknown'}</span>
                      <span className={styles.deliveryMeta}>
                        {delivery.number} • Due: {delivery.expectedReadyDate} {delivery.expectedReadyTime && `at ${delivery.expectedReadyTime}`} • {delivery.client?.phone || delivery.client?.email || 'No contact info'}
                      </span>
                    </div>
                    <button 
                      className={styles.deliverBtn} 
                      onClick={() => updateOrderStatus(delivery.id, 'Delivered')}
                    >
                      Mark as Delivered
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <div className={styles.summaryGrid}>
        <MiniChartCard title="Total Revenue" value={kpiData.revenue.val} trend={kpiData.revenue.trend} sparkline={kpiData.revenue.sparkline} color="var(--color-chart-blue)" icon={Wallet} delay={0.1} />
        <MiniChartCard title="Net Profit" value={kpiData.profit.val} trend={kpiData.profit.trend} sparkline={kpiData.profit.sparkline} color="var(--color-chart-emerald)" icon={TrendUp} delay={0.15} />
        <MiniChartCard title="Expenses" value={kpiData.expenses.val} trend={kpiData.expenses.trend} sparkline={kpiData.expenses.sparkline} color="var(--color-chart-expense)" icon={TrendDown} delay={0.2} />
        <MiniChartCard title="Outstanding Payments" value={kpiData.outstanding.val} trend={kpiData.outstanding.trend} sparkline={kpiData.outstanding.sparkline} color="var(--color-chart-amber)" icon={Clock} delay={0.25} />
        <MiniChartCard title="Paid Invoices" value={kpiData.paidInvoices.val} trend={kpiData.paidInvoices.trend} sparkline={kpiData.paidInvoices.sparkline} color="var(--color-chart-emerald)" icon={CheckCircle} delay={0.3} />
        <MiniChartCard title="Pending Invoices" value={kpiData.pendingInvoices.val} trend={kpiData.pendingInvoices.trend} sparkline={kpiData.pendingInvoices.sparkline} color="var(--color-chart-amber)" icon={WarningCircle} delay={0.35} />
        <MiniChartCard title="Total Clients" value={kpiData.totalClients.val} trend={kpiData.totalClients.trend} sparkline={kpiData.totalClients.sparkline} color="var(--color-chart-purple)" icon={Users} delay={0.4} />
        <MiniChartCard title="Total Products" value={kpiData.totalProducts.val} trend={kpiData.totalProducts.trend} sparkline={kpiData.totalProducts.sparkline} color="var(--color-text-secondary)" icon={ChartLineUp} delay={0.45} />
      </div>

      <motion.div 
        className={styles.quickStatsBar}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span><strong>Today's Stats:</strong></span>
        <span>Revenue: <strong>₨ 15,000</strong></span>
        <span>Expenses: <strong>₨ 2,400</strong></span>
        <span>Payments: <strong>3</strong></span>
        <span>Invoices Created: <strong>5</strong></span>
        <span>Clients Added: <strong>1</strong></span>
      </motion.div>

      <div className={styles.widgetsGrid}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}><HealthScoreWidget /></motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}><RevenueGoalWidget /></motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}><UpcomingDueCalendar /></motion.div>
      </div>
      <div className={styles.widgetsGridSplit}>
        <motion.div className={styles.aiInsightsWrap} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}><AIInsightsWidget /></motion.div>
        <motion.div className={styles.recentPaymentsWrap} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}><RecentPaymentsWidget /></motion.div>
      </div>

      <div className={styles.detailedChartsGrid}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <RevenueExpenseChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <MonthlyRevenueChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
          <InvoiceStatusChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
          <PaymentMethodsChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}>
          <DailySalesChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.0 }}>
          <TopClientsChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.1 }}>
          <TopProductsChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.2 }}>
          <IncomeProfitChart invoices={validInvoices} expenses={expenses} filter={filter} clients={clients} products={products} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Link href="/invoices?create=true" className={styles.actionCard}>
            <FileText size={24} weight="duotone" className={styles.actionIcon} color="var(--color-chart-blue)" />
            <span className={styles.actionLabel}>New Invoice</span>
          </Link>
          <Link href="/clients/new" className={styles.actionCard}>
            <Users size={24} weight="duotone" className={styles.actionIcon} color="var(--color-chart-emerald)" />
            <span className={styles.actionLabel}>Add Client</span>
          </Link>
          <Link href="/products/new" className={styles.actionCard}>
            <ChartLineUp size={24} weight="duotone" className={styles.actionIcon} color="var(--color-chart-purple)" />
            <span className={styles.actionLabel}>Add Product</span>
          </Link>
          <Link href="/expenses" className={styles.actionCard}>
            <Receipt size={24} weight="duotone" className={styles.actionIcon} color="var(--color-chart-expense)" />
            <span className={styles.actionLabel}>Record Expense</span>
          </Link>
          <div className={styles.actionCard} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <FileText size={24} weight="duotone" className={styles.actionIcon} />
            <span className={styles.actionLabel}>Create Receipt</span>
          </div>
          <div className={styles.actionCard} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <Wallet size={24} weight="duotone" className={styles.actionIcon} />
            <span className={styles.actionLabel}>View Reports</span>
          </div>
        </div>
      </motion.div>

      <div className={styles.bottomRow}>
        <motion.div className={styles.chartCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <div className={styles.activityList}>
            {activities.length === 0 ? (
              <div className={styles.emptyState}>
                <Clock size={32} weight="duotone" className={styles.emptyIcon} />
                <div className={styles.emptyTitle}>No activity yet</div>
                <div className={styles.emptyText}>Create your first invoice</div>
              </div>
            ) : (
              activities.map((act, i) => (
                <div key={i} className={styles.activityItem}>
                  <div className={styles.activityAvatar}>
                    {act.type === 'invoice' && <FileText size={16} color="var(--color-chart-blue)" weight="bold" />}
                    {act.type === 'payment' && <CheckCircle size={16} color="var(--color-chart-emerald)" weight="bold" />}
                    {act.type === 'expense' && <Receipt size={16} color="var(--color-chart-expense)" weight="bold" />}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{act.title}</div>
                    <div className={styles.activityTime}>{new Date(act.time).toLocaleDateString()}</div>
                  </div>
                  <div className={styles.activityLine} />
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div className={styles.chartCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className={styles.sectionTitle}>Recent Invoices</h2>
            <Link href="/invoices" style={{ color: 'var(--color-accent)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className={styles.invoicesTableWrapper}>
            <table className={styles.invoicesTable}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className={styles.emptyState}>
                        <FileText size={32} weight="duotone" className={styles.emptyIcon} />
                        <div className={styles.emptyTitle}>No invoices found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map(inv => {
                    const client = clients.find(c => c.id === inv.clientId);
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div className={styles.clientCell}>
                            <div className={styles.clientAvatar}>{client?.name?.substring(0, 2).toUpperCase() || 'NA'}</div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '13px' }}>{client?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{inv.number}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>₨ {getInvoiceTotal(inv).toLocaleString()}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${inv.status}`]}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
