import Navigation from '@/components/Navigation';
import TopBar from '@/components/TopBar';
import CommandPalette from '@/components/CommandPalette';
import NotificationCenter from '@/components/NotificationCenter';
import FloatingQuickCreate from '@/components/FloatingQuickCreate';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Mirrors src/utils/supabase/middleware.ts's gating for this route tree.
  // That middleware should already keep unauthenticated/unapproved users
  // out, but this layout previously had no auth check of its own — if the
  // middleware ever isn't wired up the way this project expects (its
  // AGENTS.md flags this codebase runs a modified Next.js with different
  // file/routing conventions than usual), every page under /dashboard would
  // render for anyone, logged in or not. This check is cheap and makes the
  // route safe on its own regardless of what the middleware does.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.app_metadata?.role || 'merchant';
  const status = user.app_metadata?.status || 'pending';
  if (role !== 'admin' && status !== 'approved') {
    redirect('/pending');
  }

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
