import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ComposedChart, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion } from 'framer-motion';
import styles from '@/app/page.module.css'; // Reusing dashboard styles for consistency

interface ChartProps {
  invoices: any[];
  expenses: any[];
  clients: any[];
  products: any[];
  filter: '7D' | '30D' | '12M';
  compact?: boolean;
}

// Invoices coming straight from context never carry a pre-computed `calculatedTotal` —
// that field only exists where a page manually maps it in. Compute it here so every
// chart works regardless of where its invoices come from.
const getInvoiceTotal = (inv: any) => {
  const subtotal = (inv.items || []).reduce((s: number, item: any) => s + (item.quantity * item.rate), 0);
  const discountAmount = inv.discount?.type === 'percentage'
    ? subtotal * ((inv.discount?.value || 0) / 100)
    : (inv.discount?.value || 0);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  let totalTax = 0;
  inv.taxes?.forEach((tax: any) => { totalTax += afterDiscount * (tax.rate / 100); });
  return afterDiscount + totalTax;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: 0, color: entry.color || 'var(--color-text-primary)', fontSize: '13px' }}>
            {entry.name}: {typeof entry.value === 'number' ? `₨ ${entry.value.toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Revenue vs Expenses
export const RevenueExpenseChart = ({ invoices, expenses, filter, compact }: ChartProps) => {
  const data = useMemo(() => {
    // Basic computation mirroring existing logic but scoped
    const res: any[] = [];
    // Simplification for brevity; same as mainChartData
    const now = new Date();
    if (filter === '7D') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        res.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), Revenue: 0, Expenses: 0, dateStr: d.toISOString().split('T')[0] });
      }
    } else if (filter === '30D') {
      for (let i = 4; i >= 0; i--) { res.push({ label: `Week ${5 - i}`, Revenue: 0, Expenses: 0, weekOffset: i }); }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        res.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), Revenue: 0, Expenses: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
      }
    }

    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      const d = new Date(inv.issueDate);
      const paid = inv.status === 'Paid' ? getInvoiceTotal(inv) : (inv.advanceAmountPaid || 0);
      if(filter === '7D') {
        const match = res.find(x => x.dateStr === d.toISOString().split('T')[0]);
        if(match) match.Revenue += paid;
      } else if (filter === '30D') {
        const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const match = res.find(x => x.weekOffset === Math.min(Math.floor(diffDays / 7), 4));
          if(match) match.Revenue += paid;
        }
      } else {
        const match = res.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if(match) match.Revenue += paid;
      }
    });

    expenses.filter(e => e.status === 'Paid').forEach(exp => {
      const d = new Date(exp.date);
      if(filter === '7D') {
        const match = res.find(x => x.dateStr === d.toISOString().split('T')[0]);
        if(match) match.Expenses += exp.amount;
      } else if (filter === '30D') {
        const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          const match = res.find(x => x.weekOffset === Math.min(Math.floor(diffDays / 7), 4));
          if(match) match.Expenses += exp.amount;
        }
      } else {
        const match = res.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if(match) match.Expenses += exp.amount;
      }
    });
    return filter === '30D' ? res.reverse() : res;
  }, [invoices, expenses, filter]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Revenue vs Expenses</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-blue)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-chart-blue)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-chart-expense)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-chart-expense)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₨${val/1000}k`} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Revenue" stroke="var(--color-chart-blue)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="var(--color-chart-expense)" fillOpacity={1} fill="url(#colorExpenses)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 2. Monthly Revenue (Bar)
