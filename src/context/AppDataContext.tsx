'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  createdAt: string;
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

export type Tax = {
  id: string;
  name: string;
  rate: number;
};

export type Discount = {
  type: 'percentage' | 'fixed';
  value: number;
};

export type Invoice = {
  id: string;
  clientId: string;
  number: string;
  issueDate: string;
  issueTime?: string;
  dueDate: string;
  items: LineItem[];
  status: 'Draft' | 'Pending' | 'Paid' | 'Overdue';
  notes: string;
  taxes?: Tax[];
  discount?: Discount;
  format?: 'horizontal' | 'vertical';
  documentType?: 'invoice' | 'quotation';
  paymentStatus?: 'advance_full' | 'advance_partial' | 'payable_after';
  advanceAmountPaid?: number;
  expectedReadyDate?: string;
  expectedReadyTime?: string;
  orderStatus?: 'Pending' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';
};

export type Settings = {
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  defaultTaxes: Tax[];
  logoUrl?: string;
  headerText?: string;
  ntnNumber?: string;
  phone?: string;
  website?: string;
  footerText?: string;
  signatureUrl?: string;
  watermarkText?: string;
  letterheadUrl?: string;
  enableWatermark?: boolean;
  watermarkOpacity?: number;
  watermarkSize?: 'Small' | 'Medium' | 'Large' | 'Full Page';
  watermarkPosition?: 'Center' | 'Top Center' | 'Bottom Center' | 'Custom';
  watermarkCustomX?: number;
  watermarkCustomY?: number;
  watermarkRotation?: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
};

export type Expense = {
  id: string;
  payeeName: string;
  description: string;
  amount: number;
  category: 'Materials' | 'Outsourced' | 'Other';
  status: 'Paid' | 'Unpaid';
  date: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  date: string;
  link?: string;
};

