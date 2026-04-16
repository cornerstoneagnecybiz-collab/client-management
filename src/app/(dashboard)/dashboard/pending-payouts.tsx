// src/app/(dashboard)/dashboard/pending-payouts.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PayItem } from './_lib/types';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function PendingPayouts({ items }: { items: PayItem[] }) {
  const total = items.reduce((s, i) => s + i.payout.amount, 0);
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending payouts</div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
          {formatINR(total)} / {items.length} vendor{items.length !== 1 ? 's' : ''}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">All caught up on payouts.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.payout.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
              <div>
                <div className="text-[13px] font-semibold">{item.vendorName}</div>
                <div className="text-[11px] text-muted-foreground">{item.projectName}</div>
              </div>
              <div className="font-semibold tabular-nums">{formatINR(item.payout.amount)}</div>
              <Link href="/settlement" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
                Pay <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
