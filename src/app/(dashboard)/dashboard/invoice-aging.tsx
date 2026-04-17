// src/app/(dashboard)/dashboard/invoice-aging.tsx
import Link from 'next/link';
import type { AgingBuckets } from './_lib/types';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function InvoiceAging({ aging }: { aging: AgingBuckets }) {
  if (aging.total === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <header className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice aging</div>
        </header>
        <p className="text-center text-sm text-muted-foreground py-8">No outstanding invoices.</p>
      </section>
    );
  }
  const total = aging.total || 1;
  const pct = (n: number) => (n / total) * 100;
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice aging</div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{formatINR(aging.total)} total</span>
      </header>
      <div className="flex h-[10px] overflow-hidden rounded-full">
        <div className="bg-emerald-400/70" style={{ width: `${pct(aging.current.amount)}%` }} />
        <div className="bg-amber-400/70"   style={{ width: `${pct(aging.stale.amount)}%` }} />
        <div className="bg-rose-400/70"    style={{ width: `${pct(aging.overdue.amount)}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-muted-foreground">
        <div>0–30d<br /><span className="tabular-nums text-foreground font-semibold">{formatINR(aging.current.amount)}</span> <span className="text-muted-foreground/70">({aging.current.count})</span></div>
        <div>31–60d<br /><span className="tabular-nums text-foreground font-semibold">{formatINR(aging.stale.amount)}</span> <span className="text-muted-foreground/70">({aging.stale.count})</span></div>
        <div>61+d<br /><span className="tabular-nums text-rose-400 font-semibold">{formatINR(aging.overdue.amount)}</span> <span className="text-muted-foreground/70">({aging.overdue.count})</span></div>
      </div>
      {aging.oldestOpen && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Oldest open:{' '}
          <span className="font-semibold text-foreground">
            {aging.oldestOpen.label} · {aging.oldestOpen.clientName}
          </span>{' '}
          · {aging.oldestOpen.daysOld} days ·{' '}
          <Link href="/billing" className="text-primary hover:underline">Nudge client</Link>
        </p>
      )}
    </section>
  );
}
