export const syncToSupabase = async (
  userId: string,
  data: {
    clients: any[];
    invoices: any[];
    settings: any;
    products: any[];
    expenses: any[];
  }
) => {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data }),
    });
    
    if (!response.ok) {
      console.error('Failed to sync to Supabase', await response.text());
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
};
