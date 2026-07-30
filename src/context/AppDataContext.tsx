'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Capacitor } from '@capacitor/core';

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
  // Separate from logoUrl on purpose: logoUrl is the business's brand mark
  // (shown in the sidebar's top header and printed on invoices).
  // avatarUrl is the signed-in user's own picture, shown on the admin
  // card at the bottom of the sidebar — the two will diverge as soon as
  // the app supports more than one user per business.
  avatarUrl?: string;
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
  // Drives the plan badge on the sidebar's admin card (see Navigation.tsx).
  // Defaults to 'free' below so the badge always has a real value to
  // render rather than being hardcoded — once a real upgrade flow exists,
  // it can just call updateSettings({ plan: 'pro' }).
  plan?: 'free' | 'pro';
};

export type Product = {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
  // Stock tracking is opt-in per product (trackStock defaults to false) —
  // most shopkeepers using this for a services catalogue have no use for
  // quantities, so the field only shows up in the UI once turned on.
  trackStock?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
};

export type Expense = {
  id: string;
  payeeName: string;
  description: string;
  amount: number;
  category: 'Materials' | 'Outsourced' | 'Other';
  status: 'Paid' | 'Unpaid';
  date: string;
  // Storage *path* inside the private "receipts" bucket, not a public URL —
  // resolve it to a viewable link on demand via getReceiptUrl(), since the
  // bucket isn't public and a stored signed URL would eventually expire.
  receiptPath?: string;
};

export type TimeEntry = {
  id: string;
  clientId?: string;
  description: string;
  date: string;
  minutes: number;
  billable: boolean;
  rate: number;
  invoiced: boolean;
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
  // True when running inside the native Capacitor mobile shell. The mobile
  // app is view-only by design (see MOBILE_READ_ONLY_MESSAGE below) — every
  // mutating function below throws if called while this is true, and pages
  // use this flag to hide the buttons/forms that would call them in the
  // first place.
  isReadOnly: boolean;
  clients: Client[];
  invoices: Invoice[];
  settings: Settings;
  products: Product[];
  expenses: Expense[];
  notifications: AppNotification[];
  timeEntries: TimeEntry[];
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: Invoice['orderStatus']) => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustProductStock: (id: string, delta: number) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  uploadReceipt: (file: File) => Promise<string>;
  getReceiptUrl: (path: string) => Promise<string | null>;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;
  updateTimeEntry: (id: string, data: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  seedMockData: () => Promise<void>;
  monthlyRevenueGoal: number;
  setMonthlyRevenueGoal: (value: number) => Promise<void>;
  refreshFromStorage: () => Promise<void>;
};

const defaultSettings: Settings = {
  businessName: '',
  businessAddress: '',
  businessEmail: '',
  defaultTaxes: [],
  enableWatermark: false,
  watermarkOpacity: 5,
  watermarkSize: 'Large',
  watermarkPosition: 'Center',
  watermarkCustomX: 50,
  watermarkCustomY: 50,
  watermarkRotation: 0,
  plan: 'free',
};

// ==========================================
// Row <-> app-type mapping
// ==========================================
// Supabase/Postgres columns are snake_case; every app type above is
// camelCase. These are the only places that translation happens, so the
// rest of the app (every page/component reading from context) never has to
// know the database's column names.

function mapClientRow(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || undefined,
    address: row.address || '',
    createdAt: row.created_at,
  };
}

function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    defaultRate: Number(row.price) || 0,
    trackStock: row.track_stock || false,
    stockQuantity: row.stock_quantity != null ? Number(row.stock_quantity) : 0,
    lowStockThreshold: row.low_stock_threshold != null ? Number(row.low_stock_threshold) : undefined,
  };
}

function mapExpenseRow(row: any): Expense {
  return {
    id: row.id,
    payeeName: row.payee_name || '',
    description: row.description || '',
    amount: Number(row.amount) || 0,
    category: row.category || 'Other',
    status: row.status || 'Unpaid',
    date: row.date,
    receiptPath: row.receipt_url || undefined,
  };
}

function mapTimeEntryRow(row: any): TimeEntry {
  return {
    id: row.id,
    clientId: row.client_id || undefined,
    description: row.description || '',
    date: row.date,
    minutes: Number(row.minutes) || 0,
    billable: row.billable ?? true,
    rate: Number(row.rate) || 0,
    invoiced: row.invoiced || false,
  };
}

