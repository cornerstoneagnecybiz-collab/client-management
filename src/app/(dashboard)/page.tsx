// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';
import { KpiStrip } from './dashboard/kpi-strip';
import { CashFlowChart } from './dashboard/cash-flow-chart';
import { OnboardingBanner } from './dashboard/onboarding-banner';
import { ActionQueue } from './dashboard/action-queue';
import { PipelinePulse } from './dashboard/pipeline-pulse';
import { InvoiceAging } from './dashboard/invoice-aging';
import { PendingPayouts } from './dashboard/pending-payouts';
import { RecentActivity } from './dashboard/recent-activity';
import { VariancePill } from './dashboard/variance-pill';

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
      {data.nextStep && <OnboardingBanner step={data.nextStep} />}
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-8">
          <CashFlowChart weeks={data.weeks} legendRight={<VariancePill v={data.variance} />} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <KpiStrip data={data} />
        </div>
        <div className="col-span-12 lg:col-span-7">
          <ActionQueue
            collect={data.collect}
            pay={data.pay}
            fulfil={data.fulfil}
            collectCount={data.collectTotalCount}
            payCount={data.payTotalCount}
            fulfilCount={data.fulfilTotalCount}
          />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <PipelinePulse stages={data.funnel} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <InvoiceAging aging={data.aging} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <PendingPayouts items={data.pendingPayoutsTop} />
        </div>
        <div className="col-span-12 md:col-span-12 lg:col-span-3">
          <RecentActivity items={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
