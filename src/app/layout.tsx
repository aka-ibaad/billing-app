import Navigation from '@/components/Navigation';
import GlobalSearch from '@/components/GlobalSearch';
import { AppDataProvider } from '@/context/AppDataContext';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bespoke Billing',
  description: 'High-end billing application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppDataProvider>
          <div className="app-layout">
            <Navigation />
            <main className="main-content">
              <div style={{ padding: '0 2rem', paddingTop: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
                <GlobalSearch />
              </div>
              {children}
            </main>
          </div>
        </AppDataProvider>
      </body>
    </html>
  );
}
