
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { AppDataProvider } from '@/context/AppDataContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Metadata, Viewport } from 'next';
import { Poppins, Oswald } from 'next/font/google';
import './globals.css';

// Poppins/Oswald pairing: Poppins carries body text and UI chrome (labels,
// inputs, buttons) since it stays readable at small sizes; Oswald is
// reserved for headings and other display-weight text (see the h1-h6 and
// .fontHeading rules in globals.css) where its condensed, bold character
// gives the page titles and section headers more visual weight.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bespoke Billing',
  description: 'High-end billing application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Billing',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${oswald.variable}`}>
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
            <ServiceWorkerRegister />
            {children}
          </AppDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