function mapInvoiceRow(row: any): Invoice {
  return {
    id: row.id,
    clientId: row.client_id,
    number: row.invoice_number,
    issueDate: row.issue_date,
    issueTime: row.issue_time || undefined,
    dueDate: row.due_date,
    items: (row.invoice_items || []).map((it: any) => ({
      id: it.id,
      description: it.description,
      quantity: Number(it.quantity),
      rate: Number(it.unit_price),
    })),
    status: row.status,
    notes: row.notes || '',
    taxes: row.taxes || [],
    discount: row.discount_type ? { type: row.discount_type, value: Number(row.discount_value) || 0 } : undefined,
    format: row.format || 'horizontal',
    documentType: row.document_type || 'invoice',
    paymentStatus: row.payment_status || undefined,
    advanceAmountPaid: row.advance_amount_paid != null ? Number(row.advance_amount_paid) : undefined,
    expectedReadyDate: row.expected_ready_date || undefined,
    expectedReadyTime: row.expected_ready_time || undefined,
    orderStatus: row.order_status || 'Pending',
  };
}

function mapSettingsRow(row: any): Settings {
  return {
    businessName: row.business_name || '',
    businessAddress: row.business_address || '',
    businessEmail: row.business_email || '',
    defaultTaxes: row.default_taxes || [],
    logoUrl: row.logo_url || undefined,
    avatarUrl: row.avatar_url || undefined,
    headerText: row.header_text || undefined,
    ntnNumber: row.ntn_number || undefined,
    phone: row.phone || undefined,
    website: row.website || undefined,
    footerText: row.footer_text || undefined,
    signatureUrl: row.signature_url || undefined,
    watermarkText: row.watermark_text || undefined,
    letterheadUrl: row.letterhead_url || undefined,
    enableWatermark: row.enable_watermark || false,
    watermarkOpacity: row.watermark_opacity ?? 5,
    watermarkSize: row.watermark_size || 'Large',
    watermarkPosition: row.watermark_position || 'Center',
    watermarkCustomX: row.watermark_custom_x ?? 50,
    watermarkCustomY: row.watermark_custom_y ?? 50,
    watermarkRotation: row.watermark_rotation ?? 0,
    plan: row.plan || 'free',
  };
}

function mapNotificationRow(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    date: row.created_at,
    link: row.link || undefined,
  };
}

