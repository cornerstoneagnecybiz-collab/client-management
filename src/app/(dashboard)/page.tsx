// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';
import { KpiStrip } from './dashboard/kpi-strip';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchDashboardData();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Command center.</p>
      </header>
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-8 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">Chart placeholder</div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <KpiStrip data={data} />
        </div>
      </div>
    </div>
  );
}
