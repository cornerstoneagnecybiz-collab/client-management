// src/app/(dashboard)/dashboard/kpi-strip.tsx
import type { DashboardData } from './_lib/types';
import { KpiTile } from './kpi-tile';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function KpiStrip({ data }: { data: DashboardData }) {
  const { toCollect, toPay, net } = data.pendingCash;
  return (
    <div className="flex flex-col gap-3.5">
      <KpiTile
        label="MTD revenue"
        value={formatINR(data.mtdRevenue.value)}
        deltaPct={data.mtdRevenue.deltaPct}
        sparkline={data.mtdRevenue.sparkline}
        accentColor="emerald"
      />
      <KpiTile
        label="MTD profit"
        value={formatINR(data.mtdProfit.value)}
        deltaPct={data.mtdProfit.deltaPct}
        sparkline={data.mtdProfit.sparkline}
        accentColor="violet"
      />
      <KpiTile
        label="Pending cash position"
        value={formatINR(net)}
        contextLine={`${formatINR(toCollect)} to collect − ${formatINR(toPay)} to pay`}
      />
    </div>
  );
}
