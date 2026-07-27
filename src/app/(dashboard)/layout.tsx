import Navigation from '@/components/Navigation';
import TopBar from '@/components/TopBar';
import CommandPalette from '@/components/CommandPalette';
import NotificationCenter from '@/components/NotificationCenter';
import FloatingQuickCreate from '@/components/FloatingQuickCreate';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CommandPalette />
      <NotificationCenter />
      <FloatingQuickCreate />
      <div className="app-layout">
        <Navigation />
        <main className="main-content">
          <div style={{ width: '100%', padding: '0 var(--space-8)', maxWidth: '1800px', margin: '0 auto' }}>
            <TopBar />
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
