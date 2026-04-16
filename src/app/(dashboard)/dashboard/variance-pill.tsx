// src/app/(dashboard)/dashboard/variance-pill.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { VariancePortfolio } from './_lib/types';
import { cn } from '@/lib/utils';

export function VariancePill({ v }: { v: VariancePortfolio }) {
  if (v.variancePct == null) return null;
  return (
    <Link
      href="/reports"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40"
    >
      Portfolio variance{' '}
      <span className={cn('font-semibold tabular-nums', v.favourable ? 'text-emerald-400' : 'text-rose-400')}>
        {v.variancePct > 0 ? '+' : ''}{v.variancePct.toFixed(1)}%
      </span>
      <ArrowRight className="h-3 w-3 text-primary" />
    </Link>
  );
}
