'use client';

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { Wallet, WarningCircle, CheckCircle } from '@phosphor-icons/react';

type FilterType = '7D' | '30D' | '12M';

// Helper component for mini sparkline bar charts
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  return (
    <svg className={styles.sparkline} viewBox="0 0 100 30" preserveAspectRatio="none">
      {data.map((val, i) => {
        const height = (val / max) * 30;
        return (
          <motion.rect
            key={i}
            x={i * 16}
            y={30 - height}
            width={10}
            height={height}
            fill={color}
            initial={{ height: 0, y: 30 }}
            animate={{ height, y: 30 - height }}
            transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            rx={2}
          />
        );
      })}
    </svg>
  );
};

export default function Dashboard() {
  const { invoices, clients } = useAppData();
  const [filter, setFilter] = useState<FilterType>('30D');
  const [activeTooltip, setActiveTooltip] = useState<{ x: number, y: number, value: number, label: string } | null>(null);

  // --- Metrics Calculation ---
  const totalOutstanding = invoices
    .filter(i => i.status !== 'Paid')
    .reduce((sum, inv) => sum + inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0), 0);

  const overdue = invoices
    .filter(i => i.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0), 0);

  const paidThisMonth = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, inv) => sum + inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0), 0);

  const recentInvoices = [...invoices].reverse().slice(0, 5);

  // Status breakdown for Donut Chart
  const statusCounts = {
    paid: invoices.filter(i => i.status === 'Paid').length,
    pending: invoices.filter(i => i.status === 'Pending').length,
    overdue: invoices.filter(i => i.status === 'Overdue').length,
    draft: invoices.filter(i => i.status === 'Draft').length,
  };
  const totalActionableInvoices = statusCounts.paid + statusCounts.pending + statusCounts.overdue || 1;

  // Donut calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const paidPercent = statusCounts.paid / totalActionableInvoices;
  const pendingPercent = statusCounts.pending / totalActionableInvoices;
  const overduePercent = statusCounts.overdue / totalActionableInvoices;

  const paidDash = paidPercent * circumference;
  const pendingDash = pendingPercent * circumference;
  const overdueDash = overduePercent * circumference;

  const pendingOffset = circumference - paidDash;
  const overdueOffset = pendingOffset - pendingDash;

  // --- Chart Data Processing ---
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; value: number }[] = [];
    
    if (filter === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), value: 0 });
      }
    } else if (filter === '30D') {
      for (let i = 4; i >= 0; i--) {
        buckets.push({ label: `Week ${5 - i}`, value: 0 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), value: 0 });
      }
    }

    invoices.forEach(inv => {
      if (inv.status === 'Draft') return;
      const invDate = new Date(inv.issueDate);
      const amount = inv.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
      
      if (filter === '7D') {
        const diffTime = Math.abs(now.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const idx = 6 - (diffDays - 1);
          if (buckets[idx]) buckets[idx].value += amount;
        }
      } else if (filter === '30D') {
        const diffTime = Math.abs(now.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const weekIdx = Math.floor((30 - diffDays) / 7);
          if (buckets[weekIdx]) buckets[weekIdx].value += amount;
        }
      } else {
        const monthsAgo = (now.getFullYear() - invDate.getFullYear()) * 12 + (now.getMonth() - invDate.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          const idx = 11 - monthsAgo;
          if (buckets[idx]) buckets[idx].value += amount;
        }
      }
    });

    const allZero = buckets.every(b => b.value === 0);
    if (allZero) {
      buckets.forEach((b, i) => {
        b.value = filter === '12M' ? (i * 1000) + 2000 : (i * 200) + 500; 
      });
    }

    const maxValue = Math.max(...buckets.map(b => b.value), 1000);
    return { buckets, maxValue: maxValue * 1.2 }; 
  }, [invoices, filter]);

  // --- SVG Paths ---
  const svgWidth = 1000;
  const svgHeight = 300;
  const points = chartData.buckets.map((b, i) => {
    const x = (i / (chartData.buckets.length - 1)) * svgWidth;
    const y = svgHeight - (b.value / chartData.maxValue) * svgHeight;
    return { x, y, bucket: b };
  });

  const createSmoothPath = (pts: typeof points) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const cx = (p1.x + p2.x) / 2;
      d += ` C ${cx},${p1.y} ${cx},${p2.y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        
        <div className={styles.filterGroup}>
          {(['7D', '30D', '12M'] as FilterType[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterButton} ${filter === f ? styles.filterActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {filter === f && (
                <motion.div
                  layoutId="filterIndicator"
                  className={styles.filterIndicator}
                  transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                />
              )}
              <span className={styles.filterLabel}>{f}</span>
            </button>
          ))}
        </div>
      </header>

      <section className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Total Outstanding</p>
            <Wallet size={20} weight="duotone" color="var(--color-pure-black)" />
          </div>
          <div className={styles.metricBody}>
            <p className={`${styles.metricValue} mono-text`}>₨ {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <Sparkline data={[20, 30, 25, 40, 50, 45, 60]} color="var(--color-pure-black)" />
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Overdue</p>
            <WarningCircle size={20} weight="duotone" color="#ff3333" />
          </div>
          <div className={styles.metricBody}>
            <p className={`${styles.metricValue} ${styles.danger} mono-text`}>₨ {overdue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <Sparkline data={[10, 15, 12, 8, 14, 20, 25]} color="#ff3333" />
          </div>
        </div>
        <div className={styles.metricItem}>
          <div className={styles.metricHeader}>
            <p className={styles.metricLabel}>Total Paid</p>
            <CheckCircle size={20} weight="duotone" color="#00cc66" />
          </div>
          <div className={styles.metricBody}>
            <p className={`${styles.metricValue} mono-text`}>₨ {paidThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <Sparkline data={[40, 45, 60, 55, 70, 80, 100]} color="#00cc66" />
          </div>
        </div>
      </section>

      {/* 2-Column Chart Layout */}
      <section className={styles.chartsLayout}>
        {/* Main Area Chart (2/3) */}
        <div className={styles.chartBlock}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Global Performance Trends</h2>
            <p className={styles.chartSubtitle}>Invoiced volume over time</p>
          </div>
          
          <div className={styles.chartContainer}>
            <div className={styles.chartArea}>
              {/* Vertical Grid Lines mapping to X-axis */}
              <svg className={styles.gridSvg} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                {points.map((p, i) => (
                  <line key={i} x1={p.x} y1={0} x2={p.x} y2={svgHeight} stroke="#e5e5e5" strokeWidth="2" />
                ))}
              </svg>
              
              <svg 
                className={styles.svgChart} 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                preserveAspectRatio="none"
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4f4f5" />
                    <stop offset="100%" stopColor="rgba(244, 244, 245, 0)" />
                  </linearGradient>
                </defs>

                {/* Area Fill */}
                <motion.path
                  d={areaPath}
                  fill="url(#areaGradient)"
                  initial={{ opacity: 0 }}
                  animate={{ d: areaPath, opacity: 1 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Stroke Line */}
                <motion.path
                  d={linePath}
                  fill="none"
                  stroke="#cfcfcf"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, d: linePath }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Interactive Hover Zones */}
                {points.map((p, i) => {
                  const zoneWidth = svgWidth / points.length;
                  return (
                    <rect
                      key={i}
                      x={Math.max(0, p.x - zoneWidth / 2)}
                      y={0}
                      width={zoneWidth}
                      height={svgHeight}
                      fill="transparent"
                      onMouseEnter={() => setActiveTooltip({ x: p.x, y: p.y, value: p.bucket.value, label: p.bucket.label })}
                    />
                  );
                })}
                
                {/* Active Point Indicator */}
                {activeTooltip && (
                  <>
                    <line 
                      x1={activeTooltip.x} y1={0} x2={activeTooltip.x} y2={svgHeight} 
                      stroke="rgba(0,0,0,0.8)" strokeWidth="1" strokeDasharray="4 4"
                    />
                    <circle cx={activeTooltip.x} cy={activeTooltip.y} r="5" fill="var(--color-pure-black)" stroke="var(--color-crisp-white)" strokeWidth="2" />
                  </>
                )}
              </svg>

              {/* Tooltip */}
              <AnimatePresence>
                {activeTooltip && (
                  <motion.div
                    className={styles.glassTooltip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      left: `calc(${(activeTooltip.x / svgWidth) * 100}% - 50px)`,
                      top: `calc(${(activeTooltip.y / svgHeight) * 100}% - 60px)`,
                    }}
                  >
                    <p className={styles.tooltipLabel}>{activeTooltip.label}</p>
                    <p className={`${styles.tooltipValue} mono-text`}>₨ {activeTooltip.value.toLocaleString()}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.xLabels}>
                {chartData.buckets.map((b, i) => (
                  <span key={i} className="mono-text">{b.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Status Donut Chart (1/3) */}
        <div className={styles.chartBlock}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Invoice Status</h2>
          </div>
          <div className={styles.donutContainer}>
            <div className={styles.donutWrapper}>
              <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="12" />
                
                {/* Paid Segment */}
                <motion.circle 
                  cx="50" cy="50" r={radius} 
                  fill="none" stroke="#00cc66" strokeWidth="12" 
                  strokeDasharray={`${paidDash} ${circumference}`}
                  strokeDashoffset={circumference} /* start at top */
                  transform="rotate(-90 50 50)"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${paidDash} ${circumference}` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Pending Segment */}
                <motion.circle 
                  cx="50" cy="50" r={radius} 
                  fill="none" stroke="#cfcfcf" strokeWidth="12" 
                  strokeDasharray={`${pendingDash} ${circumference}`}
                  strokeDashoffset={pendingOffset}
                  transform="rotate(-90 50 50)"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${pendingDash} ${circumference}` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />

                {/* Overdue Segment */}
                <motion.circle 
                  cx="50" cy="50" r={radius} 
                  fill="none" stroke="#ff3333" strokeWidth="12" 
                  strokeDasharray={`${overdueDash} ${circumference}`}
                  strokeDashoffset={overdueOffset}
                  transform="rotate(-90 50 50)"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${overdueDash} ${circumference}` }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                />
              </svg>
              <div className={styles.donutCenter}>
                <span className="mono-text">{totalActionableInvoices}</span>
                <span className={styles.donutLabel}>Total</span>
              </div>
            </div>
            
            <div className={styles.donutLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#00cc66' }} />
                <span>Paid</span>
                <span className="mono-text">{(paidPercent * 100).toFixed(0)}%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#cfcfcf' }} />
                <span>Pending</span>
                <span className="mono-text">{(pendingPercent * 100).toFixed(0)}%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#ff3333' }} />
                <span>Overdue</span>
                <span className="mono-text">{(overduePercent * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.recentInvoices}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Invoices</h2>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="mono-text">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>No invoices yet.</td>
                  </tr>
                ) : (
                  recentInvoices.map(invoice => {
                    const client = clients.find(c => c.id === invoice.clientId);
                    const amount = invoice.items.reduce((s, item) => s + (item.quantity * item.rate), 0);
                    return (
                      <tr key={invoice.id}>
                        <td>{invoice.number}</td>
                        <td className="sans-text">{client?.name || 'Unknown'}</td>
                        <td>₨ {amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td><span className={styles[`status${invoice.status}`]}>{invoice.status}</span></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.activityFeed}>
          <h2 className={styles.sectionTitle}>Activity</h2>
          <ul className={styles.feedList}>
            {recentInvoices.slice(0, 3).map(inv => {
               const client = clients.find(c => c.id === inv.clientId);
               return (
                <li key={inv.id} className={styles.feedItem}>
                  <div className={styles.feedIcon} />
                  <div className={styles.feedContent}>
                    <p>Invoice {inv.number} created for <strong>{client?.name}</strong></p>
                    <span className="mono-text">{inv.issueDate}</span>
                  </div>
                </li>
               );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
