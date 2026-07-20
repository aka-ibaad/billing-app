import Navigation from '@/components/Navigation';
import TopBar from '@/components/TopBar';
import { AppDataProvider } from '@/context/AppDataContext';
import { ThemeProvider } from '@/context/ThemeContext';
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('billing_theme');
                  var theme = stored || 'system';
                  if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AppDataProvider>
            <div className="app-layout">
              <Navigation />
              <main className="main-content">
                <div style={{ padding: '0 var(--space-8)', maxWidth: '1400px', margin: '0 auto' }}>
                  <TopBar />
                </div>
                {children}
              </main>
            </div>
          </AppDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
