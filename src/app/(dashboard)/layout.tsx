import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SIDEBAR_WIDTH } from '@/components/layout/sidebar';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />
      <main
        className="min-h-[calc(100vh-3.5rem)] flex-1 p-6"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        {children}
      </main>
    </div>
  );
}
