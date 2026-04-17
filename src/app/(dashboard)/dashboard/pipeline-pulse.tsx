// src/app/(dashboard)/dashboard/pipeline-pulse.tsx
import Link from 'next/link';
import type { FunnelStage } from './_lib/types';
import { cn } from '@/lib/utils';

export function PipelinePulse({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count ?? 0));
  const bottleneck = stages.find((s) => s.isBottleneck);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline pulse
        </div>
        <span className="text-[11px] text-muted-foreground/70">{stages.length}-step flow</span>
      </header>
      <ul className="space-y-1">
        {stages.map((s) => {
          const pct = s.count == null ? 0 : (s.count / maxCount) * 100;
          return (
            <li key={s.step}>
              <Link
                href={s.href}
                className={cn(
                  'grid grid-cols-[92px_1fr_32px] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-muted/30',
                  s.isBottleneck && 'bg-amber-500/10',
                )}
              >
                <span className={cn(
                  'truncate font-medium',
                  s.isBottleneck ? 'text-amber-400' : 'text-muted-foreground',
                )}>
                  {s.step}. {s.label}
                </span>
                <span className="relative h-[12px] overflow-hidden rounded-sm bg-muted/30">
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-sm opacity-60',
                      s.isBottleneck ? 'bg-amber-400' : 'bg-primary',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className={cn(
                  'text-right font-semibold tabular-nums',
                  s.isBottleneck && 'text-amber-400',
                )}>
                  {s.count == null ? '—' : s.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {bottleneck && (
        <p className="mt-3 text-[11px] text-amber-400">
          Bottleneck at {bottleneck.label} — {bottleneck.count} items waiting.
        </p>
      )}
    </section>
  );
}
