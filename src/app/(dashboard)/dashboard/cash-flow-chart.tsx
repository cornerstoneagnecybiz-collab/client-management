// src/app/(dashboard)/dashboard/cash-flow-chart.tsx
import Link from 'next/link';
import type { WeekBucket } from './_lib/types';

interface Props {
  weeks: WeekBucket[];
  legendRight?: React.ReactNode;
}

export function CashFlowChart({ weeks, legendRight }: Props) {
  const isEmpty = weeks.every((w) => w.moneyIn === 0 && w.moneyOut === 0);
  const maxVal = Math.max(
    1,
    ...weeks.map((w) => Math.max(w.moneyIn, w.moneyOut)),
  );
  const minProfit = Math.min(0, ...weeks.map((w) => w.profit));
  const maxProfit = Math.max(1, ...weeks.map((w) => w.profit));
  const profitRange = Math.max(1, maxProfit - minProfit);
  const W = 600, H = 240;
  const groupW = W / weeks.length; // ~46px
  const barW = Math.max(6, groupW * 0.35);
  const gap = 3;

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash flow — last 90 days
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Weekly buckets · INR</div>
        </div>
        <Link href="/ledger" className="text-[11px] font-medium text-primary hover:underline">
          Ledger →
        </Link>
      </header>
      {isEmpty ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No cash movement yet — record a payment or payout to see the trend.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full" preserveAspectRatio="none">
          <line x1="0" y1={H * 0.85} x2={W} y2={H * 0.85} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
          {weeks.map((w, i) => {
            const x0 = i * groupW + groupW * 0.15;
            const inH = (w.moneyIn / maxVal) * (H * 0.8);
            const outH = (w.moneyOut / maxVal) * (H * 0.8);
            return (
              <g key={w.weekStart}>
                <rect x={x0} y={H * 0.85 - inH} width={barW} height={inH} fill="#34d399" opacity="0.85" rx="1" />
                <rect x={x0 + barW + gap} y={H * 0.85 - outH} width={barW} height={outH} fill="#fb7185" opacity="0.85" rx="1" />
              </g>
            );
          })}
          <polyline
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2"
            points={weeks.map((w, i) => {
              const x = i * groupW + groupW / 2;
              const y = H * 0.85 - ((w.profit - minProfit) / profitRange) * (H * 0.7);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
          />
        </svg>
      )}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Money in</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Money out</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Profit</span>
        <span className="ml-auto">{legendRight}</span>
      </div>
    </section>
  );
}
