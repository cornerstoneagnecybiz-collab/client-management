// src/app/(dashboard)/dashboard/recent-activity.tsx
import Link from 'next/link';
import type { ActivityItem } from './_lib/types';
import { cn } from '@/lib/utils';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// Safe to call `Date.now()` at render time: this is a Server Component on a
// `force-dynamic` route, so there is no client-side hydration to mismatch with.
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</div>
        <Link href="/activity" className="text-[11px] font-medium text-primary hover:underline">Log →</Link>
      </header>
      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No activity yet.</p>
      ) : (
        <ul>
          {items.map((i) => {
            const isIn = i.type === 'client_payment';
            const isOut = i.type === 'vendor_payment';
            const sign = isIn ? '+' : isOut ? '−' : '';
            const dotClass = isIn ? 'bg-emerald-400' : isOut ? 'bg-rose-400' : 'bg-blue-400';
            const amountClass = isIn ? 'text-emerald-400' : isOut ? 'text-rose-400' : '';
            return (
              <li key={i.id} className="flex items-center gap-2.5 border-b border-border py-2 last:border-0 text-[12px]">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold capitalize">{i.type.replace(/_/g, ' ')}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{i.projectName} · {relativeTime(i.at)}</div>
                </div>
                <span className={cn('tabular-nums', amountClass)}>
                  {i.type === 'client_invoice' || i.type === 'vendor_expected_cost' ? '' : `${sign}${formatINR(i.amount)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
