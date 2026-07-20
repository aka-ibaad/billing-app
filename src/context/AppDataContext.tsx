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

type AppDataContextType = {
  clients: Client[];
  invoices: Invoice[];
  settings: Settings;
  products: Product[];
  expenses: Expense[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  updateSettings: (data: Partial<Settings>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedClients = localStorage.getItem('billing_clients');
    const storedInvoices = localStorage.getItem('billing_invoices');
    const storedSettings = localStorage.getItem('billing_settings');
    const storedProducts = localStorage.getItem('billing_products');
    const storedExpenses = localStorage.getItem('billing_expenses');

    if (storedClients) setClients(JSON.parse(storedClients));
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
    if (storedSettings) setSettings(JSON.parse(storedSettings));
    if (storedProducts) setProducts(JSON.parse(storedProducts));
    if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
    
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

  // Save to localStorage when state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('billing_clients', JSON.stringify(clients));
      localStorage.setItem('billing_invoices', JSON.stringify(invoices));
      localStorage.setItem('billing_settings', JSON.stringify(settings));
      localStorage.setItem('billing_products', JSON.stringify(products));
      localStorage.setItem('billing_expenses', JSON.stringify(expenses));
    }
  }, [clients, invoices, settings, products, expenses, isLoaded]);

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

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <AppDataContext.Provider value={{ 
      clients, invoices, settings, products, expenses, 
      addClient, updateClient, addInvoice, updateInvoice, updateSettings,
      addProduct, updateProduct, addExpense, updateExpense
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
