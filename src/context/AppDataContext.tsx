'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Client = {
  id: string;
  name: string;
  email: string;
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
  dueDate: string;
  items: LineItem[];
  status: 'Draft' | 'Pending' | 'Paid' | 'Overdue';
  notes: string;
  taxes?: Tax[];
  discount?: Discount;
  format?: 'horizontal' | 'vertical';
};

export type Settings = {
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  defaultTaxes: Tax[];
  logoUrl?: string;
  headerText?: string;
  ntnNumber?: string;
  footerText?: string;
};

type AppDataContextType = {
  clients: Client[];
  invoices: Invoice[];
  settings: Settings;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  updateSettings: (data: Partial<Settings>) => void;
};

const defaultSettings: Settings = {
  businessName: 'Acme Corp',
  businessAddress: '123 Business Rd, Tech City, TC 10101',
  businessEmail: 'hello@acme.corp',
  defaultTaxes: [],
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedClients = localStorage.getItem('billing_clients');
    const storedInvoices = localStorage.getItem('billing_invoices');
    const storedSettings = localStorage.getItem('billing_settings');

    if (storedClients) setClients(JSON.parse(storedClients));
    if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
    if (storedSettings) setSettings(JSON.parse(storedSettings));
    
    // Fallback mock data if empty
    if (!storedClients && !storedInvoices) {
      setClients([
        { id: '1', name: 'Globex Inc', email: 'billing@globex.com', address: '100 Globe Way', createdAt: new Date().toISOString() },
        { id: '2', name: 'Soylent Corp', email: 'accounts@soylent.com', address: '200 Soy St', createdAt: new Date().toISOString() }
      ]);
      setInvoices([
        {
          id: '1', clientId: '1', number: 'INV-2026-040', issueDate: '2026-10-01', dueDate: '2026-10-15',
          items: [{ id: 'i1', description: 'Web Design', quantity: 1, rate: 1200 }], status: 'Paid', notes: ''
        },
        {
          id: '2', clientId: '2', number: 'INV-2026-039', issueDate: '2026-09-15', dueDate: '2026-09-30',
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
    }
  }, [clients, invoices, settings, isLoaded]);

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

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <AppDataContext.Provider value={{ clients, invoices, settings, addClient, updateClient, addInvoice, updateInvoice, updateSettings }}>
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