async function getUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const MOBILE_READ_ONLY_MESSAGE = "This action isn't available in the mobile app. Make changes on desktop or the web app instead.";

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [monthlyRevenueGoal, setMonthlyRevenueGoalState] = useState<number>(1000000);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mobile was made view-only (create/edit/delete disabled), then the user
  // reversed that decision and asked for full read/write on mobile again —
  // same as web. Rather than rip out every `isReadOnly` check across the
  // ~9 files that read it (clients/invoices/products/expenses/settings
  // pages, RevenueGoalWidget, FloatingQuickCreate, CommandPalette,
  // dashboard/page.tsx), this single flag is left in place and forced off.
  // Flipping MOBILE_READ_ONLY_ENABLED back to true (and restoring the
  // `Capacitor.isNativePlatform()` check below) re-enables the whole
  // feature exactly as it was, without redoing any of that UI work.
  const MOBILE_READ_ONLY_ENABLED = false;
  const isReadOnly = MOBILE_READ_ONLY_ENABLED && Capacitor.isNativePlatform();
  const assertNotReadOnly = () => {
    if (isReadOnly) throw new Error(MOBILE_READ_ONLY_MESSAGE);
  };

  // Smart-notification generation below needs to check "have we already
  // notified about this?" against the *current* notification list, but it
  // runs inside an async effect (it inserts into Supabase before updating
  // state), so the setState-functional-updater trick used elsewhere in this
  // file for that same problem doesn't apply — the async insert has to
  // happen before any setState call. A ref kept in sync via its own effect
  // gives the same "always current, never a stale closure" guarantee.
  const notificationsRef = useRef<AppNotification[]>([]);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Pulled out of the mount effect below so a pull-to-refresh gesture (or
  // anything else) can re-fetch from Supabase on demand.
  const fetchAllData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Admin accounts and signed-out visitors don't have merchant business
    // data to load — admin routes never render anything that reads from
    // this context (see admin/layout.tsx), so this just leaves the
    // defaults in place for them.
    if (!user || user.app_metadata?.role === 'admin') {
      setIsLoaded(true);
      return;
    }

    try {
      const [clientsRes, productsRes, invoicesRes, expensesRes, settingsRes, notificationsRes, timeEntriesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('merchant_id', user.id).order('name', { ascending: true }),
        supabase.from('invoices').select('*, invoice_items(*)').eq('merchant_id', user.id).order('issue_date', { ascending: false }),
        supabase.from('expenses').select('*').eq('merchant_id', user.id).order('date', { ascending: false }),
        supabase.from('settings').select('*').eq('merchant_id', user.id).maybeSingle(),
        supabase.from('notifications').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').eq('merchant_id', user.id).order('date', { ascending: false }),
      ]);

      if (clientsRes.error) console.error('Failed to load clients:', clientsRes.error);
      else setClients((clientsRes.data || []).map(mapClientRow));

      if (productsRes.error) console.error('Failed to load products:', productsRes.error);
      else setProducts((productsRes.data || []).map(mapProductRow));

      if (invoicesRes.error) console.error('Failed to load invoices:', invoicesRes.error);
      else setInvoices((invoicesRes.data || []).map(mapInvoiceRow));

      if (expensesRes.error) console.error('Failed to load expenses:', expensesRes.error);
      else setExpenses((expensesRes.data || []).map(mapExpenseRow));

      if (notificationsRes.error) console.error('Failed to load notifications:', notificationsRes.error);
      else setNotifications((notificationsRes.data || []).map(mapNotificationRow));

      // time_entries only exists after migration 003 has been run — a
      // missing-table error here is expected until then, so this doesn't
      // block the rest of the app's data from loading.
      if (timeEntriesRes.error) console.error('Failed to load time entries (has migration 003 been run?):', timeEntriesRes.error);
      else setTimeEntries((timeEntriesRes.data || []).map(mapTimeEntryRow));

      if (settingsRes.error) {
        console.error('Failed to load settings:', settingsRes.error);
      } else if (settingsRes.data) {
        setSettings(mapSettingsRow(settingsRes.data));
        setMonthlyRevenueGoalState(Number(settingsRes.data.monthly_revenue_goal ?? 1000000));
      } else {
        // No settings row yet — either the DB trigger that creates one on
        // signup hasn't been applied (account predates the migration), or
        // this is the very first load after signup and it hasn't landed
        // yet. Create one now so every later updateSettings() call has a
        // row to upsert against, seeding the business name from signup
        // metadata the same way the old localStorage path used to.
        const seeded = {
          merchant_id: user.id,
          business_name: user.user_metadata?.company_name || '',
          business_email: user.email || '',
        };
        const { data: created, error: createError } = await supabase
          .from('settings')
          .upsert(seeded, { onConflict: 'merchant_id' })
          .select()
          .single();
        if (createError) console.error('Failed to create default settings row:', createError);
        else setSettings(mapSettingsRow(created));
      }
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Smart Notifications logic — generates "due today / due tomorrow /
  // overdue" notifications from invoice ready dates and persists them to
  // Supabase (previously this only ever touched local state).
  useEffect(() => {
    if (!isLoaded) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const run = async () => {
      const supabase = createClient();
      const userId = await getUserId(supabase).catch(() => null);
      if (!userId) return;

      const toInsert: AppNotification[] = [];

      invoices.forEach(inv => {
        if (!inv.expectedReadyDate) return;
        if (inv.orderStatus === 'Delivered' || inv.orderStatus === 'Cancelled') return;

        const readyDate = inv.expectedReadyDate;
        const idPrefix = `smart-${inv.id}`;

        const exists = notificationsRef.current.some(n => n.id.startsWith(idPrefix) && n.title.includes(inv.number));
        if (exists) return;

        // There's no per-invoice detail route (only the /dashboard/invoices
        // list), so these link to the list rather than a dead /invoices/:id
        // page.
        if (readyDate === todayStr) {
          toInsert.push({
            id: `${idPrefix}-today-${Date.now()}`,
            title: 'Order Due Today',
            message: `Order ${inv.number} is due today at ${inv.expectedReadyTime || 'any time'}.`,
            type: 'warning', isRead: false, date: now.toISOString(), link: '/dashboard/invoices',
          });
        } else if (readyDate === tomorrowStr) {
          toInsert.push({
            id: `${idPrefix}-tmrw-${Date.now()}`,
            title: 'Order Due Tomorrow',
            message: `Reminder: Order ${inv.number} is due tomorrow.`,
            type: 'info', isRead: false, date: now.toISOString(), link: '/dashboard/invoices',
          });
        } else if (readyDate < todayStr) {
          toInsert.push({
            id: `${idPrefix}-overdue-${Date.now()}`,
            title: 'Order Overdue',
            message: `Order ${inv.number} was due on ${readyDate} and is not delivered yet.`,
            type: 'error', isRead: false, date: now.toISOString(), link: '/dashboard/invoices',
          });
        }
      });

      if (toInsert.length === 0) return;

      const { error } = await supabase.from('notifications').insert(
        toInsert.map(n => ({ id: n.id, merchant_id: userId, title: n.title, message: n.message, type: n.type, is_read: n.isRead, link: n.link }))
      );
      if (error) {
        console.error('Failed to persist smart notifications:', error);
        return;
      }
      setNotifications(prev => [...toInsert, ...prev]);
    };

    run();
  }, [invoices, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================
  // Clients
  // ==========================================
  const addClient = async (data: Omit<Client, 'id' | 'createdAt'>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { data: row, error } = await supabase
      .from('clients')
      .insert({ merchant_id: userId, name: data.name, email: data.email || null, phone: data.phone || null, address: data.address || null })
      .select()
      .single();
    if (error || !row) { console.error('addClient failed:', error); throw error; }
    setClients(prev => [mapClientRow(row), ...prev]);
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.address !== undefined) patch.address = data.address;
    const { error } = await supabase.from('clients').update(patch).eq('id', id);
    if (error) { console.error('updateClient failed:', error); throw error; }
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteClient = async (id: string) => {
    assertNotReadOnly();
    const supabase = createClient();
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error('deleteClient failed:', error); throw error; }
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // ==========================================
  // Invoices (+ line items)
  // ==========================================
  const computeInvoiceTotals = (inv: { items: LineItem[]; discount?: Discount; taxes?: Tax[] }) => {
    const subtotal = inv.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const discountAmount = inv.discount?.type === 'percentage' ? subtotal * ((inv.discount?.value || 0) / 100) : (inv.discount?.value || 0);
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const totalTax = (inv.taxes || []).reduce((s, t) => s + afterDiscount * (t.rate / 100), 0);
    return { subtotal, total: afterDiscount + totalTax };
  };

  const addInvoice = async (data: Omit<Invoice, 'id'>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { subtotal, total } = computeInvoiceTotals(data);

    const { data: row, error } = await supabase.from('invoices').insert({
      merchant_id: userId,
      client_id: data.clientId,
      invoice_number: data.number,
      status: data.status,
      issue_date: data.issueDate,
      issue_time: data.issueTime || null,
      due_date: data.dueDate,
      subtotal,
      total,
      notes: data.notes || null,
      taxes: data.taxes || [],
      discount_type: data.discount?.type || null,
      discount_value: data.discount?.value ?? null,
      format: data.format || 'horizontal',
      document_type: data.documentType || 'invoice',
      payment_status: data.paymentStatus || null,
      advance_amount_paid: data.advanceAmountPaid ?? null,
      expected_ready_date: data.expectedReadyDate || null,
      expected_ready_time: data.expectedReadyTime || null,
      order_status: data.orderStatus || 'Pending',
    }).select().single();

    if (error || !row) { console.error('addInvoice failed:', error); throw error; }

    let insertedItems: any[] = [];
    if (data.items.length > 0) {
      const { data: itemRows, error: itemsError } = await supabase.from('invoice_items').insert(
        data.items.map(item => ({
          invoice_id: row.id,
          merchant_id: userId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.rate,
          total: item.quantity * item.rate,
        }))
      ).select();
      if (itemsError) console.error('addInvoice: failed to insert line items:', itemsError);
      else insertedItems = itemRows || [];
    }

    setInvoices(prev => [mapInvoiceRow({ ...row, invoice_items: insertedItems }), ...prev]);
  };

  const updateInvoice = async (id: string, data: Partial<Invoice>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.clientId !== undefined) patch.client_id = data.clientId;
    if (data.number !== undefined) patch.invoice_number = data.number;
    if (data.status !== undefined) patch.status = data.status;
    if (data.issueDate !== undefined) patch.issue_date = data.issueDate;
    if (data.issueTime !== undefined) patch.issue_time = data.issueTime;
    if (data.dueDate !== undefined) patch.due_date = data.dueDate;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.taxes !== undefined) patch.taxes = data.taxes;
    if (data.discount !== undefined) {
      patch.discount_type = data.discount?.type ?? null;
      patch.discount_value = data.discount?.value ?? null;
    }
    if (data.format !== undefined) patch.format = data.format;
    if (data.documentType !== undefined) patch.document_type = data.documentType;
    if (data.paymentStatus !== undefined) patch.payment_status = data.paymentStatus;
    if (data.advanceAmountPaid !== undefined) patch.advance_amount_paid = data.advanceAmountPaid;
    if (data.expectedReadyDate !== undefined) patch.expected_ready_date = data.expectedReadyDate;
    if (data.expectedReadyTime !== undefined) patch.expected_ready_time = data.expectedReadyTime;
    if (data.orderStatus !== undefined) patch.order_status = data.orderStatus;

    // Recompute subtotal/total whenever anything money-related changed, so
    // the stored totals never drift from what the app actually displays.
    const current = invoices.find(i => i.id === id);
    if (current) {
      const merged = { ...current, ...data };
      const { subtotal, total } = computeInvoiceTotals(merged);
      patch.subtotal = subtotal;
      patch.total = total;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('invoices').update(patch).eq('id', id);
      if (error) { console.error('updateInvoice failed:', error); throw error; }
    }

    if (data.items) {
      const userId = await getUserId(supabase);
      // Full replace rather than diffing — line items have no independent
      // identity outside their invoice, so this is simpler and just as
      // correct as trying to reconcile adds/edits/removals individually.
      const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id);
      if (deleteError) console.error('updateInvoice: failed to clear old line items:', deleteError);
      if (data.items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          data.items.map(item => ({
            invoice_id: id,
            merchant_id: userId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.rate,
            total: item.quantity * item.rate,
          }))
        );
        if (itemsError) console.error('updateInvoice: failed to write new line items:', itemsError);
      }
    }

    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  };

  const deleteInvoice = async (id: string) => {
    assertNotReadOnly();
    const supabase = createClient();
    // invoice_items has ON DELETE CASCADE on invoice_id, so this takes the
    // line items with it.
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) { console.error('deleteInvoice failed:', error); throw error; }
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const updateOrderStatus = async (id: string, status: Invoice['orderStatus']) => {
    assertNotReadOnly();
    const supabase = createClient();
    const { error } = await supabase.from('invoices').update({ order_status: status }).eq('id', id);
    if (error) { console.error('updateOrderStatus failed:', error); throw error; }
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, orderStatus: status } : i));
  };

  // ==========================================
  // Settings
  // ==========================================
  const updateSettings = async (data: Partial<Settings>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const patch: Record<string, unknown> = { merchant_id: userId };
    if (data.businessName !== undefined) patch.business_name = data.businessName;
    if (data.businessEmail !== undefined) patch.business_email = data.businessEmail;
    if (data.businessAddress !== undefined) patch.business_address = data.businessAddress;
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl || null;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl || null;
    if (data.headerText !== undefined) patch.header_text = data.headerText || null;
    if (data.ntnNumber !== undefined) patch.ntn_number = data.ntnNumber || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.website !== undefined) patch.website = data.website || null;
    if (data.footerText !== undefined) patch.footer_text = data.footerText || null;
    if (data.signatureUrl !== undefined) patch.signature_url = data.signatureUrl || null;
    if (data.watermarkText !== undefined) patch.watermark_text = data.watermarkText || null;
    if (data.letterheadUrl !== undefined) patch.letterhead_url = data.letterheadUrl || null;
    if (data.defaultTaxes !== undefined) patch.default_taxes = data.defaultTaxes;
    if (data.enableWatermark !== undefined) patch.enable_watermark = data.enableWatermark;
    if (data.watermarkOpacity !== undefined) patch.watermark_opacity = data.watermarkOpacity;
    if (data.watermarkSize !== undefined) patch.watermark_size = data.watermarkSize;
    if (data.watermarkPosition !== undefined) patch.watermark_position = data.watermarkPosition;
    if (data.watermarkCustomX !== undefined) patch.watermark_custom_x = data.watermarkCustomX;
    if (data.watermarkCustomY !== undefined) patch.watermark_custom_y = data.watermarkCustomY;
    if (data.watermarkRotation !== undefined) patch.watermark_rotation = data.watermarkRotation;
    if (data.plan !== undefined) patch.plan = data.plan;

    const { error } = await supabase.from('settings').upsert(patch, { onConflict: 'merchant_id' });
    if (error) { console.error('updateSettings failed:', error); throw error; }
    setSettings(prev => ({ ...prev, ...data }));
  };

  const setMonthlyRevenueGoal = async (value: number) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { error } = await supabase.from('settings').upsert({ merchant_id: userId, monthly_revenue_goal: value }, { onConflict: 'merchant_id' });
    if (error) { console.error('setMonthlyRevenueGoal failed:', error); throw error; }
    setMonthlyRevenueGoalState(value);
  };

  // ==========================================
  // Products
  // ==========================================
  const addProduct = async (data: Omit<Product, 'id'>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { data: row, error } = await supabase
      .from('products')
      .insert({
        merchant_id: userId,
        name: data.name,
        description: data.description || null,
        price: data.defaultRate,
        track_stock: data.trackStock || false,
        stock_quantity: data.stockQuantity ?? 0,
        low_stock_threshold: data.lowStockThreshold ?? null,
      })
      .select()
      .single();
    if (error || !row) { console.error('addProduct failed:', error); throw error; }
    setProducts(prev => [...prev, mapProductRow(row)]);
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.defaultRate !== undefined) patch.price = data.defaultRate;
    if (data.trackStock !== undefined) patch.track_stock = data.trackStock;
    if (data.stockQuantity !== undefined) patch.stock_quantity = data.stockQuantity;
    if (data.lowStockThreshold !== undefined) patch.low_stock_threshold = data.lowStockThreshold;
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) { console.error('updateProduct failed:', error); throw error; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deleteProduct = async (id: string) => {
    assertNotReadOnly();
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { console.error('deleteProduct failed:', error); throw error; }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Manual stock adjustment (+/- from the Products page). Deliberately not
  // wired into invoice creation automatically — auto-decrementing stock
  // when an invoice is saved (and re-crediting it on delete/edit) has real
  // edge cases around drafts, quotations, and edited quantities that need
  // its own careful design rather than being bolted on silently here.
  const adjustProductStock = async (id: string, delta: number) => {
    assertNotReadOnly();
    const product = products.find(p => p.id === id);
    if (!product) return;
    const nextQuantity = Math.max(0, (product.stockQuantity || 0) + delta);
    await updateProduct(id, { stockQuantity: nextQuantity });
  };

  // ==========================================
  // Expenses
  // ==========================================
  const addExpense = async (data: Omit<Expense, 'id'>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { data: row, error } = await supabase
      .from('expenses')
      .insert({ merchant_id: userId, payee_name: data.payeeName, description: data.description || null, amount: data.amount, category: data.category, status: data.status, date: data.date, receipt_url: data.receiptPath || null })
      .select()
      .single();
    if (error || !row) { console.error('addExpense failed:', error); throw error; }
    setExpenses(prev => [mapExpenseRow(row), ...prev]);
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.payeeName !== undefined) patch.payee_name = data.payeeName;
    if (data.description !== undefined) patch.description = data.description;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.category !== undefined) patch.category = data.category;
    if (data.status !== undefined) patch.status = data.status;
    if (data.date !== undefined) patch.date = data.date;
    if (data.receiptPath !== undefined) patch.receipt_url = data.receiptPath || null;
    const { error } = await supabase.from('expenses').update(patch).eq('id', id);
    if (error) { console.error('updateExpense failed:', error); throw error; }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteExpense = async (id: string) => {
    assertNotReadOnly();
    const supabase = createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('deleteExpense failed:', error); throw error; }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ==========================================
  // Receipt photo uploads (Supabase Storage — private "receipts" bucket,
  // created by supabase_migration_003_stock_time_receipts.sql)
  // ==========================================
  const uploadReceipt = async (file: File): Promise<string> => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const ext = file.name.split('.').pop() || 'jpg';
    // Path prefixed with the merchant's own user id — this is exactly what
    // the storage RLS policy checks against, same scoping principle as
    // every table's `auth.uid() = merchant_id`.
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false });
    if (error) { console.error('uploadReceipt failed:', error); throw error; }
    return path;
  };

  // The bucket is private, so what's stored on an expense is a path, not a
  // usable link — pages call this to get a fresh temporary signed URL
  // whenever they actually need to display or open the receipt.
  const getReceiptUrl = async (path: string): Promise<string | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 60);
    if (error) { console.error('getReceiptUrl failed:', error); return null; }
    return data?.signedUrl || null;
  };

  // ==========================================
  // Time entries
  // ==========================================
  const addTimeEntry = async (data: Omit<TimeEntry, 'id'>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { data: row, error } = await supabase
      .from('time_entries')
      .insert({ merchant_id: userId, client_id: data.clientId || null, description: data.description || null, date: data.date, minutes: data.minutes, billable: data.billable, rate: data.rate, invoiced: data.invoiced || false })
      .select()
      .single();
    if (error || !row) { console.error('addTimeEntry failed (has migration 003 been run?):', error); throw error; }
    setTimeEntries(prev => [mapTimeEntryRow(row), ...prev]);
  };

  const updateTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
    assertNotReadOnly();
    const supabase = createClient();
    const patch: Record<string, unknown> = {};
    if (data.clientId !== undefined) patch.client_id = data.clientId || null;
    if (data.description !== undefined) patch.description = data.description;
    if (data.date !== undefined) patch.date = data.date;
    if (data.minutes !== undefined) patch.minutes = data.minutes;
    if (data.billable !== undefined) patch.billable = data.billable;
    if (data.rate !== undefined) patch.rate = data.rate;
    if (data.invoiced !== undefined) patch.invoiced = data.invoiced;
    const { error } = await supabase.from('time_entries').update(patch).eq('id', id);
    if (error) { console.error('updateTimeEntry failed:', error); throw error; }
    setTimeEntries(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTimeEntry = async (id: string) => {
    assertNotReadOnly();
    const supabase = createClient();
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) { console.error('deleteTimeEntry failed:', error); throw error; }
    setTimeEntries(prev => prev.filter(t => t.id !== id));
  };

  // ==========================================
  // Notifications
  // ==========================================
  const markNotificationRead = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error('markNotificationRead failed:', error);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifications = async () => {
    const supabase = createClient();
    const userId = await getUserId(supabase);
    const { error } = await supabase.from('notifications').delete().eq('merchant_id', userId);
    if (error) console.error('clearNotifications failed:', error);
    setNotifications([]);
  };

  // ==========================================
  // Demo data — explicit opt-in only (Settings > Developer & Testing).
  // Inserts real rows through the same functions above rather than
  // duplicating insert logic, so seeded data behaves identically to
  // anything a merchant enters by hand.
  // ==========================================
  const seedMockData = async () => {
    assertNotReadOnly();
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const supabase = createClient();
    const userId = await getUserId(supabase);

    const clientDefs = [
      { name: 'Globex Inc', email: 'billing@globex.com', address: '100 Globe Way' },
      { name: 'Soylent Corp', email: 'accounts@soylent.com', address: '200 Soy St' },
      { name: 'Initech', email: 'finance@initech.com', address: '300 Tech Park' },
      { name: 'Umbrella Corp', email: 'admin@umbrella.com', address: 'Raccoon City' },
    ];
    const createdClients: Client[] = [];
    for (const c of clientDefs) {
      const { data: row, error } = await supabase.from('clients').insert({ merchant_id: userId, ...c }).select().single();
      if (error || !row) { console.error('seedMockData: client insert failed:', error); continue; }
      createdClients.push(mapClientRow(row));
    }
    setClients(prev => [...createdClients, ...prev]);
    const clientId = (name: string) => createdClients.find(c => c.name === name)?.id || createdClients[0]?.id;

    const productDefs = [
      { name: 'Web Design', description: 'Custom website design', price: 1500 },
      { name: 'Consulting', description: 'Hourly consultation', price: 200 },
      { name: 'SEO Audit', description: 'Full site SEO audit', price: 800 },
      { name: 'Hosting', description: 'Annual cloud hosting', price: 1200 },
    ];
    const createdProducts: Product[] = [];
    for (const p of productDefs) {
      const { data: row, error } = await supabase.from('products').insert({ merchant_id: userId, ...p }).select().single();
      if (error || !row) { console.error('seedMockData: product insert failed:', error); continue; }
      createdProducts.push(mapProductRow(row));
    }
    setProducts(prev => [...prev, ...createdProducts]);

    const invoiceDefs: Omit<Invoice, 'id'>[] = [
      { clientId: clientId('Globex Inc'), number: 'INV-2026-040', issueDate: daysAgo(5), dueDate: daysAgo(1), items: [{ id: 'i1', description: 'Web Design', quantity: 1, rate: 1500 }], status: 'Paid', notes: '' },
      { clientId: clientId('Soylent Corp'), number: 'INV-2026-041', issueDate: daysAgo(15), dueDate: daysAgo(5), items: [{ id: 'i2', description: 'Consulting', quantity: 10, rate: 200 }], status: 'Overdue', notes: '' },
      { clientId: clientId('Initech'), number: 'INV-2026-042', issueDate: daysAgo(0), dueDate: daysFromNow(10), items: [{ id: 'i3', description: 'SEO Audit', quantity: 1, rate: 800 }], status: 'Pending', notes: '' },
      { clientId: clientId('Umbrella Corp'), number: 'INV-2026-043', issueDate: daysAgo(25), dueDate: daysAgo(10), items: [{ id: 'i4', description: 'Hosting', quantity: 1, rate: 1200 }], status: 'Paid', notes: '' },
      { clientId: clientId('Globex Inc'), number: 'INV-2026-044', issueDate: daysAgo(2), dueDate: daysFromNow(5), items: [{ id: 'i5', description: 'Consulting', quantity: 5, rate: 200 }], status: 'Pending', notes: '' },
    ];
    for (const inv of invoiceDefs) {
      await addInvoice(inv);
    }

    const expenseDefs: Omit<Expense, 'id'>[] = [
      { payeeName: 'AWS', description: 'Server Hosting', amount: 350, category: 'Other', status: 'Paid', date: daysAgo(3) },
      { payeeName: 'Adobe', description: 'Creative Cloud', amount: 55, category: 'Other', status: 'Paid', date: daysAgo(12) },
      { payeeName: 'Upwork', description: 'Freelance Dev', amount: 800, category: 'Outsourced', status: 'Paid', date: daysAgo(20) },
    ];
    for (const e of expenseDefs) {
      await addExpense(e);
    }
  };

  if (!isLoaded) {
    // Lightweight skeleton shell instead of a blank flash while the first
    // Supabase fetch resolves.
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '10px',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-accent, #2563eb)',
          animation: 'app-loading-pulse 1s ease-in-out infinite',
        }} />
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-accent, #2563eb)',
          animation: 'app-loading-pulse 1s ease-in-out 0.15s infinite',
        }} />
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-accent, #2563eb)',
          animation: 'app-loading-pulse 1s ease-in-out 0.3s infinite',
        }} />
        <style>{`@keyframes app-loading-pulse { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    );
  }

  return (
    <AppDataContext.Provider value={{
      isReadOnly,
      clients, invoices, settings, products, expenses, notifications, timeEntries,
      addClient, updateClient, deleteClient,
      addInvoice, updateInvoice, deleteInvoice, updateOrderStatus, updateSettings,
      addProduct, updateProduct, deleteProduct, adjustProductStock,
      addExpense, updateExpense, deleteExpense, uploadReceipt, getReceiptUrl,
      addTimeEntry, updateTimeEntry, deleteTimeEntry,
      markNotificationRead, clearNotifications, seedMockData,
      monthlyRevenueGoal, setMonthlyRevenueGoal,
      refreshFromStorage: fetchAllData,
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
