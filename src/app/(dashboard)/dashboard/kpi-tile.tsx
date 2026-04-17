// src/app/(dashboard)/dashboard/kpi-tile.tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  deltaPct?: number | null;
  deltaSuffix?: string;
  sparkline?: number[];
  accentColor?: 'emerald' | 'violet' | 'default';
  contextLine?: string;
}

export function KpiTile({
  label, value, deltaPct, deltaSuffix = 'vs last month',
  sparkline, accentColor = 'default', contextLine,
}: Props) {
  const strokeColor =
    accentColor === 'emerald' ? '#34d399' :
    accentColor === 'violet' ? '#a78bfa' :
    '#8a93ab';

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-xl">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {deltaPct != null && (
        // ±0.5% dead-zone keeps noisy sub-1% deltas muted so the up/down
        // colors only fire on changes that actually matter to the operator.
        <div
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold',
            deltaPct > 0.5 && 'text-emerald-400',
            deltaPct < -0.5 && 'text-rose-400',
            Math.abs(deltaPct) <= 0.5 && 'text-muted-foreground',
          )}
        >
          {deltaPct > 0.5 ? <TrendingUp className="h-3 w-3" /> :
            deltaPct < -0.5 ? <TrendingDown className="h-3 w-3" /> :
            <Minus className="h-3 w-3" />}
          {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% {deltaSuffix}
        </div>
      )}
      {contextLine && <div className="mt-0.5 text-[11px] text-muted-foreground">{contextLine}</div>}
      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} stroke={strokeColor} />
      )}
    </div>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 120, h = 22;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="mt-1.5 h-[22px] w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts} />
    </svg>
  );
}
