import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchDashboardData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">New dashboard — raw data dump for verification.</p>
      </div>
      <pre className="glass-card rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