type AppDataContextType = {
  clients: Client[];
  invoices: Invoice[];
  settings: Settings;
  products: Product[];
  expenses: Expense[];
  notifications: AppNotification[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  updateOrderStatus: (id: string, status: Invoice['orderStatus']) => void;
  updateSettings: (data: Partial<Settings>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  seedMockData: () => void;
};

const defaultSettings: Settings = {
  businessName: 'Acme Corp',
  businessAddress: '123 Business Rd, Tech City, TC 10101',
  businessEmail: 'hello@sparx.com',
  defaultTaxes: [],
  enableWatermark: false,
  watermarkOpacity: 5,
  watermarkSize: 'Large',
  watermarkPosition: 'Center',
  watermarkCustomX: 50,
  watermarkCustomY: 50,
  watermarkRotation: 0,
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedClients = localStorage.getItem('billing_clients');
    const storedInvoices = localStorage.getItem('billing_invoices');
    const storedSettings = localStorage.getItem('billing_settings');
    const storedProducts = localStorage.getItem('billing_products');
    const storedExpenses = localStorage.getItem('billing_expenses');
    const storedNotifications = localStorage.getItem('billing_notifications');

    if (storedClients) setClients(JSON.parse(storedClients));
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
    if (storedSettings) setSettings(JSON.parse(storedSettings));
    if (storedProducts) setProducts(JSON.parse(storedProducts));
    if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
    if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
    
    // Fallback mock data if empty
    if (!storedClients && !storedInvoices) {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      setClients([
        { id: '1', name: 'Globex Inc', email: 'billing@globex.com', address: '100 Globe Way', createdAt: new Date().toISOString() },
        { id: '2', name: 'Soylent Corp', email: 'accounts@soylent.com', address: '200 Soy St', createdAt: new Date().toISOString() }
      ]);
      setInvoices([
        {
          id: '1', clientId: '1', number: 'INV-2026-040', issueDate: tenDaysAgo.toISOString().split('T')[0], dueDate: now.toISOString().split('T')[0],
          items: [{ id: 'i1', description: 'Web Design', quantity: 1, rate: 1200 }], status: 'Paid', notes: ''
        },
        {
          id: '2', clientId: '2', number: 'INV-2026-039', issueDate: twoDaysAgo.toISOString().split('T')[0], dueDate: now.toISOString().split('T')[0],
          items: [{ id: 'i2', description: 'Consulting', quantity: 40, rate: 210 }], status: 'Overdue', notes: ''
        }
      ]);
    }
    setIsLoaded(true);
  }, []);

  // Smart Notifications logic
  useEffect(() => {
    if (!isLoaded) return;
    
    // Generate smart notifications for today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const generatedNotifications: AppNotification[] = [];

    invoices.forEach(inv => {
      if (!inv.expectedReadyDate) return;
      if (inv.orderStatus === 'Delivered' || inv.orderStatus === 'Cancelled') return;

      const readyDate = inv.expectedReadyDate;
      const idPrefix = `smart-${inv.id}`;

      // Check if already notified to avoid spamming the state if we wanted to be persistent,
      // but since we want them to show up, we will just add them if they don't already exist.
      // Wait, if they marked it read, we don't want to recreate it as unread.
      
      const exists = notifications.some(n => n.id.startsWith(idPrefix) && n.title.includes(inv.number));
      if (exists) return;

      if (readyDate === todayStr) {
        generatedNotifications.push({
          id: `${idPrefix}-today-${Date.now()}`,
          title: 'Order Due Today',
          message: `Order ${inv.number} is due today at ${inv.expectedReadyTime || 'any time'}.`,
          type: 'warning',
          isRead: false,
          date: now.toISOString(),
          link: `/invoices/${inv.id}`
        });
      } else if (readyDate === tomorrowStr) {
        generatedNotifications.push({
          id: `${idPrefix}-tmrw-${Date.now()}`,
          title: 'Order Due Tomorrow',
          message: `Reminder: Order ${inv.number} is due tomorrow.`,
          type: 'info',
          isRead: false,
          date: now.toISOString(),
          link: `/invoices/${inv.id}`
        });
      } else if (readyDate < todayStr) {
        generatedNotifications.push({
          id: `${idPrefix}-overdue-${Date.now()}`,
          title: 'Order Overdue',
          message: `Order ${inv.number} was due on ${readyDate} and is not delivered yet.`,
          type: 'error',
          isRead: false,
          date: now.toISOString(),
          link: `/invoices/${inv.id}`
        });
      }
    });

    if (generatedNotifications.length > 0) {
      setNotifications(prev => {
        // filter out exact duplicates just in case
        const newNots = generatedNotifications.filter(gn => !prev.some(p => p.id === gn.id));
        return [...newNots, ...prev];
      });
    }
  }, [invoices, isLoaded]); // Re-run when invoices change to capture newly due ones

  // Save to localStorage when state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('billing_clients', JSON.stringify(clients));
      localStorage.setItem('billing_invoices', JSON.stringify(invoices));
      localStorage.setItem('billing_settings', JSON.stringify(settings));
      localStorage.setItem('billing_products', JSON.stringify(products));
      localStorage.setItem('billing_expenses', JSON.stringify(expenses));
      localStorage.setItem('billing_notifications', JSON.stringify(notifications));
    }
  }, [clients, invoices, settings, products, expenses, notifications, isLoaded]);

  const addClient = (data: Omit<Client, 'id' | 'createdAt'>) => {
    setClients(prev => [...prev, { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const addInvoice = (data: Omit<Invoice, 'id'>) => {
    setInvoices(prev => [...prev, { ...data, id: Date.now().toString() }]);
  };

  const updateInvoice = (id: string, data: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  };

  const updateOrderStatus = (id: string, status: Invoice['orderStatus']) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, orderStatus: status } : i));
  };

  const updateSettings = (data: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...data }));
  };

  const addProduct = (data: Omit<Product, 'id'>) => {
    setProducts(prev => [...prev, { ...data, id: Date.now().toString() }]);
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const addExpense = (data: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...data, id: Date.now().toString() }]);
  };

  const updateExpense = (id: string, data: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const seedMockData = () => {
    const now = new Date();
    
    // Clients
    const mockClients = [
      { id: '1', name: 'Globex Inc', email: 'billing@globex.com', address: '100 Globe Way', createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', name: 'Soylent Corp', email: 'accounts@soylent.com', address: '200 Soy St', createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '3', name: 'Initech', email: 'finance@initech.com', address: '300 Tech Park', createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '4', name: 'Umbrella Corp', email: 'admin@umbrella.com', address: 'Raccoon City', createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() }
    ];
    
    // Products
    const mockProducts = [
      { id: 'p1', name: 'Web Design', description: 'Custom website design', defaultRate: 1500 },
      { id: 'p2', name: 'Consulting', description: 'Hourly consultation', defaultRate: 200 },
      { id: 'p3', name: 'SEO Audit', description: 'Full site SEO audit', defaultRate: 800 },
      { id: 'p4', name: 'Hosting', description: 'Annual cloud hosting', defaultRate: 1200 }
    ];

    // Invoices
    const mockInvoices: Invoice[] = [
      {
        id: '1', clientId: '1', number: 'INV-2026-040', 
        issueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ id: 'i1', description: 'Web Design', quantity: 1, rate: 1500 }], status: 'Paid', notes: ''
      },
      {
        id: '2', clientId: '2', number: 'INV-2026-041', 
        issueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ id: 'i2', description: 'Consulting', quantity: 10, rate: 200 }], status: 'Overdue', notes: ''
      },
      {
        id: '3', clientId: '3', number: 'INV-2026-042', 
        issueDate: now.toISOString().split('T')[0], 
        dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ id: 'i3', description: 'SEO Audit', quantity: 1, rate: 800 }], status: 'Pending', notes: ''
      },
      {
        id: '4', clientId: '4', number: 'INV-2026-043', 
        issueDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ id: 'i4', description: 'Hosting', quantity: 1, rate: 1200 }], status: 'Paid', notes: ''
      },
      {
        id: '5', clientId: '1', number: 'INV-2026-044', 
        issueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ id: 'i5', description: 'Consulting', quantity: 5, rate: 200 }], status: 'Pending', notes: ''
      }
    ];

    // Expenses
    const mockExpenses: Expense[] = [
      { id: 'e1', payeeName: 'AWS', description: 'Server Hosting', amount: 350, category: 'Other', status: 'Paid', date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e2', payeeName: 'Adobe', description: 'Creative Cloud', amount: 55, category: 'Other', status: 'Paid', date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'e3', payeeName: 'Upwork', description: 'Freelance Dev', amount: 800, category: 'Outsourced', status: 'Paid', date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    // Notifications
    const mockNotifications: AppNotification[] = [
      { id: 'n1', title: 'Payment Received', message: 'Globex Inc paid INV-2026-040 (₨ 1,500)', type: 'success', isRead: false, date: new Date(now.getTime() - 1000 * 60 * 5).toISOString(), link: '/invoices' },
      { id: 'n2', title: 'Invoice Overdue', message: 'INV-2026-041 for Soylent Corp is 5 days overdue.', type: 'warning', isRead: false, date: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), link: '/invoices' },
      { id: 'n3', title: 'New Client', message: 'Umbrella Corp was added to the system.', type: 'info', isRead: true, date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10).toISOString(), link: '/clients' }
    ];

    setClients(mockClients);
    setProducts(mockProducts);
    setInvoices(mockInvoices);
    setExpenses(mockExpenses);
    setNotifications(mockNotifications);
  };

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <AppDataContext.Provider value={{ 
      clients, invoices, settings, products, expenses, notifications,
      addClient, updateClient, addInvoice, updateInvoice, updateOrderStatus, updateSettings,
      addProduct, updateProduct, addExpense, updateExpense, 
      markNotificationRead, clearNotifications, seedMockData
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