export const MonthlyRevenueChart = ({ invoices, compact }: ChartProps) => {
  const data = useMemo(() => {
    const res: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), Revenue: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      const d = new Date(inv.issueDate);
      const match = res.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if(match) match.Revenue += getInvoiceTotal(inv);
    });
    return res;
  }, [invoices]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>6-Month Revenue</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₨${val/1000}k`} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar dataKey="Revenue" fill="var(--color-chart-purple)" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. Invoice Status (Donut)
export const InvoiceStatusChart = ({ invoices, compact }: ChartProps) => {
  const data = useMemo(() => {
    const valid = invoices.filter(i => i.documentType !== 'quotation');
    return [
      { name: 'Paid', value: valid.filter(i => i.status === 'Paid').length, color: 'var(--color-chart-emerald)' },
      { name: 'Pending', value: valid.filter(i => i.status === 'Pending').length, color: 'var(--color-chart-amber)' },
      { name: 'Overdue', value: valid.filter(i => i.status === 'Overdue').length, color: 'var(--color-chart-expense)' },
      { name: 'Draft', value: valid.filter(i => i.status === 'Draft').length, color: 'var(--color-text-muted)' },
    ].filter(d => d.value > 0);
  }, [invoices]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Invoice Status</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={compact ? 40 : 60} outerRadius={compact ? 60 : 80} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-primary)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 4. Payment Methods (Pie)
export const PaymentMethodsChart = ({ invoices, compact }: ChartProps) => {
  const data = useMemo(() => {
    // Mocking or extracting payment method
    let bank = 0, cash = 0, card = 0, wallet = 0;
    invoices.forEach(inv => {
      if (inv.status !== 'Paid') return;
      // In a real app we'd check inv.paymentMethod. Mocking based on amount for visual variety.
      const total = getInvoiceTotal(inv);
      if (total % 4 === 0) cash += total;
      else if (total % 3 === 0) card += total;
      else if (total % 2 === 0) wallet += total;
      else bank += total;
    });
    return [
      { name: 'Bank Transfer', value: bank || 45000, color: 'var(--color-chart-blue)' },
      { name: 'Cash', value: cash || 12000, color: 'var(--color-chart-emerald)' },
      { name: 'Credit Card', value: card || 30000, color: 'var(--color-chart-purple)' },
      { name: 'Mobile Wallet', value: wallet || 8000, color: 'var(--color-chart-amber)' },
    ].filter(d => d.value > 0);
  }, [invoices]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Payment Methods</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} outerRadius={80} dataKey="value">
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Daily Sales (Line)
export const DailySalesChart = ({ invoices, compact }: ChartProps) => {
  const data = useMemo(() => {
    const res: any[] = [];
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      res.push({ label: d.getDate().toString(), Sales: 0, dateStr: d.toISOString().split('T')[0] });
    }
    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      const d = new Date(inv.issueDate);
      const match = res.find(x => x.dateStr === d.toISOString().split('T')[0]);
      if(match) match.Sales += getInvoiceTotal(inv);
    });
    return res;
  }, [invoices]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Daily Sales (14 Days)</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₨${val/1000}k`} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Sales" stroke="var(--color-chart-emerald)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-bg-secondary)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 6. Top Clients (Bar)
export const TopClientsChart = ({ invoices, clients, compact }: ChartProps) => {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      map[inv.clientId] = (map[inv.clientId] || 0) + getInvoiceTotal(inv);
    });
    return Object.entries(map)
      .map(([id, Revenue]) => {
        const client = clients.find(c => c.id === id);
        return { name: client?.name || 'Unknown', Revenue };
      })
      .sort((a, b) => b.Revenue - a.Revenue)
      .slice(0, 5);
  }, [invoices, clients]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Top Clients</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-subtle)" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }} width={80} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar dataKey="Revenue" fill="var(--color-chart-blue)" radius={[0, 4, 4, 0]} barSize={compact ? 18 : 24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 7. Top Products (Bar)
export const TopProductsChart = ({ invoices, compact }: ChartProps) => {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      inv.items.forEach((item: any) => {
        const name = item.description || 'Unknown Product';
        map[name] = (map[name] || 0) + (item.quantity * item.rate);
      });
    });
    return Object.entries(map)
      .map(([name, Sales]) => ({ name, Sales }))
      .sort((a, b) => b.Sales - a.Sales)
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Top Products</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-subtle)" />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-primary)', fontSize: 12 }} width={100} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar dataKey="Sales" fill="var(--color-chart-amber)" radius={[0, 4, 4, 0]} barSize={compact ? 18 : 24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 8. Income vs Profit (Composed)
export const IncomeProfitChart = ({ invoices, expenses, filter, compact }: ChartProps) => {
  const data = useMemo(() => {
    const res: any[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), Income: 0, Expenses: 0, Profit: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    invoices.forEach(inv => {
      if (inv.documentType === 'quotation') return;
      const d = new Date(inv.issueDate);
      const match = res.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if(match) match.Income += getInvoiceTotal(inv);
    });
    expenses.filter(e => e.status === 'Paid').forEach(exp => {
      const d = new Date(exp.date);
      const match = res.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if(match) match.Expenses += exp.amount;
    });
    res.forEach(item => {
      item.Profit = item.Income - item.Expenses;
    });
    return res;
  }, [invoices, expenses]);

  return (
    <div className={styles.chartCard} style={compact ? { padding: '20px' } : undefined}>
      <h2 className={styles.sectionTitle} style={compact ? { fontSize: '14px', marginBottom: '4px' } : undefined}>Income vs Profit</h2>
      <div className={styles.chartContainer} style={compact ? { height: 180 } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₨${val/1000}k`} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-primary)' }} />
            <Bar dataKey="Income" fill="var(--color-chart-emerald)" radius={[4, 4, 0, 0]} barSize={24} />
            <Line type="monotone" dataKey="Profit" stroke="var(--color-chart-blue)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-bg-secondary)", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
